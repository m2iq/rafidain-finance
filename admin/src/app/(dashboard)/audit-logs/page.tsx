'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['adminAuditLogsList', page],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await supabase
        .from('admin_audit_logs')
        .select(`
          *,
          admins (name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { logs: data, count };
    },
  });

  const totalPages = data?.count ? Math.ceil(data.count / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">سجل حركات وتغييرات الإدارة (Audit Logs)</h1>
        <p className="text-sm text-muted-foreground mt-1">تسجيل وتتبع كافة العمليات والإجراءات المنفذة داخل لوحة التحكم لضمان الحماية والشفافية</p>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" /> سجل الأحداث الإدارية
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>التاريخ والوقت</TableHead>
                <TableHead>الأدمن المنفذ</TableHead>
                <TableHead>نوع العملية</TableHead>
                <TableHead>المستخدم المتأثر</TableHead>
                <TableHead>التفاصيل والإحصاء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                  </TableRow>
                ))
              ) : data?.logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    لا يوجد حركات إدارية مسجلة بعد.
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ar-IQ')}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{log.admins?.name || 'غير معروف'}</div>
                      <div className="text-[10px] text-muted-foreground">{log.admins?.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {log.target_user_id || 'عام'}
                    </TableCell>
                    <TableCell className="text-xs font-mono max-w-[250px] truncate" title={JSON.stringify(log.details)}>
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-xs text-muted-foreground">
              عرض {(page - 1) * pageSize + 1} إلى {Math.min(page * pageSize, data?.count || 0)} من إجمالي {data?.count || 0} حركة مسجلة
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="rounded-lg text-xs"
              >
                السابق
              </Button>
              <span className="text-xs font-bold px-2">صفحة {page} من {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                className="rounded-lg text-xs"
              >
                التالي
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
