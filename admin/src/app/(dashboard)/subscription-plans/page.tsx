'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { SlidersHorizontal, Plus, Edit3, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SubscriptionPlansPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    tier_key: '',
    price: 5000,
    duration_days: 30,
    is_active: true,
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['adminSubscriptionPlans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update({
            name: payload.name,
            price: payload.price,
            duration_days: payload.duration_days,
            is_active: payload.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptionPlans'] });
      setIsDialogOpen(false);
      setEditingPlan(null);
      setFormData({ name: '', tier_key: '', price: 5000, duration_days: 30, is_active: true });
    },
  });

  const handleEditClick = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      tier_key: plan.tier_key,
      price: plan.price,
      duration_days: plan.duration_days,
      is_active: plan.is_active,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة خطط وأسعار الاشتراك الديناميكية</h1>
          <p className="text-sm text-muted-foreground mt-1">إضافة وتعديل خطط الأسعار السحابية دون الحاجة لتحديث كود التطبيق (Hardcoded)</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingPlan(null); }}>
          <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md"><Plus className="ml-1.5 h-4 w-4" /> إضافة خطة جديدة</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'تعديل خطة الاشتراك' : 'إنشاء خطة اشتراك جديدة'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); savePlanMutation.mutate(formData); }} className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الباقة (مثلاً: الباقة السنوية السحابية)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>

              {!editingPlan && (
                <div className="space-y-2">
                  <Label htmlFor="tier_key">معرف الباقة الفريد (e.g. cloud_yearly)</Label>
                  <Input
                    id="tier_key"
                    value={formData.tier_key}
                    onChange={(e) => setFormData({ ...formData, tier_key: e.target.value.toLowerCase().trim() })}
                    className="rounded-xl font-mono"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">السعر (دينار عراقي)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">المدة (أيام)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 0 })}
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl">
                <Label htmlFor="is_active" className="cursor-pointer">حالة الباقة (تظهر بالهاتف)</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={savePlanMutation.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
                  {savePlanMutation.isPending ? 'جاري الحفظ...' : 'حفظ الخطة'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))
        ) : plans?.length === 0 ? (
          <p className="col-span-3 text-center text-muted-foreground py-8">لا يوجد خطط اشتراك مسجلة.</p>
        ) : (
          plans?.map((plan: any) => (
            <Card key={plan.id} className="rounded-2xl border shadow-sm flex flex-col justify-between">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold">{plan.name}</CardTitle>
                    <CardDescription className="font-mono text-xs mt-0.5">{plan.tier_key}</CardDescription>
                  </div>
                  <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                    {plan.is_active ? 'مفعلة' : 'موقوفة'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {plan.price.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">د.ع</span>
                </div>
                <p className="text-xs text-muted-foreground font-semibold">
                  المدة: {plan.duration_days} يوم
                </p>
              </CardContent>
              <CardFooter className="pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => handleEditClick(plan)} className="w-full rounded-xl text-xs">
                  <Edit3 className="ml-1.5 h-4 w-4 text-indigo-600" /> تعديل تفاصيل الباقة
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
