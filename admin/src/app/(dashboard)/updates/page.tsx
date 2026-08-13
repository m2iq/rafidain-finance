'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { Smartphone, Upload, Plus, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AppUpdate {
  id: string;
  version: string;
  version_code: number;
  release_notes: string;
  download_url: string;
  is_mandatory: boolean;
  created_at: string;
}

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [version, setVersion] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_updates')
      .select('*')
      .order('version_code', { ascending: false });

    if (error) {
      if (error.code !== '42P01') { // Ignore table not found initially
        toast.add({ title: 'خطأ', description: 'فشل في جلب التحديثات.', type: 'error' });
      }
    } else {
      setUpdates(data || []);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version || !versionCode) {
      toast.add({ title: 'خطأ', description: 'يرجى تعبئة الحقول الأساسية', type: 'error' });
      return;
    }
    
    if (uploadType === 'file' && !file) {
      toast.add({ title: 'خطأ', description: 'يرجى إرفاق ملف التحديث', type: 'error' });
      return;
    }
    
    if (uploadType === 'url' && !externalUrl) {
      toast.add({ title: 'خطأ', description: 'يرجى إدخال رابط التحميل المباشر', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      let downloadUrl = externalUrl;

      if (uploadType === 'file' && file) {
        // 1. Upload File to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `RafidainFinance_v${version}_${versionCode}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('releases')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(`Storage Error: ${uploadError.message}. (هل تأكدت من إنشاء Storage Bucket باسم 'releases'؟)`);
      }

        // 2. Get Public URL
        const { data: publicUrlData } = supabase.storage
          .from('releases')
          .getPublicUrl(filePath);

        downloadUrl = publicUrlData.publicUrl;
      }

      // 3. Insert into Database
      const { error: insertError } = await supabase
        .from('app_updates')
        .insert({
          version,
          version_code: parseInt(versionCode),
          release_notes: releaseNotes,
          is_mandatory: isMandatory,
          download_url: downloadUrl,
        });

      if (insertError) throw insertError;

      toast.add({ title: 'نجاح', description: 'تم نشر التحديث الجديد بنجاح', type: 'success' });
      
      // Reset form
      setVersion('');
      setVersionCode('');
      setReleaseNotes('');
      setIsMandatory(false);
      setFile(null);
      setExternalUrl('');
      setShowAddForm(false);
      
      fetchUpdates();
    } catch (error: any) {
      console.error(error);
      toast.add({ title: 'خطأ', description: error.message || 'حدث خطأ غير متوقع', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التحديث؟')) return;
    const { error } = await supabase.from('app_updates').delete().eq('id', id);
    if (error) {
      toast.add({ title: 'خطأ', description: 'فشل الحذف', type: 'error' });
    } else {
      toast.add({ title: 'نجاح', description: 'تم حذف التحديث', type: 'success' });
      fetchUpdates();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Smartphone className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            إدارة التحديثات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            إدارة إصدارات التطبيق وإرسال التحديثات للمستخدمين
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة تحديث جديد
          </Button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">نشر إصدار جديد</h2>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>إلغاء</Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">رقم الإصدار (Version Name)</Label>
                <Input
                  id="version"
                  placeholder="مثال: 1.1.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="versionCode">كود الإصدار (Version Code)</Label>
                <Input
                  id="versionCode"
                  type="number"
                  placeholder="مثال: 2 (رقم صحيح تصاعدي)"
                  value={versionCode}
                  onChange={(e) => setVersionCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseNotes">ملاحظات التحديث (ما الجديد؟)</Label>
              <Textarea
                id="releaseNotes"
                placeholder="أضف وصفاً للتغييرات في هذا التحديث..."
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-4">
              <Label>طريقة رفع التطبيق (APK)</Label>
              <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setUploadType('file')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${uploadType === 'file' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}
                >
                  رفع ملف (Supabase)
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType('url')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${uploadType === 'url' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}
                >
                  رابط خارجي مباشر
                </button>
              </div>

              {uploadType === 'file' ? (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800/50">
                  <input
                    type="file"
                    accept=".apk"
                    onChange={handleFileChange}
                    className="hidden"
                    id="apk-upload"
                  />
                  <Label htmlFor="apk-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {file ? file.name : 'اضغط لاختيار ملف الـ APK'}
                    </span>
                  </Label>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="url"
                    placeholder="https://example.com/app.apk"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    dir="ltr"
                    className="text-left"
                  />
                  <p className="text-xs text-gray-500">
                    أدخل الرابط المباشر للملف من أي خدمة استضافة خارجية (Drive، ميديافاير رابط مباشر، إلخ..)
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 space-x-reverse pt-2">
              <Switch
                id="mandatory"
                checked={isMandatory}
                onCheckedChange={setIsMandatory}
              />
              <Label htmlFor="mandatory" className="font-medium cursor-pointer">
                تحديث إجباري (يمنع المستخدم من الدخول حتى يُحدّث)
              </Label>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                {isSubmitting ? 'جاري الرفع والنشر...' : 'نشر التحديث'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Updates List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">سجل التحديثات</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
        ) : updates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            لا توجد تحديثات سابقة. (تأكد من تطبيق كود SQL في Supabase أولاً)
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {updates.map((update, idx) => (
              <div key={update.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      إصدار {update.version}
                    </h4>
                    {idx === 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center gap-1 border border-green-200">
                        <CheckCircle2 className="w-3 h-3" />
                        الأحدث
                      </span>
                    )}
                    {update.is_mandatory && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold border border-red-200">
                        إجباري
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div>كود الإصدار: <span className="font-mono">{update.version_code}</span></div>
                    <div>
                      تاريخ النشر: {format(new Date(update.created_at), 'PPP', { locale: ar })}
                    </div>
                  </div>

                  {update.release_notes && (
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-slate-700">
                      {update.release_notes}
                    </div>
                  )}
                </div>

                <div className="flex flex-row md:flex-col items-center justify-end gap-3 shrink-0">
                  <Button variant="outline" className="w-full gap-2" onClick={() => window.open(update.download_url, '_blank')}>
                    <Download className="w-4 h-4" />
                    تحميل APK
                  </Button>
                  <Button variant="destructive" className="w-full gap-2" onClick={() => handleDelete(update.id)}>
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
