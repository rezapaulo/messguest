import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Submission } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { 
  ClipboardCheck, 
  User, 
  Building, 
  Calendar, 
  ShieldCheck, 
  FileText,
  ArrowLeft,
  CheckCircle2,
  LogIn,
  Clock,
  Info,
  X,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const getIndonesianDay = (dateStr: string) => {
  if (!dateStr) return '';
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date(dateStr).getDay()];
};

export default function GuestStatementForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isPosterZoomed, setIsPosterZoomed] = useState(false);

  useEffect(() => {
    const fetchSubmission = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'submissions', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSubmission({ id: docSnap.id, ...docSnap.data() } as Submission);
        } else {
          toast.error('Data tidak ditemukan');
          navigate('/guest-statement');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `submissions/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [id, navigate]);

  const handleSubmit = async () => {
    if (!id || !accepted) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'submissions', id), {
        statementAccepted: true,
        statementAcceptedAt: new Date().toISOString()
      });
      toast.success('Pernyataan berhasil disetujui! Selamat beristirahat.');
      setTimeout(() => navigate('/guest-statement'), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${id}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-400">Memuat data...</div>;
  if (!submission) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-primary/10">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-xl p-2 shadow-lg shadow-primary/20">
            <ClipboardCheck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none tracking-tight">Mess Stay</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sistem Tamu Mess</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/login')}
            className="text-slate-500 hover:text-primary hover:bg-primary/5 gap-2 font-bold text-xs"
          >
            <LogIn size={16} />
            Halaman Login
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/guest-statement')}
            className="text-slate-500 hover:text-primary hover:bg-primary/5 gap-2 font-bold text-xs"
          >
            <ArrowLeft size={16} />
            Kembali
          </Button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Page Title Section with Badge */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black uppercase tracking-wider border border-emerald-100 shadow-sm mx-auto">
              <ShieldCheck size={14} className="fill-emerald-600/10" />
              IDENTITAS TERVERIFIKASI
            </div>
            <h2 className="text-4xl font-black text-[#1E293B] tracking-tight">Formulir Pernyataan Tamu</h2>
            <p className="text-[#64748B] font-medium max-w-2xl mx-auto text-lg leading-relaxed">
              Silakan tinjau data kunjungan Anda dan setujui pernyataan di bawah ini untuk menyelesaikan proses check-in.
            </p>
          </div>

          {/* User Data Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border border-slate-200/60 shadow-lg shadow-slate-200/50 rounded-[24px] bg-white overflow-hidden transition-all hover:shadow-xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                  <User size={28} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">NAMA TAMU</p>
                  <p className="text-base font-black text-slate-800 truncate">
                    {submission.guestName || (Array.isArray(submission.guestNames) 
                      ? (submission.guestNames[0] as any)?.name || submission.guestNames[0]
                      : 'N/A')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 shadow-lg shadow-slate-200/50 rounded-[24px] bg-white overflow-hidden transition-all hover:shadow-xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                  <Building size={28} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">INSTANSI</p>
                  <p className="text-base font-black text-slate-800 truncate">
                    {submission.company || 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 shadow-lg shadow-slate-200/50 rounded-[24px] bg-white overflow-hidden transition-all hover:shadow-xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                  <Calendar size={28} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">CHECK-IN</p>
                  <p className="text-base font-black text-slate-800 leading-tight">
                    {new Date(submission.checkInDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">{getIndonesianDay(submission.checkInDate)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 shadow-lg shadow-slate-200/50 rounded-[24px] bg-white overflow-hidden transition-all hover:shadow-xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                  <Calendar size={28} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">CHECK-OUT</p>
                  <p className="text-base font-black text-slate-800 leading-tight">
                    {new Date(submission.checkOutDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">{getIndonesianDay(submission.checkOutDate)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 shadow-lg shadow-slate-200/50 rounded-[24px] bg-white overflow-hidden transition-all hover:shadow-xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                  <Clock size={28} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">ESTIMASI<br/>DATANG</p>
                  <p className="text-base font-black text-slate-800">
                    {submission.estimatedArrivalTime || '-'}
                  </p>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">WITA</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Form Section (Left Column) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-slate-200/60 shadow-2xl shadow-slate-200/40 rounded-[32px] overflow-hidden bg-white">
                <CardContent className="p-10 space-y-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner">
                      <FileText size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Surat Pernyataan & Tata Tertib</h3>
                  </div>

                  <div className="flex gap-4 p-5 bg-[#EFF6FF] border border-blue-100 rounded-2xl items-center">
                    <div className="p-1 bg-blue-500 rounded-full text-white shrink-0">
                      <Info size={14} />
                    </div>
                    <p className="text-[15px] font-bold text-slate-600">
                      Dengan menandatangani/menyetujui formulir ini, saya menyatakan bahwa:
                    </p>
                  </div>

                  <div className="space-y-5 px-1">
                    {[
                      'Saya akan mematuhi seluruh peraturan dan tata tertib yang berlaku di Mess PT Putra Perkasa Abadi.',
                      'Saya bertanggung jawab penuh atas segala kerusakan fasilitas yang disebabkan oleh kelalaian saya.',
                      'Saya tidak akan membawa barang-barang terlarang (narkoba, senjata tajam, dll) ke dalam lingkungan mess.',
                      'Saya bersedia meninggalkan mess sesuai dengan tanggal check-out yang telah ditentukan.',
                      'Seluruh data yang saya berikan adalah benar dan dapat dipertanggungjawabkan.'
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4 items-center">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                          <CheckCircle2 size={16} />
                        </div>
                        <span className="text-[15px] font-bold text-slate-500">{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Agreement Checkbox Box */}
                  <div className="p-8 bg-[#FFF5F5] border-2 border-[#FFE4E4] rounded-[24px] space-y-3">
                    <div className="flex items-start gap-4">
                      <Checkbox 
                        id="terms" 
                        checked={accepted} 
                        onCheckedChange={(checked) => setAccepted(checked as boolean)}
                        className="mt-1 w-6 h-6 border-rose-200 data-[state=checked]:bg-[#F05252] data-[state=checked]:border-[#F05252] rounded-md transition-all"
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="terms"
                          className="text-lg font-black text-slate-800 leading-none cursor-pointer"
                        >
                          Saya menyetujui seluruh syarat dan ketentuan di atas.
                        </Label>
                        <p className="text-sm text-slate-500 font-bold">
                          Persetujuan ini setara dengan tanda tangan basah dan memiliki kekuatan hukum yang sah.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate('/guest-statement')}
                      className="sm:col-span-1 h-16 rounded-[20px] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-500 font-black text-lg"
                    >
                      Batal
                    </Button>
                    <Button 
                      disabled={!accepted || submitting}
                      onClick={handleSubmit}
                      className="sm:col-span-3 h-16 bg-[#F05252] hover:bg-[#E04242] text-white font-black text-xl rounded-[20px] shadow-xl shadow-rose-200 gap-3"
                    >
                      <CheckCircle2 size={24} />
                      {submitting ? 'Memproses...' : 'Setujui & Selesaikan'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Poster Section (Right Column) */}
            <div className="lg:col-span-1">
              <Card className="border border-slate-200/60 shadow-2xl shadow-slate-200/40 rounded-[32px] overflow-hidden bg-white h-fit sticky top-28">
                <CardContent className="p-4">
                  <div 
                    className="rounded-[24px] overflow-hidden bg-slate-100 border border-slate-200 shadow-inner cursor-zoom-in relative group"
                    onClick={() => setIsPosterZoomed(true)}
                  >
                    <img 
                      src="https://lh3.googleusercontent.com/u/0/d/10Bt5GZs1cycos0ytGG1Es_ctNPFO08_f" 
                      alt="Tata Tertib Mess PPA"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-white/90 p-3 rounded-full shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                        <Maximize2 className="text-slate-800" size={24} />
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 pb-2 text-center">
                    <div className="inline-block px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 mb-4">
                       <p className="text-[11px] font-black uppercase tracking-widest leading-none">Garis Panduan Utama</p>
                    </div>
                    <h4 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-2">Utamakan Keselamatan & Ketertiban</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">PT Putra Perkasa Abadi</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="py-12 text-center opacity-40">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          © 2026 PT Putra Perkasa Abadi. Semua hak dilindungi.
        </p>
      </footer>

      {/* Enlarged Image Portal */}
      <AnimatePresence>
        {isPosterZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 cursor-zoom-out"
            onClick={() => setIsPosterZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-5xl w-full max-h-full overflow-hidden rounded-3xl shadow-2xl bg-white flex items-center justify-center p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 text-white rounded-full h-10 w-10"
                onClick={() => setIsPosterZoomed(false)}
              >
                <X size={20} />
              </Button>
              <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
                <img 
                  src="https://lh3.googleusercontent.com/u/0/d/10Bt5GZs1cycos0ytGG1Es_ctNPFO08_f" 
                  alt="Tata Tertib Mess PPA"
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[85vh] w-auto h-auto rounded-xl object-contain shadow-2xl"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
