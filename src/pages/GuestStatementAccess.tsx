import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType, refreshFirebaseConnection } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Submission } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { 
  User, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Info, 
  HelpCircle, 
  MessageCircle,
  ClipboardCheck,
  ArrowRight,
  Lock,
  LogIn,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';

export default function GuestStatementAccess() {
  const navigate = useNavigate();
  const [guestName, setGuestName] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const handleRefreshConnection = async () => {
    setLoading(true);
    const success = await refreshFirebaseConnection();
    if (success) {
      toast.success('Koneksi sistem berhasil disegarkan!');
      setIsOffline(false);
    } else {
      toast.error('Gagal menyegarkan koneksi. Mohon muat ulang halaman (F5).');
    }
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !checkInDate) {
      toast.error('Mohon masukkan nama dan tanggal check-in Anda');
      return;
    }

    setLoading(true);
    try {
      const submissionsRef = collection(db, 'submissions');

      // SERVER-SIDE FILTERED SCAN: Hanya ambil data untuk tanggal yang dipilih (Lebih efisien & stabil)
      let snapshot;
      try {
        const q = query(submissionsRef, where('checkInDate', '==', checkInDate));
        snapshot = await getDocs(q);
      } catch (innerError: any) {
        try {
          snapshot = await getDocs(submissionsRef);
        } catch (broadError) {
          throw broadError;
        }
      }
      
      setIsOffline(false);

      if (snapshot.empty) {
        toast.error('Belum ada data pengajuan tamu dalam sistem.');
        setLoading(false);
        return;
      }

      const allSubmissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      const cleanInput = guestName.trim().toLowerCase();

      // CARI DENGAN LOGIKA SUPER FLEKSIBEL (Nama + Tanggal)
      const matched = allSubmissions.filter(sub => {
        // Nama Tamu
        const dbName = (sub.guestName || '').toString().toLowerCase();
        // Instansi
        const dbCompany = (sub.company || '').toString().toLowerCase();
        // Tanggal (YYYY-MM-DD vs YYYY-MM-DD)
        const dateMatch = sub.checkInDate === checkInDate;
        
        // Cek Nama (termasuk partial match)
        const nameMatch = dbName.includes(cleanInput) || cleanInput.includes(dbName);
        // Cek Instansi
        const companyMatch = dbCompany.includes(cleanInput) || cleanInput.includes(dbCompany);
        
        // Cek di array guestNames jika ada
        let arrayMatch = false;
        if (Array.isArray(sub.guestNames)) {
          arrayMatch = sub.guestNames.some(g => {
            const n = (typeof g === 'string' ? g : (g as any).name || '').toString().toLowerCase();
            return n.includes(cleanInput) || cleanInput.includes(n);
          });
        }

        return (nameMatch || companyMatch || arrayMatch) && dateMatch;
      });

      if (matched.length === 0) {
        toast.error(`Data dengan nama "${guestName}" tidak ditemukan. Silakan hubungi admin mess.`);
        setLoading(false);
        return;
      }

      // Filter yang statusnya Approved (case insensitive)
      const approved = matched.filter(sub => {
        const s = (sub.status || '').toString().toLowerCase().trim();
        return s === 'approved';
      });

      if (approved.length > 0) {
        // Urutkan berdasarkan yang terbaru
        const latest = approved.sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        })[0];

        toast.success('Data ditemukan! Silakan isi formulir.');
        
        // Update document with estimated arrival time if provided
        if (latest.id && estimatedTime) {
          try {
            await updateDoc(doc(db, 'submissions', latest.id), {
              estimatedArrivalTime: estimatedTime
            });
          } catch (updateErr) {
            // Silently fail estimated time update
          }
        }

        setTimeout(() => navigate(`/guest-statement/form/${latest.id}`), 500);
      } else {
        // Data ada tapi belum di-approve
        const sub = matched[0];
        toast.error(`Ditemukan data untuk "${sub.guestName}", tapi statusnya "${sub.status}". Mohon tunggu Admin melakukan Approve.`);
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      
      if (errorMessage.includes('Failed to get documents from server') || 
          errorMessage.includes('offline') || 
          errorMessage.includes('backend') || 
          errorMessage.includes('timeout') ||
          errorMessage.includes('not-found')) {
        setIsOffline(true);
        toast.error('Koneksi ke server terganggu. Kami sedang mencoba menyambungkan kembali secara otomatis. Jika masalah berlanjut, silakan klik tombol "Segarkan Koneksi".');
      } else if (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions')) {
        toast.error('Akses ditolak (Izin Tidak Cukup). Pastikan data Anda sudah disetujui oleh Admin.');
      } else {
        toast.error('Terjadi kesalahan saat memvalidasi data. Silakan hubungi admin mess.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-primary/10">
      {/* Top Bar */}
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
          <Button variant="ghost" className="text-slate-500 hover:text-primary hover:bg-primary/5 gap-2 font-bold text-xs h-auto py-1">
            <HelpCircle size={18} />
            <div className="text-left hidden sm:block">
              <p className="leading-none">Butuh bantuan?</p>
              <p className="text-[9px] opacity-60">Hubungi Admin Mess</p>
            </div>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* Left Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                <ShieldCheck size={12} />
                Akses Publik Aman
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Pernyataan Tamu <br />
                <span className="text-primary">Tanpa Login</span>
              </h2>
              <p className="text-slate-500 text-lg font-medium max-w-md leading-relaxed">
                Halaman ini digunakan untuk mengisi pernyataan dan menyetujui tata tertib Mess. Cukup masukkan nama Anda untuk memulai.
              </p>
            </div>

            {/* Illustration Placeholder */}
            <div className="relative w-full max-w-sm aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl flex items-center justify-center overflow-hidden border border-white shadow-inner">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]"></div>
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 w-48"
              >
                <div className="space-y-3">
                  <div className="h-2 w-full bg-slate-100 rounded"></div>
                  <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-white" />
                      </div>
                      <div className="h-1.5 w-12 bg-slate-100 rounded"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-white" />
                      </div>
                      <div className="h-1.5 w-16 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-primary p-3 rounded-xl shadow-lg text-white">
                  <ClipboardCheck size={24} />
                </div>
              </motion.div>
            </div>

            {/* Rules Card */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
              <div className="bg-slate-900 px-6 py-4">
                <h3 className="text-white font-bold text-sm tracking-wide">Tata Tertib Tamu Mess</h3>
              </div>
              <CardContent className="p-6 space-y-4">
                {[
                  'Tamu wajib menjaga kebersihan dan kerapihan kamar.',
                  'Dilarang merokok di dalam kamar.',
                  'Dilarang membawa tamu lain tanpa izin.',
                  'Gunakan fasilitas mess dengan bijak dan bertanggung jawab.',
                  'Tamu wajib menaati peraturan yang berlaku di lingkungan mess.'
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="mt-1 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 transition-colors duration-300">
                      <CheckCircle2 size={12} className="text-emerald-500 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{rule}</p>
                  </div>
                ))}

                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 items-start">
                  <Info className="text-amber-600 shrink-0" size={18} />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-900">Petunjuk</p>
                    <p className="text-[11px] text-amber-700 font-medium leading-normal">
                      Sistem akan mencari data pengajuan yang sudah disetujui Admin berdasarkan nama lengkap Anda.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Section - Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[32px] overflow-hidden bg-white">
              <CardContent className="p-8 md:p-12">
                <div className="space-y-2 mb-10">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Akses Pernyataan Tamu</h3>
                  <p className="text-slate-500 font-medium">Masukkan nama lengkap Anda untuk melanjutkan.</p>
                </div>

                <form onSubmit={handleSearch} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <Label htmlFor="guestName" className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                          <User size={20} />
                        </div>
                        <Input 
                          id="guestName"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Masukkan nama sesuai pengajuan" 
                          className="h-14 pl-12 border-slate-200 rounded-2xl focus:ring-primary/10 focus:border-primary transition-all font-medium"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium ml-1 italic">Contoh: Andi Wijaya</p>
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="checkInDate" className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">
                        Tanggal Check-in <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                          <Calendar size={20} />
                        </div>
                        <Input 
                          id="checkInDate"
                          type="date"
                          value={checkInDate}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          className="h-14 pl-12 border-slate-200 rounded-2xl focus:ring-primary/10 focus:border-primary transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="estimatedTime" className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">
                        Estimasi Kedatangan (Jam) <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                          <Clock size={20} />
                        </div>
                        <Input 
                          id="estimatedTime"
                          type="time"
                          value={estimatedTime}
                          onChange={(e) => setEstimatedTime(e.target.value)}
                          className="h-14 pl-12 border-slate-200 rounded-2xl focus:ring-primary/10 focus:border-primary transition-all font-medium"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium ml-1 italic">Prakiraan kedatangan Anda di mess mess</p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary shrink-0">
                      <Lock size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">Verifikasi Cepat</p>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Data dicocokkan dengan basis data pengajuan yang sudah disetujui (Approved) oleh Admin Mess.
                      </p>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black text-sm rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] gap-3"
                  >
                    {loading ? (
                      'Memproses...'
                    ) : (
                      <>
                        Cari Data & Lanjutkan
                        <ArrowRight size={18} />
                      </>
                    )}
                  </Button>

                  {isOffline && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handleRefreshConnection}
                      disabled={loading}
                      className="w-full h-12 border-amber-200 bg-amber-50 text-amber-700 font-bold rounded-2xl gap-2 hover:bg-amber-100 transition-all"
                    >
                      <Info size={18} />
                      Segarkan Koneksi Sistem
                    </Button>
                  )} 

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-300 bg-white px-4">
                      atau
                    </div>
                  </div>

                  <div className="p-6 border border-slate-100 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                        <HelpCircle size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Butuh bantuan?</p>
                        <p className="text-[10px] text-slate-500 font-medium">Hubungi admin mess jika mengalami kesulitan.</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="rounded-xl border-slate-200 hover:bg-white hover:border-primary hover:text-primary font-bold text-xs gap-2 h-10 px-5 transition-all"
                      onClick={() => window.open('https://wa.me/6281252231709', '_blank')}
                    >
                      <MessageCircle size={16} className="text-emerald-500" />
                      Hubungi Admin
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <footer className="py-12 text-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          © 2026 Mess Stay. Semua hak dilindungi.
        </p>
      </footer>
    </div>
  );
}
