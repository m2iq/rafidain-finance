import { NextResponse } from 'next/server';

// يجب أن يعمل على الخادم: خدمة Expo لا ترسل ترويسات CORS،
// لذلك الاستدعاء المباشر من المتصفح يُحجب دائماً.
export const runtime = 'nodejs';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // الحد الأقصى لعدد الرسائل في الطلب الواحد لدى Expo

interface SendPushBody {
  tokens?: unknown;
  title?: unknown;
  body?: unknown;
  data?: unknown;
}

export async function POST(request: Request) {
  let payload: SendPushBody;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة' }, { status: 400 });
  }

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';

  if (!title || !body) {
    return NextResponse.json({ error: 'العنوان ونص الرسالة مطلوبان' }, { status: 400 });
  }

  const tokens = Array.isArray(payload.tokens)
    ? payload.tokens.filter(
        (t): t is string => typeof t === 'string' && t.startsWith('ExponentPushToken')
      )
    : [];

  if (tokens.length === 0) {
    return NextResponse.json({
      sent: 0,
      attempted: 0,
      errors: ['لا يوجد أي جهاز يملك Push Token صالح'],
    });
  }

  let sent = 0;
  const errors: string[] = [];
  const invalidTokens: string[] = [];

  for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + CHUNK_SIZE);
    const messages = chunk.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: payload.data || null,
      priority: 'high',
      channelId: 'default', // يطابق القناة المُنشأة في التطبيق
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const text = await res.text();

      if (!res.ok) {
        errors.push(`Expo رد بحالة ${res.status}: ${text.slice(0, 200)}`);
        continue;
      }

      const result = JSON.parse(text);
      const tickets: any[] = Array.isArray(result?.data) ? result.data : [];

      tickets.forEach((ticket, idx) => {
        if (ticket?.status === 'ok') {
          sent++;
          return;
        }
        if (ticket?.details?.error === 'DeviceNotRegistered') {
          invalidTokens.push(chunk[idx]);
        }
        if (ticket?.message) errors.push(ticket.message);
      });

      if (Array.isArray(result?.errors)) {
        for (const e of result.errors) errors.push(e?.message || String(e));
      }
    } catch (err: any) {
      errors.push(err?.message || 'تعذر الاتصال بخدمة Expo');
    }
  }

  return NextResponse.json({
    sent,
    attempted: tokens.length,
    invalidTokens,
    errors: [...new Set(errors)].slice(0, 5),
  });
}
