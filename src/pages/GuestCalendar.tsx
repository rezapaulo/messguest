import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  isBefore,
  startOfDay,
  parseISO
} from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Calendar as CalendarIcon,
  ChevronDown,
  User,
  Bed,
  LogIn,
  LogOut,
  Users,
  Search,
  ExternalLink,
  Info
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { NotificationBell } from '../components/NotificationBell';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Submission, Room } from '../types';

// Sub-components for better organization and to avoid Rules of Hooks violations
const PageHeader = () => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">Kalender Check-in & Check-out</h1>
        <p className="text-slate-500 font-medium text-sm">Pantau jadwal kedatangan dan kepulangan tamu yang sudah disetujui.</p>
      </div>
      
      <div className="flex items-center gap-4">
        <NotificationBell />
        <Button variant="outline" className="rounded-xl h-11 px-5 border-slate-200 gap-2 font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-sm border">
          <Filter size={18} />
          Filter
        </Button>
      </div>
    </div>
  );
};

const CalendarHeader = ({ 
  currentDate, 
  handlePrev, 
  handleNext, 
  goToToday, 
  viewType, 
  setViewType, 
  setCurrentDate 
}: { 
  currentDate: Date, 
  handlePrev: () => void, 
  handleNext: () => void, 
  goToToday: () => void, 
  viewType: 'month' | 'week' | 'day', 
  setViewType: (type: 'month' | 'week' | 'day') => void,
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>
}) => {
  let title = '';
  if (viewType === 'month') {
    title = format(currentDate, 'MMMM yyyy', { locale: id });
  } else if (viewType === 'week') {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    title = `${format(weekStart, 'd MMMM', { locale: id })} - ${format(weekEnd, 'd MMMM yyyy', { locale: id })}`;
  } else {
    title = format(currentDate, 'd MMMM yyyy', { locale: id });
  }

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
          <Button variant="ghost" size="icon" onClick={handlePrev} className="h-9 w-9 hover:bg-white hover:shadow-sm text-slate-600 rounded">
            <ChevronLeft size={20} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 hover:bg-white hover:shadow-sm text-slate-600 rounded">
            <ChevronRight size={20} />
          </Button>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={goToToday}
          className="h-9 px-4 rounded-lg text-sm font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
        >
          Hari Ini
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-bold text-slate-800 capitalize leading-none">
            {title}
          </h3>
          <ChevronDown size={20} className="text-slate-400" />
        </div>
      </div>

      <div className="flex items-center p-1 bg-slate-100 rounded-lg">
        {(['month', 'week', 'day'] as const).map((type) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => {
              setViewType(type);
              if (type === 'month') setCurrentDate(startOfMonth(currentDate));
            }}
            className={`h-9 rounded-md px-6 text-sm font-bold transition-all ${
              viewType === type 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {type === 'month' ? 'Bulan' : type === 'week' ? 'Minggu' : 'Hari'}
          </Button>
        ))}
      </div>
    </div>
  );
};

const DayLabels = () => {
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  return (
    <div className="grid grid-cols-7 border-b border-slate-100">
      {days.map((day, i) => (
        <div key={i} className="py-4 text-center">
          <span className={`text-sm font-bold ${i >= 5 ? 'text-red-500' : 'text-slate-600'}`}>{day}</span>
        </div>
      ))}
    </div>
  );
};

export default function GuestCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [viewType, setViewType] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    const unsubSub = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'submissions'));

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'rooms'));

    return () => {
      unsubSub();
      unsubRooms();
    };
  }, []);

  const handleNext = () => {
    if (viewType === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewType === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handlePrev = () => {
    if (viewType === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewType === 'week') setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const rows: React.ReactNode[] = [];

    calendarDays.forEach((day, index) => {
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isSelected = isToday(day);
      const isPastDay = isBefore(day, startOfDay(new Date()));
      const isSunday = day.getDay() === 0;
      const isSaturday = day.getDay() === 6;
      
      const checkInGuests = submissions.filter(sub => isSameDay(parseISO(sub.checkInDate), day) && sub.status === 'approved');
      const checkOutGuests = submissions.filter(sub => isSameDay(parseISO(sub.checkOutDate), day) && sub.status === 'approved');
      
      const hasCheckIn = checkInGuests.length > 0;
      const hasCheckOut = checkOutGuests.length > 0;
      
      let badgeColor = '';
      if (hasCheckIn && hasCheckOut) badgeColor = 'bg-amber-500';
      else if (hasCheckIn) badgeColor = 'bg-blue-500';
      else if (hasCheckOut) badgeColor = 'bg-emerald-500';

      const totalActive = checkInGuests.length + checkOutGuests.length;

      rows.push(
        <div
          key={day.toString()}
          className={`
            min-h-[140px] p-2 border-r border-b border-slate-100 transition-all duration-200 hover:bg-slate-50 relative
            ${isPastDay ? 'bg-slate-100/60' : !isCurrentMonth ? 'bg-slate-50/40' : 'bg-white'}
          `}
        >
          <div className="flex flex-col items-center">
            <div className={`
              w-9 h-9 flex items-center justify-center rounded-full text-base font-bold mb-1
              ${isSelected ? 'bg-primary text-white shadow-lg' : isSunday || isSaturday ? 'text-red-500' : 'text-slate-900'}
              ${!isCurrentMonth && !isSelected ? 'text-slate-300' : ''}
              ${isPastDay && !isSelected ? 'text-slate-400 opacity-60' : ''}
            `}>
              {format(day, 'd')}
            </div>
            
            {totalActive > 0 && (
              <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold text-white mb-2 ${badgeColor}`}>
                {totalActive}
              </div>
            )}
            
            <div className="flex gap-1 mb-2">
              {hasCheckIn && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
              {hasCheckOut && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
            </div>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[70px] no-scrollbar">
            {checkInGuests.map((sub, i) => (
              <div key={`in-${i}`} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded truncate border border-blue-100">
                {sub.guestName || sub.guestNames?.[0] || 'Unknown'}
              </div>
            ))}
            {checkOutGuests.map((sub, i) => (
              <div key={`out-${i}`} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded truncate border border-emerald-100">
                {sub.guestName || sub.guestNames?.[0] || 'Unknown'}
              </div>
            ))}
          </div>
        </div>
      );
    });

    return (
      <div className="mt-6 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <DayLabels />
        <div className="grid grid-cols-7 border-l border-t border-slate-100 rounded-lg overflow-hidden">{rows}</div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return (
      <div className="mt-6 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/10">
          {days.map((day, i) => (
            <div key={i} className="py-6 text-center border-r last:border-0 border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">{format(day, 'EEE', { locale: id })}</p>
              <div className={`w-10 h-10 mx-auto flex items-center justify-center rounded-full text-lg font-bold ${isToday(day) ? 'bg-primary text-white shadow-md' : 'text-slate-900'}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-slate-100 h-[400px]">
          {days.map((day) => {
            const isPastDay = isBefore(day, startOfDay(new Date()));
            const checkInGuests = submissions.filter(sub => isSameDay(parseISO(sub.checkInDate), day) && sub.status === 'approved');
            const checkOutGuests = submissions.filter(sub => isSameDay(parseISO(sub.checkOutDate), day) && sub.status === 'approved');
            return (
              <div key={day.toString()} className={`p-4 space-y-3 transition-colors overflow-y-auto no-scrollbar ${isPastDay ? 'bg-slate-100/60' : 'bg-white hover:bg-slate-50'}`}>
                {checkInGuests.map((sub, i) => (
                  <div key={`in-${i}`} className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-[9px] font-bold text-blue-600 uppercase">Check-in</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">{sub.guestName || sub.guestNames?.[0]}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Kamar: {rooms.find(r => r.id === sub.roomId)?.number || '-'}</p>
                  </div>
                ))}
                {checkOutGuests.map((sub, i) => (
                  <div key={`out-${i}`} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-[9px] font-bold text-emerald-600 uppercase">Check-out</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">{sub.guestName || sub.guestNames?.[0]}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Kamar: {rooms.find(r => r.id === sub.roomId)?.number || '-'}</p>
                  </div>
                ))}
                {checkInGuests.length === 0 && checkOutGuests.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 py-10">
                    <CalendarIcon size={24} className="text-slate-300 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kosong</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const checkInGuests = submissions.filter(sub => isSameDay(parseISO(sub.checkInDate), currentDate) && sub.status === 'approved');
    const checkOutGuests = submissions.filter(sub => isSameDay(parseISO(sub.checkOutDate), currentDate) && sub.status === 'approved');

    return (
      <div className="mt-6 border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white min-h-[400px]">
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <LogIn size={20} />
              </div>
              <h4 className="font-bold text-slate-900">Check-in Hari Ini ({checkInGuests.length})</h4>
            </div>
            {checkInGuests.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Tidak ada check-in hari ini</p>
            ) : (
              <div className="space-y-3">
                {checkInGuests.map((sub, i) => (
                  <Card key={i} className="p-4 border-slate-100 hover:border-blue-200 transition-colors shadow-none bg-slate-50/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900">{sub.guestName || sub.guestNames?.[0]}</p>
                        <p className="text-xs text-slate-500 mt-1">{sub.company} • Kamar {rooms.find(r => r.id === sub.roomId)?.number || '-'}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 border-none font-bold">PAX {sub.guestCount}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <LogOut size={20} />
              </div>
              <h4 className="font-bold text-slate-900">Check-out Hari Ini ({checkOutGuests.length})</h4>
            </div>
            {checkOutGuests.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Tidak ada check-out hari ini</p>
            ) : (
              <div className="space-y-3">
                {checkOutGuests.map((sub, i) => (
                  <Card key={i} className="p-4 border-slate-100 hover:border-emerald-200 transition-colors shadow-none bg-slate-50/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900">{sub.guestName || sub.guestNames?.[0]}</p>
                        <p className="text-xs text-slate-500 mt-1">{sub.company} • Kamar {rooms.find(r => r.id === sub.roomId)?.number || '-'}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold">PAX {sub.guestCount}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSummarySidebar = () => {
    const stats = [
      { label: 'Check-in', value: submissions.filter(s => isSameMonth(parseISO(s.checkInDate), currentDate) && s.status === 'approved').length, color: 'bg-blue-50', iconColor: 'text-blue-500', icon: LogIn, subtitle: 'Tamu akan datang' },
      { label: 'Check-out', value: submissions.filter(s => isSameMonth(parseISO(s.checkOutDate), currentDate) && s.status === 'approved').length, color: 'bg-emerald-50', iconColor: 'text-emerald-500', icon: LogOut, subtitle: 'Tamu akan pulang' },
      { label: 'Menginap', value: submissions.filter(s => s.status === 'approved' && parseISO(s.checkInDate) <= new Date() && parseISO(s.checkOutDate) >= new Date()).length, color: 'bg-amber-50', iconColor: 'text-amber-500', icon: Users, subtitle: 'Tamu sedang menginap' },
    ];

    return (
      <div className="space-y-6">
        <Card className="p-6 border-slate-200 shadow-sm rounded-2xl bg-white">
          <h4 className="text-lg font-bold text-slate-800 mb-6">Ringkasan Bulan Ini</h4>
          <div className="space-y-4">
            {stats.map((stat, i) => (
              <div key={i} className={`p-4 rounded-xl flex items-center gap-4 ${stat.color}`}>
                <div className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center ${stat.iconColor}`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900 leading-none my-1">{stat.value}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{stat.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-slate-200 shadow-sm rounded-2xl bg-white">
          <h4 className="text-lg font-bold text-slate-800 mb-6">Keterangan</h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0"></div>
              <div>
                <p className="text-xs font-bold text-slate-800">Check-in</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Tamu akan datang sesuai tanggal check-in</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
              <div>
                <p className="text-xs font-bold text-slate-800">Check-out</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Tamu akan pulang sesuai tanggal check-out</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 shrink-0"></div>
              <div>
                <p className="text-xs font-bold text-slate-800">Check-in & Check-out</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Tamu datang dan pulang di hari yang sama</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderTodayArrivals = () => {
    const today = new Date();
    const todayArrivals = submissions.filter(sub => isSameDay(parseISO(sub.checkInDate), today));
    
    return (
      <div className="mt-12 space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            Kedatangan Hari Ini – {format(today, 'd MMMM yyyy', { locale: id })}
          </h3>
          <Button variant="ghost" className="text-primary font-bold gap-2 text-sm hover:bg-primary/5">
            Lihat Semua
            <ExternalLink size={16} />
          </Button>
        </div>
        
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white border-b border-slate-100">
                  <TableHead className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tight">Waktu Check-in</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tight">Nama Tamu</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tight">Pengaju</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tight">Kamar</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tight">Tujuan</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tight text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayArrivals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-slate-400 font-medium italic">
                      Belum ada kedatangan tamu untuk hari ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  todayArrivals.map((sub) => {
                    const room = rooms.find(r => r.id === sub.roomId);
                    return (
                      <TableRow key={sub.id} className="hover:bg-slate-50 transition-colors border-b last:border-0">
                        <TableCell className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-900">{sub.estimatedArrivalTime || '-'}</span>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <p className="font-bold text-primary text-sm tracking-tight">{sub.guestName || sub.guestNames?.[0]}</p>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <p className="text-sm text-slate-700 font-medium">{sub.company}</p>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold px-3">
                            {room ? room.number : '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <p className="text-sm text-slate-700 font-medium">{sub.purpose}</p>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <Badge className="bg-blue-50 text-blue-600 border-none px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                            Akan Datang
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="bg-blue-50/50 p-4 border-t border-blue-100/50 flex items-center gap-3">
             <Info size={18} className="text-blue-500" />
             <p className="text-xs text-blue-600 font-medium">Data diperbarui otomatis setiap 5 menit</p>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="pb-12 space-y-8">
      <PageHeader />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-9">
          <Card className="p-8 border border-slate-200 shadow-sm rounded-3xl bg-white relative overflow-hidden">
            <CalendarHeader 
              currentDate={currentDate}
              handlePrev={handlePrev}
              handleNext={handleNext}
              goToToday={goToToday}
              viewType={viewType}
              setViewType={setViewType}
              setCurrentDate={setCurrentDate}
            />
            
            {viewType === 'month' && renderMonthView()}
            {viewType === 'week' && renderWeekView()}
            {viewType === 'day' && renderDayView()}

            <div className="mt-8 flex items-center gap-10 px-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Check-in</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Check-out</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Check-in & Check-out</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {renderSummarySidebar()}
        </div>
      </div>

      {renderTodayArrivals()}
    </div>
  );
}
