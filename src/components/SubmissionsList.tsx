import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Submission, Room } from '../types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Check, 
  X, 
  Eye, 
  Trash2, 
  Bed, 
  Edit2,
  Copy,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SubmissionsList() {
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [subToDelete, setSubToDelete] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  const copyGuestLink = (id: string) => {
    const url = `${window.location.origin}/guest-statement/form/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link pernyataan tamu berhasil disalin!');
  };

  useEffect(() => {
    if (!profile) return;

    const submissionsRef = collection(db, 'submissions');
    const q = profile.role === 'admin' 
      ? query(submissionsRef)
      : query(submissionsRef, where('userUid', '==', profile.uid));

    const unsubSubmissions = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'submissions'));

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'rooms'));

    return () => {
      unsubSubmissions();
      unsubRooms();
    };
  }, [profile]);

  const handleApprove = async () => {
    if (!selectedSub || !selectedRoomId) return;

    try {
      // If it was already approved, free the old room first
      if (selectedSub.status === 'approved' && selectedSub.roomId) {
        await updateDoc(doc(db, 'rooms', selectedSub.roomId), {
          status: 'available'
        });
      }

      await updateDoc(doc(db, 'submissions', selectedSub.id), {
        status: 'approved',
        roomId: selectedRoomId
      });
      // Also update room status
      await updateDoc(doc(db, 'rooms', selectedRoomId), {
        status: 'occupied'
      });
      toast.success('Submission approved and room assigned');
      setIsApproveOpen(false);
      setIsEditStatusOpen(false);
      setSelectedSub(null);
      setSelectedRoomId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${selectedSub.id}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const subToReject = submissions.find(s => s.id === id);
      
      await updateDoc(doc(db, 'submissions', id), {
        status: 'rejected'
      });

      // If it was approved, free the room
      if (subToReject?.status === 'approved' && subToReject.roomId) {
        await updateDoc(doc(db, 'rooms', subToReject.roomId), {
          status: 'available'
        });
      }

      toast.success('Submission rejected');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${id}`);
    }
  };

  const handleDelete = async () => {
    if (!subToDelete) return;
    try {
      const subToDeleteObj = submissions.find(s => s.id === subToDelete);

      await deleteDoc(doc(db, 'submissions', subToDelete));

      // If it was approved, free the room
      if (subToDeleteObj?.status === 'approved' && subToDeleteObj.roomId) {
        await updateDoc(doc(db, 'rooms', subToDeleteObj.roomId), {
          status: 'available'
        });
      }

      toast.success('Pengajuan berhasil dihapus');
      setIsDeleteOpen(false);
      setSubToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `submissions/${subToDelete}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Approved</Badge>;
      case 'checked-in': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Staying</Badge>;
      case 'checked-out': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Finished</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejected</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>;
    }
  };

  const exportToExcel = () => {
    const dataToExport = submissions.map(sub => ({
      'Nama Tamu': sub.guestName || (Array.isArray(sub.guestNames) ? sub.guestNames.join(', ') : ''),
      'Perusahaan': sub.company,
      'Tujuan': sub.purpose,
      'Tipe Kamar': sub.roomType || '-',
      'Surat Tugas': sub.assignmentLetterUrl || '-',
      'Check-in': sub.checkInDate,
      'Check-out': sub.checkOutDate,
      'Jumlah Tamu': sub.guestCount,
      'Status': sub.status,
      'Pernyataan Tamu': sub.statementAccepted ? 'Sudah Disetujui' : 'Belum Disetujui',
      'Kamar': (() => {
        const r = rooms.find(rm => rm.id === sub.roomId);
        return r ? `${r.building} - ${r.number}` : '-';
      })(),
      'Tanggal Pengajuan': new Date(sub.createdAt).toLocaleString('id-ID')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
    XLSX.writeFile(workbook, `Daftar_Pengajuan_Tamu_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('File Excel berhasil diunduh');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Daftar Pengajuan Tamu", 14, 15);
    
    const tableBody = submissions.map(sub => [
      sub.guestName || (Array.isArray(sub.guestNames) ? sub.guestNames.join(', ') : ''),
      sub.company,
      sub.roomType || '-',
      sub.assignmentLetterUrl ? 'Ada' : 'Tidak Ada',
      sub.checkInDate,
      sub.checkOutDate,
      sub.status,
      sub.statementAccepted ? 'Signed' : 'Unsigned'
    ]);

    autoTable(doc, {
      head: [['Nama Tamu', 'Perusahaan', 'Tipe Kamar', 'Surat Tugas', 'Check-in', 'Check-out', 'Status', 'Pernyataan']],
      body: tableBody,
      startY: 20,
    });

    doc.save(`Daftar_Pengajuan_Tamu_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('File PDF berhasil diunduh');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {profile?.role === 'admin' ? 'Daftar Pengajuan Tamu' : 'Pengajuan Saya'}
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Kelola dan pantau status pengajuan tamu di sistem</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profile?.role === 'admin' && submissions.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportToExcel}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2 shadow-sm"
              >
                <FileSpreadsheet size={16} />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportToPDF}
                className="border-red-200 text-red-700 hover:bg-red-50 gap-2 shadow-sm"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          )}
          
          {profile?.role === 'user' && (
            <Link to="/apply">
              <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-6 font-semibold">
                Pengajuan Tamu
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamu / Perusahaan</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipe Kamar</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-in</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-out</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pernyataan</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">S. Tugas</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20 text-slate-400 font-medium italic">
                    Belum ada data pengajuan.
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-slate-50/30 transition-colors group">
                    <TableCell className="px-6 py-5">
                      <p className="font-bold text-slate-900 text-sm">
                        {sub.guestName || (Array.isArray(sub.guestNames) 
                          ? sub.guestNames.map((g: any) => typeof g === 'string' ? g : g.name).join(', ') 
                          : 'No names')}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">{sub.company}</p>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <p className="text-xs text-slate-600 font-bold">{sub.roomType || '-'}</p>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <p className="text-xs text-slate-600 font-semibold">
                        {new Date(sub.checkInDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <p className="text-xs text-slate-600 font-semibold">
                        {new Date(sub.checkOutDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      {sub.statementAccepted ? (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50 gap-1">
                          <Check size={10} /> Signed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200 gap-1">
                          <X size={10} /> Unsigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      {sub.assignmentLetterUrl ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-3"
                          onClick={() => window.open(sub.assignmentLetterUrl, '_blank')}
                        >
                          <FileText size={14} />
                          File
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-medium italic">Tidak ada</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        sub.status === 'approved' ? 'bg-blue-100 text-blue-700' : 
                        sub.status === 'checked-in' ? 'bg-emerald-100 text-emerald-700' :
                        sub.status === 'checked-out' ? 'bg-slate-100 text-slate-700' :
                        sub.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {sub.status === 'approved' ? 'Approved' : sub.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100" onClick={() => { setSelectedSub(sub); setIsViewOpen(true); }}>
                        <Eye size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
                      </Button>
                      {profile?.role === 'admin' && sub.status === 'pending' && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-50" onClick={() => { setSelectedSub(sub); setIsApproveOpen(true); }}>
                            <Check size={16} className="text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50" onClick={() => handleReject(sub.id)}>
                            <X size={16} className="text-red-600" />
                          </Button>
                        </>
                      )}
                      {profile?.role === 'admin' && sub.status === 'approved' && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-50" onClick={() => copyGuestLink(sub.id)}>
                            <Copy size={16} className="text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-50" onClick={() => { setSelectedSub(sub); setSelectedRoomId(sub.roomId || ''); setIsEditStatusOpen(true); }}>
                            <Edit2 size={16} className="text-amber-600" />
                          </Button>
                        </>
                      )}
                      {profile?.role === 'admin' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50" onClick={() => {
                          setSubToDelete(sub.id);
                          setIsDeleteOpen(true);
                        }}>
                          <Trash2 size={16} className="text-slate-300 hover:text-red-600 transition-colors" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>Full information about the guest request.</DialogDescription>
          </DialogHeader>
          {selectedSub && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-slate-500">Guest Name(s)</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedSub.guestName ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {selectedSub.guestName}
                      </Badge>
                    ) : (
                      selectedSub.guestNames?.map((name, i) => (
                        <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-700">
                          {name}
                        </Badge>
                      )) || <p className="font-medium text-sm">No names</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-500">Company</Label>
                  <p className="font-medium">{selectedSub.company}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Tipe Kamar</Label>
                  <p className="font-medium">{selectedSub.roomType || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Check-in</Label>
                  <p className="font-medium">{new Date(selectedSub.checkInDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Check-out</Label>
                  <p className="font-medium">{new Date(selectedSub.checkOutDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Guest Count</Label>
                  <p className="font-medium">{selectedSub.guestCount}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Status</Label>
                  <div>{getStatusBadge(selectedSub.status)}</div>
                </div>
                <div>
                  <Label className="text-slate-500">Pernyataan Tamu</Label>
                  <div className="mt-1">
                    {selectedSub.statementAccepted ? (
                      <div className="flex flex-col">
                        <Badge className="bg-emerald-100 text-emerald-700 w-fit">Sudah Disetujui</Badge>
                        {selectedSub.statementAcceptedAt && (
                          <span className="text-[10px] text-slate-400 mt-1 font-medium">
                            Pada: {new Date(selectedSub.statementAcceptedAt).toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-slate-400">Belum Disetujui</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-slate-500">Purpose</Label>
                <p className="text-sm bg-slate-50 p-3 rounded-lg mt-1">{selectedSub.purpose}</p>
              </div>
              {selectedSub.roomId && (
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
                  <Bed size={18} />
                  <span className="font-semibold">
                    Assigned Room: {(() => {
                      const r = rooms.find(rm => rm.id === selectedSub.roomId);
                      return r ? `${r.building} (${r.number})` : selectedSub.roomId;
                    })()}
                  </span>
                </div>
              )}
              {selectedSub.assignmentLetterUrl && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Surat Tugas</p>
                      <p className="text-[10px] text-slate-500 font-medium">Dokumen Terlampir</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-1.5 text-xs font-bold text-primary border-primary/20 hover:bg-primary/5 shadow-none"
                    onClick={() => window.open(selectedSub.assignmentLetterUrl, '_blank')}
                  >
                    <ExternalLink size={14} />
                    Lihat File
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveOpen || isEditStatusOpen} onOpenChange={(open) => {
        if (!open) {
          setIsApproveOpen(false);
          setIsEditStatusOpen(false);
          setSelectedSub(null);
          setSelectedRoomId('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditStatusOpen ? 'Edit Status / Kamar' : 'Approve Submission'}</DialogTitle>
            <DialogDescription>
              {isEditStatusOpen 
                ? 'Ubah alokasi kamar untuk pengajuan ini.' 
                : 'Assign a room to complete the approval.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Room</Label>
              <Select onValueChange={setSelectedRoomId} value={selectedRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an available room" />
                </SelectTrigger>
                <SelectContent>
                  {[...rooms]
                    .filter(room => room.status === 'available' || room.id === selectedSub?.roomId)
                    .sort((a, b) => {
                      if (a.building !== b.building) return a.building.localeCompare(b.building);
                      return a.number.localeCompare(b.number, undefined, { numeric: true });
                    })
                    .map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.building} ({room.number}) {room.id === selectedSub?.roomId ? '(Current)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {isEditStatusOpen && (
              <div className="pt-4 border-t border-slate-100">
                <Label className="text-slate-500 text-xs uppercase font-bold">Opsi Lainnya</Label>
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-red-600 border-red-100 hover:bg-red-50"
                    onClick={() => {
                      if (selectedSub) handleReject(selectedSub.id);
                      setIsEditStatusOpen(false);
                    }}
                  >
                    Batalkan Approval (Reject)
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsApproveOpen(false);
              setIsEditStatusOpen(false);
              setSelectedSub(null);
              setSelectedRoomId('');
            }}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove} disabled={!selectedRoomId}>
              {isEditStatusOpen ? 'Simpan Perubahan' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="rounded-2xl max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-center">Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-slate-600 font-medium">Yakin untuk menghapus pengajuan ini?</p>
            <p className="text-xs text-slate-400 mt-2">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <DialogFooter className="flex-row gap-3 sm:justify-center">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteOpen(false)} 
              className="flex-1 h-11 font-semibold"
            >
              No (Batal)
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              className="flex-1 h-11 font-semibold bg-red-600 hover:bg-red-700"
            >
              Yes (Hapus)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
