import { Users, CreditCard, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">لوحة التحكم السحابية</h1>
          <p className="text-slate-500 mt-2">إدارة متكاملة لبيانات متجرك المزامنة في الوقت الفعلي.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="العملاء" value="24" icon={Users} color="text-indigo-600" bg="bg-indigo-100" />
        <StatCard title="إجمالي الديون" value="$12,500" icon={CreditCard} color="text-emerald-600" bg="bg-emerald-100" />
        <StatCard title="الدفعات المستلمة" value="$4,200" icon={TrendingUp} color="text-amber-600" bg="bg-amber-100" />
        <StatCard title="أقساط متأخرة" value="3" icon={Clock} color="text-rose-600" bg="bg-rose-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>العمليات الأخيرة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                        ع
                      </div>
                      <div>
                        <p className="font-semibold">عميل رقم {i}</p>
                        <p className="text-sm text-slate-500">منذ {i} ساعة</p>
                      </div>
                    </div>
                    <div className="font-bold text-emerald-600">+$200</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>حالة النظام</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">المزامنة (Realtime)</span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">نشط</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">باقة الاشتراك</span>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">Cloud Monthly</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className={color} size={24} />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
