import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { db } from '../database/db';
import { DebtRepository } from '../database/repositories/DebtRepository';
import { supabase } from '../supabase/supabaseClient';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

let NotificationsModule: typeof import('expo-notifications') | null = null;

function getNotificationsModule() {
  if (NotificationsModule) return NotificationsModule;
  try {
    NotificationsModule = require('expo-notifications');
    if (!isExpoGo && NotificationsModule) {
      NotificationsModule.setNotificationHandler({
        // SDK 54+ : `shouldShowAlert` مهجور ولا يُظهر الإشعار والتطبيق مفتوح.
        // البديل المطلوب هو `shouldShowBanner` + `shouldShowList`.
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  } catch (e) {
    console.warn('[NotificationService] Could not load expo-notifications:', e);
  }
  return NotificationsModule;
}

export class NotificationService {
  /** آخر Push Token تم الحصول عليه، لتفادي طلبه من الشبكة في كل مرة */
  private static cachedPushToken: string | null = null;

  /**
   * إرجاع Push Token الحالي (يُطلب من Expo عند أول استدعاء فقط).
   * يُستخدم في شاشات لا تملك userId مثل طلب استعادة كلمة المرور.
   */
  static async getPushToken(): Promise<string | null> {
    if (this.cachedPushToken) return this.cachedPushToken;
    if (isExpoGo) return null;

    try {
      const Notifications = getNotificationsModule();
      if (!Notifications) return null;

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return null;

      const projectId =
        (Constants as any).easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return null;

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      this.cachedPushToken = tokenData?.data || null;
      return this.cachedPushToken;
    } catch (e: any) {
      console.warn('[NotificationService] getPushToken error:', e?.message);
      return null;
    }
  }

  /**
   * طلب الصلاحيات وإنشاء قنوات التنبيه في Android وتسجيل Push Token في السحابة
   */
  static async init(userId?: string): Promise<string | null> {
    try {
      if (isExpoGo) {
        console.log(
          '[NotificationService] Running in Expo Go. Remote Push Tokens are disabled by Expo SDK 53+. Use Development Build for Push Tokens.'
        );
        return null;
      }

      const Notifications = getNotificationsModule();
      if (!Notifications) return null;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'إشعارات الرافدين المالية',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
        });
      }

      if (!Device.isDevice) {
        console.log('[NotificationService] Must use physical device for Push Notifications');
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[NotificationService] Permission for notifications was denied');
        return null;
      }

      // projectId لا يُستنتج دائماً في بناء bare/release، لذلك نمرره صراحةً.
      const projectId =
        (Constants as any).easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.error(
          '[NotificationService] Missing EAS projectId (extra.eas.projectId in app.json) — cannot get an Expo push token.'
        );
        return null;
      }

      // Get Expo Push Token
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId }).catch(
        (e: any) => {
          // أشهر سبب هنا: Firebase غير مهيأ في البناء الأصلي
          // (google-services.json مفقود أو إضافة gradle غير مطبقة).
          console.error(
            '[NotificationService] Failed to get Expo push token:',
            e?.code,
            e?.message
          );
          return null;
        }
      );

      const pushToken = tokenData?.data || null;
      if (pushToken) this.cachedPushToken = pushToken;

      if (pushToken && userId) {
        await this.savePushTokenToCloud(userId, pushToken);
      } else if (!pushToken) {
        console.error('[NotificationService] No push token acquired — remote notifications will not arrive.');
      }

      return pushToken;
    } catch (error) {
      console.error('[NotificationService] init error:', error);
      return null;
    }
  }

  /**
   * حفظ Push Token في جدول المستخدم بسوبابيز لتمكين الإدمان من إرسال إشعارات خارجية
   */
  static async savePushTokenToCloud(userId: string, token: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      // supabase لا يرمي استثناءً عند الفشل، بل يرجّع { error } — لذلك نفحصه صراحةً،
      // وإلا فشل الحفظ (RLS مثلاً) يمر بصمت ويبقى المستخدم بلا push_token.
      const { data, error } = await supabase
        .from('users')
        .update({ push_token: token, updated_at: now })
        .eq('id', userId)
        .select('id');

      if (error) {
        console.error('[NotificationService] Save push token failed:', error.message);
        return;
      }
      if (!data || data.length === 0) {
        console.error(
          `[NotificationService] Push token not saved: no user row matched id=${userId} (check RLS update policy).`
        );
        return;
      }
      console.log('[NotificationService] Push token saved to cloud ✓');
    } catch (e) {
      console.warn('[NotificationService] Save push token error:', e);
    }
  }

  /**
   * إزالة Push Token من جدول المستخدم لإيقاف الإشعارات
   */
  static async removePushTokenFromCloud(userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('users')
        .update({ push_token: null, updated_at: now })
        .eq('id', userId);

      if (error) {
        console.error('[NotificationService] Remove push token failed:', error.message);
        return;
      }
      this.cachedPushToken = null;
      console.log('[NotificationService] Push token removed from cloud ✓');
    } catch (e) {
      console.warn('[NotificationService] Remove push token error:', e);
    }
  }

  /**
   * فحص الديون والأقساط المستحقة والعمل على برمجة إشعارات محليه فورية للإيعاز بالسداد
   */
  static async checkAndScheduleDueNotifications(storeId: string): Promise<void> {
    try {
      if (!storeId) return;

      const debts = DebtRepository.getAll(storeId);
      const todayStr = new Date().toISOString().substring(0, 10);

      const dueOrOverdue = debts.filter((d) => {
        const remaining = d.remaining_amount !== undefined
          ? d.remaining_amount
          : Math.max(0, (d.total_amount || 0) - (d.paid_amount || 0));

        if (remaining <= 0) return false;

        const isOverdueStatus = d.status === 'overdue';
        const isDueToday = d.due_date && d.due_date <= todayStr;

        return isOverdueStatus || isDueToday;
      });

      if (dueOrOverdue.length === 0) return;

      const Notifications = getNotificationsModule();

      // Cancel existing scheduled notifications if module is available
      if (Notifications && !isExpoGo) {
        await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
      }

      for (const debt of dueOrOverdue.slice(0, 5)) {
        const remainingFormatted = debt.remaining_amount.toLocaleString('ar-IQ');
        const isInstallment = debt.type === 'installment';
        const typeText = isInstallment ? 'قسط' : 'دين';
        const titleText = isInstallment
          ? `تنبيه قسط مستحق: ${debt.title}`
          : `تنبيه دين مستحق: ${debt.title}`;

        const bodyText = `العميل (${debt.customerName}) يجب أن يسدد ${typeText} بقيمة ${remainingFormatted} د.ع الان.`;

        // Trigger local notification if device notifications supported
        if (Notifications && !isExpoGo) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: titleText,
              body: bodyText,
              data: { debtId: debt.id, customerId: debt.customer_id },
              sound: true,
            },
            trigger: null,
          }).catch((e: any) => console.warn('[NotificationService] schedule error:', e));
        }

        // Also save to local notification history
        this.saveLocalNotification({
          title: titleText,
          body: bodyText,
          type: 'due_alert',
          payload: JSON.stringify({ debtId: debt.id }),
        });
      }
    } catch (error) {
      console.error('[NotificationService] checkAndScheduleDueNotifications error:', error);
    }
  }

  /**
   * حفظ إشعار في أرشيف الإشعارات المحلي
   */
  static saveLocalNotification(notif: {
    title: string;
    body: string;
    type?: string;
    payload?: string;
  }): void {
    try {
      const id = Date.now().toString();
      const now = new Date().toISOString();
      db.runSync(
        `INSERT INTO notifications (id, title, body, type, payload, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [id, notif.title, notif.body, notif.type || 'system', notif.payload || '', now]
      );
    } catch (e) {
      console.warn('[NotificationService] saveLocalNotification error:', e);
    }
  }

  /**
   * جلب الإشعارات الصادرة من الإدارة (Supabase system_notifications) وحفظها محلياً في أرشيف الإشعارات
   */
  static async fetchAndSyncSystemNotifications(userId: string): Promise<void> {
    try {
      if (!userId) return;

      let sysNotifs: any[] | null = null;

      const { data, error } = await supabase
        .from('system_notifications')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.warn('[NotificationService] fetch system notifications filter error, trying simple select:', error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('system_notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);
        if (fallbackError) {
          console.warn('[NotificationService] fallback fetch error:', fallbackError.message);
        }
        sysNotifs = fallbackData;
      } else {
        sysNotifs = data;
      }

      if (sysNotifs && sysNotifs.length > 0) {
        for (const sn of sysNotifs) {
          const payloadStr = JSON.stringify({ supabaseId: sn.id });
          const existing = db.getFirstSync(
            `SELECT id FROM notifications WHERE id = ? OR payload = ?`,
            [sn.id, payloadStr]
          );

          if (!existing) {
            db.runSync(
              `INSERT INTO notifications (id, title, body, type, payload, is_read, created_at)
               VALUES (?, ?, ?, 'system', ?, 0, ?)`,
              [sn.id, sn.title, sn.body, payloadStr, sn.created_at || new Date().toISOString()]
            );
          }
        }
      }
    } catch (e) {
      console.warn('[NotificationService] fetchAndSyncSystemNotifications error:', e);
    }
  }

  /**
   * جلب أرشيف الإشعارات من SQLite المحلي
   */
  static getLocalNotifications(): any[] {
    try {
      return db.getAllSync(
        `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50`
      );
    } catch (e) {
      return [];
    }
  }

  /**
   * تعليم الإشعارات كمقروءة
   */
  static markAllAsRead(): void {
    try {
      db.runSync(`UPDATE notifications SET is_read = 1`);
    } catch (e) {}
  }

  /**
   * حساب عدد الإشعارات غير المقروءة
   */
  static getUnreadCount(): number {
    try {
      const res = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM notifications WHERE is_read = 0`
      );
      return res?.count || 0;
    } catch (e) {
      return 0;
    }
  }
}
