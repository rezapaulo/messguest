import React, { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Submission } from '../types';

interface Notification {
  id: string;
  message: string;
  time: Date;
  read: boolean;
  subId: string;
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Listen for pending submissions to create "notifications"
    // In a real app, you might have a dedicated notifications collection, 
    // but here we derive it from pending submissions as requested in earlier steps.
    const q = query(
      collection(db, 'submissions'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      
      const derivedNotifications = data
        .filter(sub => sub.status === 'pending')
        .map(sub => ({
          id: `notif-${sub.id}`,
          message: `Pengajuan baru dari ${sub.guestName || sub.guestNames?.[0] || 'Tamu'}`,
          time: sub.createdAt ? new Date(sub.createdAt) : new Date(),
          read: false, // In a purely derived local state, this won't persist across reloads
          subId: sub.id
        }));
      
      setNotifications(derivedNotifications);
    }, (error) => {
      // Silently handle list errors for notifications to not disrupt the main UI
      console.error("Notification sync error:", error);
    });

    return () => unsub();
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <Popover>
      <PopoverTrigger 
        render={
          <Button 
            variant="outline" 
            size="icon" 
            className="relative rounded-xl w-11 h-11 border-slate-200 text-slate-600 bg-white hover:bg-slate-50 shadow-sm"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-in zoom-in">
                {unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0 rounded-2xl shadow-xl border-slate-200 overflow-hidden" align="end">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-slate-900">Notifikasi</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] font-bold uppercase text-primary hover:bg-primary/5 h-7 px-2"
              onClick={markAllAsRead}
            >
              Tandai Semua Dibaca
            </Button>
          )}
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs font-medium">Tidak ada notifikasi baru</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group ${!notif.read ? 'bg-primary/5' : ''}`}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.read ? 'bg-primary' : 'bg-slate-200'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${!notif.read ? 'text-slate-900' : 'text-slate-500'}`}>{notif.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{format(notif.time, 'HH:mm • d MMM yyyy', { locale: id })}</p>
                  </div>
                  {!notif.read && (
                     <Check size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <Button variant="ghost" size="sm" className="w-full text-[11px] font-bold text-slate-500 hover:text-slate-700"> Lihat Semua Pengajuan </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
