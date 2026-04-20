import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Home, 
  FileText, 
  ShieldCheck, 
  Bell,
  UserCog
} from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';

export default function LoginPage() {
  const { user, login, loginWithGoogle, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>;
  
  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Username dan password harus diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username, password);
      toast.success('Berhasil masuk!');
    } catch (error: any) {
      let message = 'Gagal masuk. Periksa username dan password Anda.';
      if (error.code === 'auth/wrong-password') message = 'Password salah.';
      if (error.code === 'auth/user-not-found') message = 'Username tidak ditemukan.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      toast.success('Berhasil masuk dengan Google!');
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error('Gagal masuk dengan Google. Pastikan provider diaktifkan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <Card className="max-w-5xl w-full border-none shadow-2xl overflow-hidden rounded-3xl flex flex-col md:flex-row min-h-[600px]">
        {/* Left Side: Branding & Features */}
        <div className="md:w-5/12 bg-gradient-to-br from-red-600 to-red-800 p-10 text-white flex flex-col relative overflow-hidden">
          {/* Background Image Overlay */}
          <div className="absolute inset-0 opacity-20">
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSok7CKFaya_advdwAVotQQiJZFIzr5RhDXUQ&s" 
              alt="Building" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex flex-col items-center mb-12">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4 overflow-hidden p-2">
                <img 
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSok7CKFaya_advdwAVotQQiJZFIzr5RhDXUQ&s" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-4xl font-black tracking-tight">Mess Stay</h1>
              <p className="text-red-100 text-sm font-medium mt-1">Sistem Pengajuan Tamu Menginap</p>
            </div>

            <div className="space-y-8 mt-auto">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Pengajuan Mudah</h3>
                  <p className="text-red-100 text-sm leading-relaxed">Ajukan permintaan tamu menginap dengan cepat dan praktis</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Aman & Terpercaya</h3>
                  <p className="text-red-100 text-sm leading-relaxed">Data terjaga keamanannya dengan sistem yang terpercaya</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Notifikasi Real-time</h3>
                  <p className="text-red-100 text-sm leading-relaxed">Dapatkan informasi status pengajuan secara real-time</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="md:w-7/12 bg-white p-10 md:p-16 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-800">Selamat Datang!</h2>
              <p className="text-slate-500 mt-2">Silakan masuk untuk melanjutkan</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-bold text-slate-700">Username</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <User size={18} />
                  </div>
                  <Input 
                    id="username"
                    type="text"
                    placeholder="Masukkan username"
                    className="pl-11 h-12 rounded-xl border-slate-200 focus:ring-red-500"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-bold text-slate-700">Password</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <Input 
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    className="pl-11 pr-11 h-12 rounded-xl border-slate-200 focus:ring-red-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <label htmlFor="remember" className="text-sm font-medium text-slate-600 cursor-pointer">Ingat saya</label>
                </div>
                <button type="button" className="text-sm font-bold text-red-600 hover:text-red-700">Lupa password?</button>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? 'Memproses...' : 'Masuk'}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-slate-500 font-medium">atau</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl border-slate-200 text-slate-700 font-bold flex items-center justify-center gap-3 hover:bg-slate-50"
              disabled={isSubmitting}
              onClick={handleGoogleLogin}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Masuk dengan Google
            </Button>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">
                Tamu tanpa akun?{' '}
                <button 
                  onClick={() => window.location.href = '/guest-statement'}
                  className="text-primary font-bold hover:underline"
                >
                  Isi Pernyataan Tamu
                </button>
              </p>
            </div>

            <p className="text-center text-slate-400 text-xs mt-12">
              © 2026 Mess Stay. Semua hak dilindungi.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
