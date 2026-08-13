'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Cloud, ShieldAlert, Save, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { logAdminAction } from '@/lib/audit';
import { useAuth } from '@/components/providers/AuthProvider';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { adminProfile } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['adminSystemSettings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;
      const settingsMap: Record<string, any> = {};
      data.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      return settingsMap;
    },
  });

  const [cloudEnabled, setCloudEnabled] = useState<boolean>(true);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean>(true);
  const [appName, setAppName] = useState<string>('Rafidain Finance');
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  // Populate initial values once settings load (must run as an effect, not
  // during render, or every render would re-trigger a state update loop).
  // These are one-time-per-load hydrations of editable draft state from the
  // query result, not a sync loop, so the cascading-render lint rule doesn't apply here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!settings) return;
    setCloudEnabled(settings.cloud_service_enabled ?? true);
    setRegistrationEnabled(settings.registration_enabled ?? true);
    if (settings.app_name) setAppName(settings.app_name);
    if (settings.app_version) setAppVersion(settings.app_version);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSystemSettings'] });
    },
  });

  const handleSaveAll = async () => {
    try {
      await updateSettingMutation.mutateAsync({ key: 'cloud_service_enabled', value: cloudEnabled });
      await updateSettingMutation.mutateAsync({ key: 'registration_enabled', value: registrationEnabled });
      await updateSettingMutation.mutateAsync({ key: 'app_name', value: appName });
      await updateSettingMutation.mutateAsync({ key: 'app_version', value: appVersion });

      if (adminProfile) {
        await logAdminAction(adminProfile.id, 'update_system_settings', null, {
          cloud_service_enabled: cloudEnabled,
          registration_enabled: registrationEnabled,
          app_name: appName,
          app_version: appVersion,
        });
      }

      toast.add({ title: 'تم حفظ إعدادات النظام بنجاح!', type: 'success' });
    } catch (err: any) {
      toast.add({ title: 'فشل حفظ الإعدادات', description: err.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">إعدادات النظام والخدمة السحابية</h1>
        <p className="text-sm text-muted-foreground mt-1">التحكم في عمل الخدمة السحابية والتسجيل والإعدادات العامة للتطبيق</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cloud Service Master Toggle */}
        <Card className="rounded-2xl border shadow-sm border-indigo-100 dark:border-indigo-950">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center">
                <Cloud size={24} />
              </div>
              <div>
                <CardTitle className="text-base font-bold">الخدمة السحابية (Cloud Service Control)</CardTitle>
                <CardDescription>إيقاف/تشغيل عملية المزامنة السحابية عالمياً لجميع مستخدمي التطبيق</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-16 rounded-xl" />
            ) : (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border">
                <div>
                  <Label htmlFor="cloud_mode" className="font-bold text-sm cursor-pointer block">حالة الخدمة السحابية</Label>
                  <span className="text-xs text-muted-foreground">
                    {cloudEnabled ? 'الخدمة تعمل وتتيح للمستخدمين المزامنة الفورية' : 'الخدمة متوقفة مؤقتاً وسيتلقى المستخدمون تنبيهاً'}
                  </span>
                </div>
                <Switch
                  id="cloud_mode"
                  checked={cloudEnabled}
                  onCheckedChange={setCloudEnabled}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Registration Toggle */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
                <ShieldAlert size={24} />
              </div>
              <div>
                <CardTitle className="text-base font-bold">إعدادات التسجيل وحسابات المستخدمين</CardTitle>
                <CardDescription>التحكم في السماح بتسجيل حسابات جديدة</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-16 rounded-xl" />
            ) : (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border">
                <div>
                  <Label htmlFor="reg_mode" className="font-bold text-sm cursor-pointer block">قبول تسجيل الحسابات الجديدة</Label>
                  <span className="text-xs text-muted-foreground">
                    {registrationEnabled ? 'متاح للمستخدمين إنشاء حسابات جديدة' : 'مغلق مؤقتاً'}
                  </span>
                </div>
                <Switch
                  id="reg_mode"
                  checked={registrationEnabled}
                  onCheckedChange={setRegistrationEnabled}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* App Info Settings */}
        <Card className="rounded-2xl border shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">معلومات التطبيق العامة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appName">اسم التطبيق الرئيسي</Label>
                <Input
                  id="appName"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appVersion">رقم الإصدار (App Version)</Label>
                <Input
                  id="appVersion"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              onClick={handleSaveAll}
              disabled={updateSettingMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md"
            >
              <Save className="ml-2 h-4 w-4" />
              {updateSettingMutation.isPending ? 'جاري حفظ التعديلات...' : 'حفظ كافة إعدادات النظام'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
