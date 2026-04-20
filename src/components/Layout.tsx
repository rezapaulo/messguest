import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Bed, 
  Users, 
  LogOut, 
  PlusCircle,
  Menu,
  X,
  Settings,
  Calendar,
  LogIn,
  ShieldCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'user'] },
    { 
      label: profile?.role === 'admin' ? 'Pengajuan Tamu' : 'Pengajuan Saya', 
      icon: ClipboardList, 
      path: '/submissions', 
      roles: ['admin', 'user'] 
    },
    { label: 'Check-in/out', icon: LogIn, path: '/check-in-out', roles: ['admin'] },
    { label: 'APD Tamu', icon: ShieldCheck, path: '/ppe', roles: ['admin'] },
    { 
      label: 'Pengajuan Tamu', 
      icon: PlusCircle, 
      path: '/apply', 
      roles: ['user'] 
    },
    { label: 'Kamar', icon: Bed, path: '/rooms', roles: ['admin'] },
    { label: 'Kalender', icon: Calendar, path: '/calendar', roles: ['admin', 'user'] },
    { label: 'Pengguna', icon: Users, path: '/users', roles: ['admin'] },
    { label: 'Sistem', icon: Settings, path: '/system', roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  return (
    <div className="h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-card border-b p-4 flex items-center justify-between z-50">
        <h1 className="text-xl font-bold text-primary">MessGuest</h1>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-40 bg-sidebar text-sidebar-foreground w-64 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-8 border-b border-sidebar-border">
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white leading-none">Mess Stay</span>
              <span className="text-[10px] font-medium text-red-200/60 mt-1 uppercase tracking-wider">Sistem Tamu Mess</span>
            </div>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium
                    ${isActive 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'}
                  `}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto p-6 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm shadow-lg shadow-primary/20">
                {profile?.displayName?.[0] || profile?.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-accent-foreground truncate">{profile?.displayName || 'User'}</p>
                <p className="text-[10px] text-sidebar-foreground uppercase tracking-wider font-medium">{profile?.role}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors px-4"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span className="text-sm">Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSok7CKFaya_advdwAVotQQiJZFIzr5RhDXUQ&s" 
              alt="PPA Logo" 
              className="h-10 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="hidden sm:block">
              <h2 className="text-sm font-bold text-slate-800 leading-tight">PT Putra Perkasa Abadi</h2>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Guest Management System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-900">{profile?.displayName || profile?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{profile?.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
              {profile?.displayName?.[0] || profile?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
