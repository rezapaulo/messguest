import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { db, auth, firebaseConfig, refreshFirebaseConnection } from '../lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { 
  Settings, 
  ShieldCheck, 
  Database, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export default function SystemSettings() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [lastChecked, setLastChecked] = useState<string>('');

  const checkConnection = async () => {
    setStatus('checking');
    try {
      // Try to fetch a non-existent doc from server to test connection
      await getDocFromServer(doc(db, '_system_', 'health'));
      setStatus('online');
      setLastChecked(new Date().toLocaleTimeString());
    } catch (error: any) {
      console.error('Connection check failed:', error);
      // If it's just "not found", it means we ARE connected to the server
      if (error.code === 'not-found' || (error.message && !error.message.includes('offline'))) {
        setStatus('online');
      } else {
        setStatus('offline');
      }
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleHardReset = async () => {
    setStatus('checking');
    const success = await refreshFirebaseConnection();
    if (success) {
      toast.success('Koneksi berhasil dipulihkan!');
      checkConnection();
    } else {
      toast.error('Gagal memulihkan koneksi secara otomatis.');
      setStatus('offline');
    }
  };

  const consoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Kontrol Sistem & Firebase</h2>
        <p className="text-slate-500 text-sm mt-1 font-medium">Pantau status koneksi dan konfigurasi database aplikasi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Status */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Database size={18} className="text-primary" />
                Status Koneksi Firebase
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={checkConnection} className="h-8 gap-1 text-xs">
                <RefreshCw size={14} className={status === 'checking' ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              {status === 'online' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} className="text-green-500" />
                  </div>
                  <h3 className="font-bold text-slate-900">Sistem Terhubung</h3>
                  <p className="text-xs text-slate-500 mt-1">Aplikasi berhasil berkomunikasi dengan Firebase Cloud</p>
                  <Badge className="mt-4 bg-green-500/10 text-green-600 hover:bg-green-500/10 border-none">
                    ONLINE
                  </Badge>
                </>
              ) : status === 'offline' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <AlertCircle size={32} className="text-red-500" />
                  </div>
                  <h3 className="font-bold text-slate-900">Koneksi Terputus</h3>
                  <p className="text-xs text-slate-500 mt-1">Gagal menghubungi server Firebase. Periksa koneksi internet.</p>
                  <Badge className="mt-4 bg-red-500/10 text-red-600 hover:bg-red-500/10 border-none">
                    OFFLINE
                  </Badge>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <RefreshCw size={32} className="text-slate-300 animate-spin mb-4" />
                  <p className="text-xs text-slate-500">Memeriksa koneksi...</p>
                </div>
              )}
              
              {lastChecked && (
                <div className="flex flex-col items-center gap-3 mt-6">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Terakhir dicek: {lastChecked}
                  </p>
                  {status === 'offline' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleHardReset}
                      className="h-9 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 gap-2 font-bold text-xs rounded-xl"
                    >
                      <RefreshCw size={14} className={status === 'checking' ? 'animate-spin' : ''} />
                      Hard Reset Koneksi
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Auth Configuration */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              Kontrol Autentikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Penting: Aktivasi Login</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Untuk mengaktifkan fitur <strong>Tambah Pengguna</strong> dan login dengan <strong>Username</strong>, 
                  Anda harus mengaktifkan metode "Email/Password" di Firebase Console.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project ID</label>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 font-mono text-xs text-slate-600">
                  {firebaseConfig.projectId}
                </div>
              </div>

              <Button 
                className="w-full h-12 bg-primary hover:bg-primary/90 gap-2 font-bold"
                onClick={() => window.open(consoleUrl, '_blank')}
              >
                <ExternalLink size={18} />
                Buka Firebase Console
              </Button>
              
              <p className="text-[10px] text-center text-slate-400 italic">
                *Klik tombol di atas untuk mengaktifkan Email/Password secara manual.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Info */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Settings size={18} className="text-primary" />
            Detail Konfigurasi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Database ID</p>
              <p className="text-xs font-medium text-slate-700 truncate">{firebaseConfig.firestoreDatabaseId}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auth Domain</p>
              <p className="text-xs font-medium text-slate-700 truncate">{firebaseConfig.authDomain}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage Bucket</p>
              <p className="text-xs font-medium text-slate-700 truncate">{firebaseConfig.storageBucket}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
