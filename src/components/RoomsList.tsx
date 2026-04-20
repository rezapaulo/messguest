import React, { useEffect, useState, useMemo } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Room } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Bed, 
  CheckCircle2, 
  Clock, 
  Settings, 
  Users,
  Bell,
  Building2,
  Info
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function RoomsList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({ 'Mess Derawan': true, 'Mess Mandalika': true, 'Mess Kakaban': true });

  const [newRoom, setNewRoom] = useState({ 
    number: '', 
    capacity: 2, 
    status: 'available' as const,
    building: '',
    floor: '-'
  });
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return { 
          id: doc.id, 
          ...d,
          building: d.building || 'Gedung A',
          floor: d.floor || '-'
        } as Room;
      });
      setRooms(data.sort((a, b) => a.number.localeCompare(b.number)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'rooms'));

    return () => unsub();
  }, []);

  const handleAddRoom = async () => {
    try {
      const qty = newRoom.capacity || 1;
      const prefix = newRoom.number || '';
      
      // Bulk create rooms/beds based on capacity
      const promises = Array.from({ length: qty }).map((_, i) => {
        const roomNumber = qty > 1 ? `${prefix}${i + 1}` : prefix;
        return addDoc(collection(db, 'rooms'), {
          ...newRoom,
          number: roomNumber,
          capacity: 1, // Each generated unit is for 1 person
        });
      });

      await Promise.all(promises);
      
      toast.success(`${qty} Kamar/Bed berhasil ditambahkan`);
      setIsAddOpen(false);
      setNewRoom({ number: '', capacity: 1, status: 'available', building: '', floor: '-' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rooms');
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom) return;
    try {
      const { id, ...data } = editingRoom;
      await updateDoc(doc(db, 'rooms', id), data);
      toast.success('Data kamar berhasil diperbarui');
      setIsEditOpen(false);
      setEditingRoom(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${editingRoom?.id}`);
    }
  };

  const handleDelete = async () => {
    if (!roomToDelete) return;
    try {
      await deleteDoc(doc(db, 'rooms', roomToDelete));
      toast.success('Kamar berhasil dihapus');
      setIsDeleteOpen(false);
      setRoomToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rooms/${roomToDelete}`);
    }
  };

  const stats = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter(r => r.status === 'available').length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    const maintenance = rooms.filter(r => r.status === 'maintenance').length;

    return {
      total,
      available,
      occupied,
      maintenance,
      availablePct: total ? Math.round((available / total) * 100) : 0,
      occupiedPct: total ? Math.round((occupied / total) * 100) : 0,
      maintenancePct: total ? Math.round((maintenance / total) * 100) : 0,
    };
  }, [rooms]);

  const chartData = [
    { name: 'Tersedia', value: stats.available, color: '#10B981' },
    { name: 'Terisi', value: stats.occupied, color: '#F59E0B' },
    { name: 'Maintenance', value: stats.maintenance, color: '#8B5CF6' },
  ];

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch = room.number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBuilding = filterBuilding === 'all' || room.building === filterBuilding;
      const matchesStatus = filterStatus === 'all' || room.status === filterStatus;
      return matchesSearch && matchesBuilding && matchesStatus;
    });
  }, [rooms, searchQuery, filterBuilding, filterStatus]);

  const groupedRooms = useMemo(() => {
    const groups: Record<string, Room[]> = {};
    filteredRooms.forEach(room => {
      if (!groups[room.building]) groups[room.building] = [];
      groups[room.building].push(room);
    });
    return groups;
  }, [filteredRooms]);

  const toggleBuilding = (building: string) => {
    setExpandedBuildings(prev => ({ ...prev, [building]: !prev[building] }));
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Kamar</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Kelola data kamar dan lihat ketersediaan kamar mess.</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 gap-2 font-bold h-11 px-6 rounded-xl transition-all active:scale-95">
                <Plus size={18} />
                Tambah Kamar
              </Button>
            } />
            <DialogContent className="rounded-3xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Tambah Kamar Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Nama Mess</Label>
                  <Input 
                    placeholder="Contoh: Mess Derawan" 
                    className="h-11 rounded-xl border-slate-200"
                    value={newRoom.building} 
                    onChange={e => setNewRoom({...newRoom, building: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Nomor Kamar / Prefix</Label>
                  <Input 
                    placeholder="Contoh: A10" 
                    className="h-11 rounded-xl border-slate-200"
                    value={newRoom.number} 
                    onChange={e => setNewRoom({...newRoom, number: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Kapasitas (Jumlah Bed)</Label>
                    <Input 
                      type="number" 
                      className="h-11 rounded-xl border-slate-200"
                      value={newRoom.capacity} 
                      onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Status</Label>
                    <Select value={newRoom.status} onValueChange={(v: any) => setNewRoom({...newRoom, status: v})}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Tersedia</SelectItem>
                        <SelectItem value="occupied">Terisi</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl font-bold">Batal</Button>
                <Button onClick={handleAddRoom} disabled={!newRoom.number} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold px-8">Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Bed size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Kamar</p>
              <h3 className="text-xl font-black text-slate-900">{stats.total}</h3>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Semua kamar</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tersedia</p>
              <h3 className="text-xl font-black text-slate-900">{stats.available}</h3>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">{stats.availablePct}% dari total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terisi</p>
              <h3 className="text-xl font-black text-slate-900">{stats.occupied}</h3>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">{stats.occupiedPct}% dari total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Settings size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Maintenance</p>
              <h3 className="text-xl font-black text-slate-900">{stats.maintenance}</h3>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">{stats.maintenancePct}% dari total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main List Area */}
        <div className="lg:col-span-9 space-y-4">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 px-6 py-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <CardTitle className="text-base font-bold text-slate-800">Daftar Kamar</CardTitle>
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                    <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-100 bg-slate-50/50 text-xs font-bold">
                      <SelectValue placeholder="Semua Gedung" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Gedung</SelectItem>
                      {Array.from(new Set(rooms.map(r => r.building))).map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-100 bg-slate-50/50 text-xs font-bold">
                      <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="available">Tersedia</SelectItem>
                      <SelectItem value="occupied">Terisi</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <Input 
                      placeholder="Cari nomor kamar..." 
                      className="pl-9 h-10 w-[200px] rounded-xl border-slate-100 bg-slate-50/50 text-xs"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {Object.keys(groupedRooms).length === 0 ? (
                <div className="text-center py-16 text-slate-400 font-medium italic">
                  Tidak ada kamar yang ditemukan.
                </div>
              ) : (
                (Object.entries(groupedRooms) as [string, Room[]][]).map(([building, buildingRooms]) => (
                  <div key={building} className="space-y-4">
                    <button 
                      onClick={() => toggleBuilding(building)}
                      className="flex items-center gap-3 w-full text-left group border-b border-slate-50 pb-3"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <Building2 size={14} />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">{building}</span>
                      <div className="ml-auto flex items-center gap-4">
                        {expandedBuildings[building] ? <ChevronDown size={16} className="text-slate-300" /> : <ChevronRight size={16} className="text-slate-300" />}
                      </div>
                    </button>

                    {expandedBuildings[building] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-3">
                        {buildingRooms.map(room => (
                          <div 
                            key={room.id}
                            className={`relative group p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                              room.status === 'available' ? 'bg-white border-emerald-100/30' :
                              room.status === 'occupied' ? 'bg-white border-amber-100/30' :
                              'bg-white border-purple-100/30'
                            }`}
                            onClick={() => {
                              setEditingRoom(room);
                              setIsEditOpen(true);
                            }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-lg font-bold tracking-tight ${
                                room.status === 'available' ? 'text-emerald-500' :
                                room.status === 'occupied' ? 'text-amber-500' :
                                'text-purple-500'
                              }`}>{room.number}</span>
                            </div>
                            
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${
                              room.status === 'available' ? 'bg-emerald-50 text-emerald-600' :
                              room.status === 'occupied' ? 'bg-amber-50 text-amber-600' :
                              'bg-purple-50 text-purple-600'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                room.status === 'available' ? 'bg-emerald-500' :
                                room.status === 'occupied' ? 'bg-amber-500' :
                                'bg-purple-500'
                              }`}></div>
                              <span className="text-[9px] font-bold">
                                {room.status === 'available' ? 'Tersedia' : 
                                 room.status === 'occupied' ? 'Terisi' : 'Maintenance'}
                              </span>
                            </div>
                            
                            {room.status === 'occupied' && (
                              <div className="absolute bottom-3 right-3 text-amber-500">
                                <Users size={16} />
                              </div>
                            )}

                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-lg bg-white shadow-sm hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRoomToDelete(room.id);
                                  setIsDeleteOpen(true);
                                }}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Donut Chart */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="px-5 pt-5 pb-0">
              <CardTitle className="text-xs font-bold text-slate-800">Ringkasan Ketersediaan</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-[160px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                  <span className="text-xl font-black text-slate-900 leading-none">{stats.total}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Kamar</span>
                </div>
              </div>
              <div className="space-y-2 mt-2">
                {chartData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[10px] font-bold text-slate-600">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-900">
                      {item.value} <span className="text-[8px] font-bold text-slate-400">({stats.total ? Math.round((item.value / stats.total) * 100) : 0}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Room Info Placeholder */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="px-5 pt-5 pb-0">
              <CardTitle className="text-xs font-bold text-slate-800">Informasi Kamar</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Bed size={24} className="text-slate-200" />
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Pilih kamar untuk melihat detail informasi seperti fasilitas, riwayat penggunaan, dan tamu yang menginap.
              </p>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="px-5 pt-5 pb-0">
              <CardTitle className="text-xs font-bold text-slate-800">Legenda Status</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <CheckCircle2 size={10} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-700">Tersedia</p>
                  <p className="text-[8px] text-slate-400">Kamar siap digunakan</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0">
                  <Users size={10} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-700">Terisi</p>
                  <p className="text-[8px] text-slate-400">Sedang digunakan tamu</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-white shrink-0">
                  <Settings size={10} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-700">Maintenance</p>
                  <p className="text-[8px] text-slate-400">Dalam perawatan</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Room Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Data Kamar</DialogTitle>
          </DialogHeader>
          {editingRoom && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Nama Mess</Label>
                <Input 
                  placeholder="Contoh: Mess Derawan" 
                  className="h-11 rounded-xl border-slate-200"
                  value={editingRoom.building} 
                  onChange={e => setEditingRoom({...editingRoom, building: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Nomor Kamar</Label>
                <Input 
                  placeholder="Contoh: A101" 
                  className="h-11 rounded-xl border-slate-200"
                  value={editingRoom.number} 
                  onChange={e => setEditingRoom({...editingRoom, number: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Kapasitas</Label>
                  <Input 
                    type="number" 
                    className="h-11 rounded-xl border-slate-200"
                    value={editingRoom.capacity} 
                    onChange={e => setEditingRoom({...editingRoom, capacity: parseInt(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Status</Label>
                  <Select value={editingRoom.status} onValueChange={(v: any) => setEditingRoom({...editingRoom, status: v})}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Tersedia</SelectItem>
                      <SelectItem value="occupied">Terisi</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-xl font-bold">Batal</Button>
            <Button onClick={handleUpdateRoom} disabled={!editingRoom?.number} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold px-8">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="rounded-3xl max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-center font-bold">Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-slate-600 font-medium">Yakin untuk menghapus kamar ini?</p>
            <p className="text-xs text-slate-400 mt-2">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <DialogFooter className="flex-row gap-3 sm:justify-center">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteOpen(false)} 
              className="flex-1 h-11 rounded-xl font-bold"
            >
              No (Batal)
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              className="flex-1 h-11 rounded-xl font-bold bg-red-600 hover:bg-red-700"
            >
              Yes (Hapus)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-center text-slate-400 text-[9px] mt-6">
        © 2026 Mess Stay. Semua hak dilindungi.
      </p>
    </div>
  );
}
