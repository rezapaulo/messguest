import React, { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, where, getDocs, Timestamp } from 'firebase/firestore';
import { Submission, Room, PPEBorrowing } from '../types';
import { useAuth } from '../lib/AuthContext';
import { 
  Search, 
  Bell, 
  HelpCircle, 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Info,
  Clock,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HardHat,
  Footprints,
  Trash2,
  FileText,
  Plus
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function PPEBorrowingPage() {
  const { profile } = useAuth();
  const [borrowings, setBorrowings] = useState<PPEBorrowing[]>([]);
  const [activeSubmissions, setActiveSubmissions] = useState<Submission[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'borrowed' | 'returned' | 'late'>('all');
  
  // Code Generation Logic: A + YYMM + Huruf Urutan (Total 6 characters)
  const generatedCode = useMemo(() => {
    const now = new Date();
    const yy = format(now, 'yy'); // '26'
    const mm = format(now, 'MM'); // '04'
    const currentPrefix = `A${yy}${mm}`; // 'A2604'
    
    // Extract valid codes for current year-month
    const existingCodes = borrowings
      .map(b => b.borrowCode)
      .filter((code): code is string => 
        typeof code === 'string' && 
        code.startsWith(currentPrefix) && 
        code.length === 6
      );
    
    if (existingCodes.length === 0) {
      return `${currentPrefix}A`;
    }
    
    // Sort to find the highest character sequence
    existingCodes.sort();
    const latestCode = existingCodes[existingCodes.length - 1];
    const latestChar = latestCode.charAt(5).toUpperCase();
    
    // Increment character (A -> B -> C ...)
    let nextCharCode = latestChar.charCodeAt(0) + 1;
    
    // Character limit protection (stay at Z if 6-char limit is reached)
    const finalNextCharCode = nextCharCode > 90 ? 90 : nextCharCode;
    
    return `${currentPrefix}${String.fromCharCode(finalNextCharCode)}`;
  }, [borrowings]);

  // Form State
  const [formData, setFormData] = useState({
    submissionId: '',
    items: [] as string[],
    expectedReturnAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch all ppe borrowings
    const unsubBorrowings = onSnapshot(collection(db, 'ppe_borrowings'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PPEBorrowing));
      setBorrowings(data.sort((a, b) => new Date(b.borrowedAt).getTime() - new Date(a.borrowedAt).getTime()));
    }, error => handleFirestoreError(error, OperationType.LIST, 'ppe_borrowings'));

    // Fetch active submissions (checked-in guests)
    const q = query(collection(db, 'submissions'), where('status', '==', 'checked-in'));
    const unsubSubmissions = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setActiveSubmissions(data);
    }, error => handleFirestoreError(error, OperationType.LIST, 'submissions'));

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(data);
    }, error => handleFirestoreError(error, OperationType.LIST, 'rooms'));

    return () => {
      unsubBorrowings();
      unsubSubmissions();
      unsubRooms();
    };
  }, []);

  const filteredBorrowings = useMemo(() => {
    return borrowings.filter(b => {
      const guestName = b.guestName.toLowerCase();
      const roomNum = b.roomNumber.toLowerCase();
      const matchesSearch = guestName.includes(searchQuery.toLowerCase()) || roomNum.includes(searchQuery.toLowerCase());
      
      let matchesTab = true;
      if (activeTab === 'borrowed') matchesTab = b.status === 'borrowed';
      else if (activeTab === 'returned') matchesTab = b.status === 'returned';
      else if (activeTab === 'late') matchesTab = b.status === 'late';
      
      return matchesSearch && matchesTab;
    });
  }, [borrowings, searchQuery, activeTab]);

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.submissionId || formData.items.length === 0 || !profile) {
      toast.error('Mohon lengkapi data peminjaman');
      return;
    }

    setIsSubmitting(true);
    try {
      const sub = activeSubmissions.find(s => s.id === formData.submissionId);
      if (!sub) throw new Error('Submission not found');

      const room = rooms.find(r => r.id === sub.roomId);

      const newBorrow: Omit<PPEBorrowing, 'id'> = {
        borrowCode: generatedCode,
        submissionId: formData.submissionId,
        guestName: sub.guestName || sub.guestNames?.[0] || 'Unknown Guest',
        roomNumber: room ? room.number : 'N/A',
        items: formData.items,
        borrowedAt: new Date().toISOString(),
        expectedReturnAt: new Date(formData.expectedReturnAt).toISOString(),
        status: 'borrowed',
        notes: formData.notes,
        createdBy: profile.uid
      };

      await addDoc(collection(db, 'ppe_borrowings'), newBorrow);
      toast.success('Peminjaman APD berhasil dicatat');
      setFormData({
        submissionId: '',
        items: [],
        expectedReturnAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ppe_borrowings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async (id: string) => {
    try {
      await updateDoc(doc(db, 'ppe_borrowings', id), {
        status: 'returned',
        actualReturnedAt: new Date().toISOString()
      });
      toast.success('APD telah dikembalikan');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ppe_borrowings/${id}`);
    }
  };

  const toggleItem = (item: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.includes(item) 
        ? prev.items.filter(i => i !== item)
        : [...prev.items, item]
    }));
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'borrowed': return { label: 'Dipinjam', color: 'bg-blue-100 text-blue-600', icon: Clock };
      case 'returned': return { label: 'Dikembalikan', color: 'bg-green-100 text-green-600', icon: CheckCircle2 };
      case 'late': return { label: 'Terlambat', color: 'bg-red-100 text-red-600', icon: AlertCircle };
      default: return { label: status, color: 'bg-gray-100 text-gray-500', icon: Info };
    }
  };

  return (
    <div className="bg-transparent pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">Pengambilan APD Tamu</h1>
          <p className="text-slate-500 font-medium text-sm">Peminjaman APD dengan KTP sebagai jaminan</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-2xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-primary transition-all">
            <Bell size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-2xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-primary transition-all">
            <HelpCircle size={20} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Info Box (Recipe 8: Clean Utility style) */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-[32px] p-8 flex items-start gap-6 shadow-sm">
            <div className="w-16 h-16 rounded-[24px] bg-white flex items-center justify-center text-blue-600 shrink-0 shadow-sm border border-blue-50">
              <ShieldCheck size={32} />
            </div>
            <div>
              <p className="text-sm text-blue-900 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <Info size={14} /> Informasi Penting
              </p>
              <p className="text-[13px] text-blue-700/90 font-medium leading-relaxed">
                Tamu wajib menyerahkan KTP sebagai jaminan saat mengambil APD. APD harus dikembalikan dalam kondisi baik dan lengkap sebelum check-out untuk pengembalian KTP.
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-blue-100">
                  <HardHat size={12} className="text-blue-500" />
                  <span className="text-[10px] font-bold text-blue-700">Helm Safety</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-blue-100">
                   <ShieldCheck size={12} className="text-blue-500" />
                   <span className="text-[10px] font-bold text-blue-700">Rompi</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-blue-100">
                   <Footprints size={12} className="text-blue-500" />
                   <span className="text-[10px] font-bold text-blue-700">Sepatu Safety</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-2 rounded-[28px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1 p-1">
              {(['all', 'borrowed', 'returned', 'late'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-y-[-1px]' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'all' ? 'Semua' : 
                   tab === 'borrowed' ? 'Dipinjam' :
                   tab === 'returned' ? 'Dikembalikan' : 'Terlambat'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pr-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input 
                  placeholder="Cari nama tamu..." 
                  className="pl-12 h-11 rounded-2xl border-none bg-slate-50/50 w-[240px] focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-bold text-xs"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-400">
                <Calendar size={18} />
              </Button>
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-400">
                <Filter size={18} />
              </Button>
            </div>
          </div>

          {/* Main Table */}
          <div className="space-y-4">
            {filteredBorrowings.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none rounded-[40px] py-32 flex flex-col items-center justify-center text-slate-400">
                <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center mb-6">
                  <HardHat size={40} className="text-slate-300" />
                </div>
                <p className="font-bold uppercase tracking-wider text-sm">Tidak ada data peminjaman</p>
                <p className="text-[11px] font-medium mt-1">Gunakan panel kanan untuk membuat peminjaman baru</p>
              </Card>
            ) : (
              filteredBorrowings.map((b) => {
                const config = getStatusConfig(b.status);
                
                return (
                  <Card key={b.id} className="border-none shadow-sm hover:shadow-md transition-all rounded-[32px] overflow-hidden group bg-white">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row md:items-center p-6 gap-6 relative">
                        {/* Status Rail */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${config.color.split(' ')[0]}`}></div>
                        
                        {/* Guest Info */}
                        <div className="flex items-center gap-5 min-w-[220px] ml-2">
                          <div className="w-14 h-14 rounded-[22px] bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 font-bold text-xl border border-slate-100 relative">
                            {b.guestName[0].toUpperCase()}
                            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-slate-900 text-white text-[8px] font-mono rounded-md border border-white">
                              {b.borrowCode}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-[13px] truncate uppercase tracking-tight">
                              {b.guestName}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <MapPin size={10} className="text-red-500" />
                              <span className="text-[10px] text-slate-700 font-bold">KAMAR {b.roomNumber}</span>
                            </div>
                          </div>
                        </div>

                        {/* Items & Times */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 flex-1 gap-8">
                          <div className="space-y-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">APD Dipinjam</p>
                            <div className="flex flex-wrap gap-1.5">
                              {b.items.map((item, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] font-bold bg-slate-50 border-slate-200 px-2 py-0.5 rounded-lg uppercase">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Waktu Pinjam</p>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                <Calendar size={14} />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700">
                                {format(new Date(b.borrowedAt), 'dd MMM, HH:mm')}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2 hidden lg:block">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                            <div className={`w-fit px-4 py-1 rounded-full text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${config.color}`}>
                              <config.icon size={12} />
                              {config.label}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {b.status === 'borrowed' && (
                            <Button 
                              variant="outline"
                              size="sm" 
                              className="border-green-200 text-green-700 hover:bg-green-50 font-bold text-[10px] uppercase rounded-2xl px-5 h-11 tracking-wider"
                              onClick={() => handleReturn(b.id)}
                            >
                              <CheckCircle2 size={16} className="mr-2" />
                              Kembalikan
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-300 rounded-2xl hover:text-slate-600 hover:bg-slate-50 transition-all">
                            <FileText size={20} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side Panel - Input Form */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm rounded-[40px] overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-slate-50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-4 tracking-tight uppercase">
                <div className="w-10 h-10 rounded-[14px] bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Plus size={20} />
                </div>
                Peminjaman APD Baru
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleBorrow} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Kode Peminjaman (Otomatis)</label>
                  <div className="h-12 flex items-center px-4 rounded-[18px] bg-slate-100 border border-slate-200 text-slate-900 font-mono font-bold text-sm tracking-widest">
                    {generatedCode}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Pilih Tamu (Sedang Menginap)</label>
                  <Select
                    value={formData.submissionId}
                    onValueChange={v => setFormData(p => ({ ...p, submissionId: v }))}
                  >
                    <SelectTrigger className="h-12 rounded-[18px] border-slate-200 bg-slate-50/50 font-bold text-xs ring-offset-orange-500">
                      <SelectValue placeholder="Pilih tamu" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {activeSubmissions.length === 0 ? (
                        <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase italic">
                          Tidak ada tamu aktif
                        </div>
                      ) : (
                        activeSubmissions.map(sub => (
                          <SelectItem key={sub.id} value={sub.id} className="text-xs font-bold py-3 rounded-xl uppercase">
                            {sub.guestName || sub.guestNames?.[0]} (Kamar {rooms.find(r => r.id === sub.roomId)?.number || '?'})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 p-6 bg-slate-50/50 rounded-[28px] border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Checklist APD</label>
                  {['Helm Safety', 'Rompi', 'Masker', 'Sepatu Safety'].map((item) => (
                    <div key={item} className="flex items-center space-x-3 py-1 cursor-pointer">
                      <Checkbox 
                        id={item} 
                        checked={formData.items.includes(item)}
                        onCheckedChange={() => toggleItem(item)}
                        className="rounded-[6px] w-5 h-5 border-slate-300 data-[state=checked]:bg-blue-600"
                      />
                      <label 
                        htmlFor={item} 
                        className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                        onClick={() => toggleItem(item)}
                      >
                        {item}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Catatan (Opsional)</label>
                   <Textarea 
                     placeholder="Contoh: Helm warna kuning..." 
                     className="min-h-[100px] rounded-[24px] border-slate-200 bg-slate-50/50 text-xs font-medium p-4 resize-none"
                     value={formData.notes}
                     onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                   />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="flex-1 h-14 rounded-[22px] font-bold uppercase text-[11px] tracking-wider text-slate-400"
                    onClick={() => setFormData({ submissionId: '', items: [], expectedReturnAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"), notes: '' })}
                  >
                    Reset
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-[2] h-14 rounded-[22px] bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-bold uppercase text-[11px] tracking-widest"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Memproses...' : 'Simpan & Pinjam'}
                  </Button>
                </div>
              </form>

              <div className="mt-8 p-6 bg-orange-50 border border-orange-100 rounded-[28px] flex items-start gap-4">
                 <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-orange-500 shrink-0">
                   <AlertCircle size={18} />
                 </div>
                 <p className="text-[10px] text-orange-800 font-bold leading-relaxed">
                   Warning: KTP akan dikembalikan setelah APD dikembalikan dalam kondisi baik dan lengkap.
                 </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
