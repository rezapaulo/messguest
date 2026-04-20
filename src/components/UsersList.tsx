import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '../lib/firebase';

export default function UsersList() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    displayName: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setUsers(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => unsub();
  }, []);

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      toast.success('Peran pengguna diperbarui');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      toast.success('Pengguna berhasil dihapus');
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userToDelete.uid}`);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username || !newUserData.password || !newUserData.displayName) {
      toast.error('Semua field harus diisi');
      return;
    }

    setIsSubmitting(true);
    const secondaryAppName = `Secondary-${Date.now()}`;
    let secondaryApp;
    
    try {
      // Use a secondary app instance to create the user without signing out the admin
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const email = `${newUserData.username.toLowerCase()}@messguest.local`;
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newUserData.password);
      const newUser = userCredential.user;

      // Create profile in Firestore
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: email,
        displayName: newUserData.displayName,
        role: newUserData.role,
        password: newUserData.password
      });

      toast.success('Pengguna berhasil ditambahkan');
      setIsAddOpen(false);
      setNewUserData({ username: '', displayName: '', password: '', role: 'user' });
    } catch (error: any) {
      console.error('Error adding user:', error);
      let message = 'Gagal menambahkan pengguna';
      let description = error.message;

      if (error.code === 'auth/email-already-in-use') message = 'Username sudah digunakan';
      if (error.code === 'auth/weak-password') message = 'Password terlalu lemah (minimal 6 karakter)';
      if (error.code === 'auth/operation-not-allowed') {
        message = 'Metode Email/Password belum diaktifkan';
        description = 'Silakan aktifkan Email/Password di Firebase Console > Authentication > Sign-in method.';
      }
      if (error.message && error.message.includes('permission-denied')) message = 'Akses ditolak. Pastikan Anda memiliki hak akses Admin.';
      
      toast.error(message, {
        description: description
      });
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Pengguna</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Kelola hak akses dan peran pengguna dalam sistem</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2 font-semibold">
              <UserPlus size={18} />
              Tambah Pengguna
            </Button>
          } />
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-5 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Username</Label>
                <Input 
                  placeholder="Contoh: budi, staff01" 
                  className="h-11 border-slate-200"
                  value={newUserData.username}
                  onChange={e => setNewUserData({...newUserData, username: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Lengkap</Label>
                <Input 
                  placeholder="Nama tampilan pengguna" 
                  className="h-11 border-slate-200"
                  value={newUserData.displayName}
                  onChange={e => setNewUserData({...newUserData, displayName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</Label>
                <Input 
                  type="text"
                  placeholder="Minimal 6 karakter" 
                  className="h-11 border-slate-200"
                  value={newUserData.password}
                  onChange={e => setNewUserData({...newUserData, password: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Peran</Label>
                <Select 
                  value={newUserData.role} 
                  onValueChange={(v: any) => setNewUserData({...newUserData, role: v})}
                >
                  <SelectTrigger className="h-11 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (Staff)</SelectItem>
                    <SelectItem value="admin">Admin (HCGA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddOpen(false)}
                  className="h-11 font-semibold"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="h-11 bg-primary font-semibold min-w-[120px]"
                >
                  {isSubmitting ? 'Memproses...' : 'Simpan User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Pengguna</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username / Email</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peran</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.uid} className="hover:bg-slate-50/30 transition-colors group">
                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                        {user.displayName?.[0] || user.email[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{user.displayName || 'User'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <span className="text-xs text-slate-600 font-medium">{user.email.split('@')[0]}</span>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <span className="text-xs font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                      {user.password || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select 
                        value={user.role} 
                        onValueChange={(v: any) => handleRoleChange(user.uid, v)}
                      >
                        <SelectTrigger className="h-9 w-[120px] text-xs font-bold border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Apakah Anda yakin ingin menghapus pengguna <span className="font-bold text-slate-900">{userToDelete?.displayName || userToDelete?.email}</span>? 
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <p className="text-xs text-slate-400 mt-4 italic">
              *Catatan: Ini hanya menghapus profil pengguna dari database, akun autentikasi mungkin tetap ada.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-11 font-semibold"
            >
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              className="h-11 font-semibold bg-red-600 hover:bg-red-700"
            >
              Hapus Pengguna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
