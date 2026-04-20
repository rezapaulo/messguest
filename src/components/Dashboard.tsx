import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Submission, Room } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Bed, 
  UserCheck,
  ArrowRight,
  PlusCircle as PlusCircleIcon,
  Users,
  LogIn,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { NotificationBell } from './NotificationBell';

export default function Dashboard() {
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const submissionsRef = collection(db, 'submissions');
    const q = profile.role === 'admin' 
      ? query(submissionsRef)
      : query(submissionsRef, where('userUid', '==', profile.uid));

    const unsubSubmissions = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'submissions'));

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'rooms'));

    setLoading(false);

    return () => {
      unsubSubmissions();
      unsubRooms();
    };
  }, [profile]);

  if (loading) return <div>Loading dashboard...</div>;

  const stats = profile?.role === 'admin' ? [
    { 
      title: 'New Submissions', 
      value: submissions.filter(s => s.status === 'pending').length, 
      icon: Clock, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50' 
    },
    { 
      title: 'Guests Staying', 
      value: submissions.filter(s => s.status === 'checked-in').length,
      icon: UserCheck, 
      color: 'text-green-600', 
      bg: 'bg-green-50' 
    },
    { 
      title: 'Today Arriving', 
      value: submissions.filter(s => s.status === 'approved').length, 
      icon: ArrowRight, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      title: 'Available Rooms', 
      value: rooms.filter(r => r.status === 'available').length, 
      icon: CheckCircle2, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
  ] : [
    { 
      title: 'Total Requests', 
      value: submissions.length, 
      icon: ClipboardList, 
      color: 'text-slate-600', 
      bg: 'bg-slate-50' 
    },
    { 
      title: 'Approved', 
      value: submissions.filter(s => s.status === 'approved').length, 
      icon: CheckCircle2, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      title: 'Pending', 
      value: submissions.filter(s => s.status === 'pending').length, 
      icon: Clock, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50' 
    },
    { 
      title: 'Rejected', 
      value: submissions.filter(s => s.status === 'rejected').length, 
      icon: XCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-50' 
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ringkasan Operasional</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Pantau status hunian dan pengajuan tamu hari ini</p>
        </div>
        <div className="flex items-center gap-4">
          {profile?.role === 'admin' && <NotificationBell />}
          {profile?.role === 'user' && (
            <Link to="/apply">
              <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-6 font-semibold">
                <PlusCircleIcon size={18} className="mr-2" />
                Pengajuan Tamu
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <Card key={i} className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2">{stat.title}</p>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</h3>
                  <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                    <stat.icon size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">↑ 12%</span>
                  <span className="text-[10px] text-slate-400 font-medium">dari kemarin</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-800">Pengajuan Menunggu Persetujuan</CardTitle>
            <Link to="/submissions" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">
              Lihat Semua
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {submissions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-medium italic">
                No submissions found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamu / Perusahaan</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipe Kamar</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-in</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-out</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pernyataan</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.slice(0, 5).map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 text-sm">
                            {sub.guestName || (Array.isArray(sub.guestNames) 
                              ? sub.guestNames.map((g: any) => typeof g === 'string' ? g : g.name).join(', ') 
                              : 'No names')}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">{sub.company}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-600 font-bold">{sub.roomType || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-600 font-semibold">
                            {sub.checkInDate ? new Date(sub.checkInDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-600 font-semibold">
                            {sub.checkOutDate ? new Date(sub.checkOutDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {sub.statementAccepted ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : (
                            <XCircle size={16} className="text-slate-200" />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            sub.status === 'approved' ? 'bg-blue-100 text-blue-700' : 
                            sub.status === 'checked-in' ? 'bg-emerald-100 text-emerald-700' :
                            sub.status === 'checked-out' ? 'bg-slate-100 text-slate-500' :
                            sub.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {sub.status === 'approved' ? 'Approved' : sub.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="px-6 py-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-800">Status Kamar</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-3">
                {rooms.slice(0, 9).map((room) => (
                  <div 
                    key={room.id} 
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                      room.status === 'occupied' 
                        ? 'bg-blue-50 border-blue-200 text-primary' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="text-sm font-bold">{room.number}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider mt-1">
                      {room.status === 'occupied' ? 'Terisi' : 'Kosong'}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-primary rounded-sm shadow-sm shadow-primary/20"></div>
                    <span className="text-slate-600">Terisi ({rooms.filter(r => r.status === 'occupied').length} Kamar)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-white border border-slate-200 rounded-sm"></div>
                    <span className="text-slate-600">Tersedia ({rooms.filter(r => r.status === 'available').length} Kamar)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="px-6 py-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-800">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {profile?.role === 'admin' && (
                <Link to="/check-in-out" className="block">
                  <Button variant="outline" className="w-full justify-start gap-3 text-xs font-bold h-11 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-50">
                    <LogIn size={16} />
                    Check-in & Check-out
                  </Button>
                </Link>
              )}
              {profile?.role === 'admin' && (
                <Link to="/ppe" className="block">
                  <Button variant="outline" className="w-full justify-start gap-3 text-xs font-bold h-11 border-orange-200 bg-orange-50/50 text-orange-700 hover:bg-orange-50">
                    <ShieldCheck size={16} />
                    Peminjaman APD Tamu
                  </Button>
                </Link>
              )}
              {profile?.role === 'user' && (
                <Link to="/apply">
                  <Button className="w-full justify-start gap-3 bg-primary hover:bg-primary/90 text-xs font-bold h-11">
                    <PlusCircleIcon size={16} />
                    Pengajuan Tamu
                  </Button>
                </Link>
              )}
              <Link to="/submissions" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 text-xs font-bold h-11 border-slate-200 hover:bg-slate-50">
                  <ClipboardList size={16} />
                  {profile?.role === 'admin' ? 'Daftar Pengajuan' : 'Pengajuan Saya'}
                </Button>
              </Link>
              {profile?.role === 'admin' && (
                <>
                  <Link to="/rooms" className="block">
                    <Button variant="outline" className="w-full justify-start gap-3 text-xs font-bold h-11 border-slate-200 hover:bg-slate-50">
                      <Bed size={16} />
                      Manage Rooms
                    </Button>
                  </Link>
                  <Link to="/users" className="block">
                    <Button variant="outline" className="w-full justify-start gap-3 text-xs font-bold h-11 border-slate-200 hover:bg-slate-50">
                      <Users size={16} />
                      Manage Users
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
