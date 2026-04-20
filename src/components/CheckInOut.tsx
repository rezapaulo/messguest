import React, { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { Submission, Room } from '../types';
import { 
  Search, 
  Bell, 
  HelpCircle, 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  MoreVertical, 
  LogIn, 
  LogOut, 
  Info,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function CheckInOut() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'staying' | 'finished'>('all');
  
  // Quick Action States
  const [quickCheckIn, setQuickCheckIn] = useState({ subId: '', notes: '' });
  const [quickCheckOut, setQuickCheckOut] = useState({ subId: '', condition: 'good', notes: '' });

  useEffect(() => {
    // Only fetch approved or operational submissions
    const q = query(collection(db, 'submissions'), where('status', 'in', ['approved', 'checked-in', 'checked-out']));
    
    const unsubSubmissions = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(data.sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime()));
    }, error => handleFirestoreError(error, OperationType.LIST, 'submissions'));

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(data);
    }, error => handleFirestoreError(error, OperationType.LIST, 'rooms'));

    return () => {
      unsubSubmissions();
      unsubRooms();
    };
  }, []);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const guestName = (sub.guestName || sub.guestNames?.join(', ') || '').toLowerCase();
      const matchesSearch = guestName.includes(searchQuery.toLowerCase());
      
      let matchesTab = true;
      if (activeTab === 'upcoming') matchesTab = sub.status === 'approved';
      else if (activeTab === 'staying') matchesTab = sub.status === 'checked-in';
      else if (activeTab === 'finished') matchesTab = sub.status === 'checked-out';
      
      return matchesSearch && matchesTab;
    });
  }, [submissions, searchQuery, activeTab]);

  const handleCheckIn = async (subId: string) => {
    try {
      const sub = submissions.find(s => s.id === subId);
      if (!sub) return;

      await updateDoc(doc(db, 'submissions', subId), {
        status: 'checked-in',
        actualCheckInTime: new Date().toISOString()
      });

      if (sub.roomId) {
        // Use a safer update pattern or check existence
        const roomRef = doc(db, 'rooms', sub.roomId);
        try {
          await updateDoc(roomRef, { status: 'occupied' });
        } catch (err) {
          console.warn(`Room ${sub.roomId} not found during check-in, skipping status update.`);
        }
      }

      toast.success('Tamu berhasil check-in');
      setQuickCheckIn({ subId: '', notes: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${subId}`);
    }
  };

  const handleCheckOut = async (subId: string) => {
    try {
      const sub = submissions.find(s => s.id === subId);
      if (!sub) return;

      await updateDoc(doc(db, 'submissions', subId), {
        status: 'checked-out',
        actualCheckOutTime: new Date().toISOString(),
        condition: quickCheckOut.subId === subId ? quickCheckOut.condition : 'good',
        checkOutNotes: quickCheckOut.subId === subId ? quickCheckOut.notes : ''
      });

      if (sub.roomId) {
        const roomRef = doc(db, 'rooms', sub.roomId);
        try {
          await updateDoc(roomRef, { status: 'available' });
        } catch (err) {
          console.warn(`Room ${sub.roomId} not found during check-out, skipping status update.`);
        }
      }

      toast.success('Tamu berhasil check-out');
      setQuickCheckOut({ subId: '', condition: 'good', notes: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${subId}`);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved': return { label: 'Akan Datang', color: 'bg-blue-100 text-blue-600' };
      case 'checked-in': return { label: 'Sedang Menginap', color: 'bg-green-100 text-green-600' };
      case 'checked-out': return { label: 'Selesai', color: 'bg-slate-100 text-slate-500' };
      default: return { label: status, color: 'bg-gray-100 text-gray-500' };
    }
  };

  return (
    <div className="bg-transparent pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">Check-in & Check-out Tamu</h1>
          <p className="text-slate-500 font-medium text-sm">Kelola kedatangan dan kepulangan tamu secara aktual</p>
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
        {/* Main Section */}
        <div className="lg:col-span-8 space-y-6">
          {/* Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm w-fit">
              {(['all', 'upcoming', 'staying', 'finished'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'all' ? 'Semua' : 
                   tab === 'upcoming' ? 'Akan Datang' :
                   tab === 'staying' ? 'Sedang Menginap' : 'Selesai'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input 
                placeholder="Cari nama tamu..." 
                className="pl-10 h-11 rounded-2xl border-slate-200 bg-white shadow-sm w-[280px] focus:ring-blue-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          <div className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none rounded-[32px] py-20 flex flex-col items-center justify-center text-slate-400">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <User size={32} className="text-slate-300" />
                </div>
                <p className="font-bold">Tidak ada data tamu ditemukan</p>
                <p className="text-xs">Coba ubah filter atau kata kunci pencarian Anda</p>
              </Card>
            ) : (
              filteredSubmissions.map((sub) => {
                const config = getStatusConfig(sub.status);
                const room = rooms.find(r => r.id === sub.roomId);
                
                return (
                  <Card key={sub.id} className="border-none shadow-sm hover:shadow-md transition-all rounded-[24px] overflow-hidden group">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                        {/* Guest Info */}
                        <div className="flex items-center gap-4 min-w-[200px]">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 font-bold text-lg">
                            {(sub.guestName?.[0] || sub.guestNames?.[0]?.[0] || 'G').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">
                              {sub.guestName || sub.guestNames?.join(', ')}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Phone size={10} className="text-slate-300" />
                              <span className="text-[10px] text-slate-500 font-medium">0812-3456-7890</span>
                            </div>
                          </div>
                        </div>

                        {/* Schedule & Room */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 flex-1 gap-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check-in</p>
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className="text-blue-500" />
                              <span className="text-xs font-bold text-slate-700">
                                {format(new Date(sub.checkInDate), 'dd MMM yyyy')}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CHECK-OUT</p>
                            <div className="flex items-center gap-2">
                              <LogOut size={12} className="text-orange-500" />
                              <span className="text-xs font-bold text-slate-700">
                                {sub.actualCheckOutTime ? format(new Date(sub.actualCheckOutTime), 'dd MMM yyyy') : '-'}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kamar</p>
                            <div className="flex items-center gap-2">
                              <MapPin size={12} className="text-red-500" />
                              <span className="text-xs font-bold text-slate-700">
                                {room ? `${room.building} - ${room.number}` : '-'}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1 hidden lg:block">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                            <div className={`w-fit px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${config.color}`}>
                              {config.label}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {sub.status === 'approved' && (
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-4 gap-2 h-10 shadow-lg shadow-blue-100 transition-all active:scale-95"
                              onClick={() => {
                                setQuickCheckIn({ subId: sub.id, notes: '' });
                                handleCheckIn(sub.id);
                              }}
                            >
                              <LogIn size={16} />
                              Check-in
                            </Button>
                          )}
                          {sub.status === 'checked-in' && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl px-4 gap-2 h-10 shadow-lg shadow-green-100 transition-all active:scale-95"
                              onClick={() => {
                                setQuickCheckOut(prev => ({ ...prev, subId: sub.id }));
                                handleCheckOut(sub.id);
                              }}
                            >
                              <LogOut size={16} />
                              Check-out
                            </Button>
                          )}
                          {sub.status === 'checked-out' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-slate-200 text-slate-600 font-bold rounded-xl px-4 h-10 hover:bg-slate-50 transition-all"
                            >
                              Detail
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 rounded-xl hover:text-slate-600 transition-all">
                            <MoreVertical size={18} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          
          {/* Info Box */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-[32px] p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Info size={20} />
            </div>
            <div>
              <p className="text-xs text-blue-800 font-bold mb-1">Penting</p>
              <p className="text-[11px] text-blue-700/80 font-medium leading-relaxed">
                Pastikan melakukan check-in saat tamu datang dan check-out saat tamu pulang untuk update data yang akurat. Data yang akurat membantu dalam pengelolaan kapasitas mess secara optimal.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar / Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="p-6 border-b border-slate-50">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-3 tracking-tight uppercase">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <LogIn size={14} />
                </div>
                Quick Check-in
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Pilih Tamu</label>
                <Select
                  value={quickCheckIn.subId}
                  onValueChange={v => setQuickCheckIn(prev => ({ ...prev, subId: v }))}
                >
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50/50">
                    <SelectValue placeholder="Pilih tamu yang akan datang" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {submissions.filter(s => s.status === 'approved').map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.guestName || sub.guestNames?.[0]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Waktu Check-in</label>
                <div className="h-11 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center px-4 text-slate-500 text-xs font-bold gap-2">
                  <Clock size={14} />
                  {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Catatan Tambahan</label>
                <Input 
                  placeholder="Opsional..." 
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50/50"
                  value={quickCheckIn.notes}
                  onChange={e => setQuickCheckIn(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-[20px] font-bold shadow-lg shadow-blue-100 transition-all active:scale-95"
                disabled={!quickCheckIn.subId}
                onClick={() => handleCheckIn(quickCheckIn.subId)}
              >
                Konfirmasi Check-in
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="p-6 border-b border-slate-50">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-3 tracking-tight uppercase">
                <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center text-white">
                  <LogOut size={14} />
                </div>
                Quick Check-out
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Pilih Tamu</label>
                <Select
                  value={quickCheckOut.subId}
                  onValueChange={v => setQuickCheckOut(prev => ({ ...prev, subId: v }))}
                >
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50/50">
                    <SelectValue placeholder="Pilih tamu sedang menginap" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {submissions.filter(s => s.status === 'checked-in').map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.guestName || sub.guestNames?.[0]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Kondisi Kamar</label>
                <Select
                  value={quickCheckOut.condition}
                  onValueChange={v => setQuickCheckOut(prev => ({ ...prev, condition: v }))}
                >
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="good">Baik & Bersih</SelectItem>
                    <SelectItem value="needs_cleaning">Perlu Pembersihan</SelectItem>
                    <SelectItem value="damaged">Ada Kerusakan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Catatan Tambahan</label>
                <Input 
                  placeholder="Opsional..." 
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50/50"
                  value={quickCheckOut.notes}
                  onChange={e => setQuickCheckOut(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 h-12 rounded-[20px] font-bold shadow-lg shadow-green-100 transition-all active:scale-95"
                disabled={!quickCheckOut.subId}
                onClick={() => handleCheckOut(quickCheckOut.subId)}
              >
                Konfirmasi Check-out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
