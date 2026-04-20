import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { NativeSelect, NativeSelectOption } from './ui/native-select';
import { toast } from 'sonner';
import { Plus, Minus, Users as UsersIcon } from 'lucide-react';

const submissionSchema = z.object({
  guestNames: z.array(z.object({
    name: z.string().min(2, 'Nama tamu terlalu pendek')
  })).min(1, 'Minimal 1 tamu'),
  company: z.string().min(2, 'Nama instansi wajib diisi'),
  checkInDate: z.string().min(1, 'Tanggal check-in wajib diisi'),
  checkOutDate: z.string().min(1, 'Tanggal check-out wajib diisi'),
  guestCount: z.number().min(1, 'Minimal 1 tamu'),
  purpose: z.string().min(5, 'Mohon berikan alasan kunjungan yang jelas'),
  roomType: z.string().min(1, 'Pilih tipe kamar'),
  assignmentLetter: z.any().optional(),
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

export default function SubmissionForm() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { register, control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      guestCount: 1,
      guestNames: [{ name: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "guestNames"
  });

  // Automatically sync guestCount with the number of guest names
  React.useEffect(() => {
    setValue('guestCount', fields.length, { shouldValidate: true });
  }, [fields.length, setValue]);

  const onSubmit = async (data: SubmissionFormData) => {
    if (!profile) return;

    try {
      let assignmentLetterUrl = '';
      
      // Upload file if exists
      if (data.assignmentLetter && data.assignmentLetter.length > 0) {
        if (!storage) {
          toast.error('Gagal mengunggah surat tugas: Layanan Storage tidak aktif. Silakan hubungi admin atau lewati upload (jika opsional).');
          return;
        }
        const file = data.assignmentLetter[0];
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Ukuran file terlalu besar. Maksimal 5MB.');
          return;
        }
        
        const metadata = {
          contentType: file.type || 'application/octet-stream'
        };

        const storageRef = ref(storage, `assignment_letters/${profile.uid}/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file, metadata);
        assignmentLetterUrl = await getDownloadURL(uploadResult.ref);
      }

      const promises = data.guestNames.map(guest => {
        const { guestNames, assignmentLetter, ...rest } = data;
        return addDoc(collection(db, 'submissions'), {
          ...rest,
          guestName: guest.name,
          userUid: profile.uid,
          status: 'pending',
          createdAt: new Date().toISOString(),
          statementAccepted: false,
          guestCount: 1, // Each entry is for 1 person
          roomType: data.roomType,
          assignmentLetterUrl,
        });
      });

      await Promise.all(promises);
      toast.success(`${data.guestNames.length} pengajuan berhasil dikirim!`);
      navigate('/submissions');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'submissions');
      toast.error('Gagal mengirim pengajuan');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Form Pengajuan Tamu</h2>
        <p className="text-slate-500 text-sm mt-1 font-medium">Lengkapi data di bawah ini untuk mengajukan izin menginap tamu</p>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="px-8 py-6 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-800">Informasi Tamu & Kunjungan</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Nama Tamu</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1.5 text-xs font-bold border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                  onClick={() => append({ name: '' })}
                >
                  <Plus size={14} />
                  Tambah Tamu
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="relative group">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input 
                          {...register(`guestNames.${index}.name` as const)} 
                          placeholder={`Nama tamu ${index + 1}`} 
                          className="h-11 border-slate-200 focus:ring-primary/20 pr-10"
                        />
                      </div>
                      {fields.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-11 w-11 text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0"
                          onClick={() => remove(index)}
                        >
                          <Minus size={16} />
                        </Button>
                      )}
                    </div>
                    {errors.guestNames?.[index]?.name && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">
                        {errors.guestNames[index]?.name?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company" className="text-xs font-bold uppercase tracking-wider text-slate-500">Instansi / Perusahaan</Label>
                <Input 
                  id="company"
                  {...register('company')} 
                  placeholder="Nama perusahaan/instansi" 
                  className="h-11 border-slate-200 focus:ring-primary/20"
                />
                {errors.company && <p className="text-xs font-bold text-red-500 mt-1">{errors.company.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestCount" className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Tamu (Otomatis)</Label>
                <div className="relative">
                  <Input 
                    id="guestCount"
                    type="number" 
                    {...register('guestCount', { valueAsNumber: true })} 
                    className="h-11 border-slate-200 bg-slate-50/50 font-bold text-slate-600"
                    readOnly
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <UsersIcon size={16} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkInDate" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Check-in</Label>
                <Input 
                  id="checkInDate"
                  type="date" 
                  {...register('checkInDate')} 
                  className="h-11 border-slate-200 focus:ring-primary/20"
                />
                {errors.checkInDate && <p className="text-xs font-bold text-red-500 mt-1">{errors.checkInDate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkOutDate" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Check-out</Label>
                <Input 
                  id="checkOutDate"
                  type="date" 
                  {...register('checkOutDate')} 
                  className="h-11 border-slate-200 focus:ring-primary/20"
                />
                {errors.checkOutDate && <p className="text-xs font-bold text-red-500 mt-1">{errors.checkOutDate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomType" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipe Kamar</Label>
                <NativeSelect 
                  id="roomType"
                  {...register('roomType')}
                  className="h-11 w-full border-slate-200 focus:ring-primary/20"
                >
                  <NativeSelectOption value="">Pilih Tipe Kamar</NativeSelectOption>
                  <NativeSelectOption value="Kamar Single (1 Orang)">Kamar Single (1 Orang)</NativeSelectOption>
                  <NativeSelectOption value="Double (2 Orang)">Double (2 Orang)</NativeSelectOption>
                  <NativeSelectOption value="Family (4 Orang)">Family (4 Orang)</NativeSelectOption>
                </NativeSelect>
                {errors.roomType && <p className="text-xs font-bold text-red-500 mt-1">{errors.roomType.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignmentLetter" className="text-xs font-bold uppercase tracking-wider text-slate-500">Upload Surat Tugas</Label>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <input
                      id="assignmentLetter"
                      type="file"
                      {...register('assignmentLetter')}
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-11 justify-start gap-2 border-dashed border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all"
                      onClick={() => document.getElementById('assignmentLetter')?.click()}
                    >
                      <Plus size={16} />
                      <span className="text-xs font-semibold text-slate-500 truncate">
                        {watch('assignmentLetter')?.[0]?.name || 'Pilih File Surat Tugas (PDF/JPG)'}
                      </span>
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium italic">Format yang didukung: PDF, Image (Maks 5MB)</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose" className="text-xs font-bold uppercase tracking-wider text-slate-500">Keperluan Kunjungan</Label>
              <Textarea 
                id="purpose"
                {...register('purpose')} 
                placeholder="Jelaskan tujuan kunjungan tamu..." 
                className="min-h-[120px] border-slate-200 focus:ring-primary/20 resize-none"
              />
              {errors.purpose && <p className="text-xs font-bold text-red-500 mt-1">{errors.purpose.message}</p>}
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                className="h-11 px-6 font-bold text-slate-500"
                onClick={() => navigate('/')}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="h-11 px-10 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold"
              >
                {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
