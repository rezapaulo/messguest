export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  password?: string;
}

export interface Room {
  id: string;
  number: string;
  status: 'available' | 'occupied' | 'maintenance';
  capacity: number;
  building: string;
  floor: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'checked-in' | 'checked-out';

export interface Submission {
  id: string;
  userUid: string;
  guestName?: string;
  guestNames?: string[];
  company: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  purpose: string;
  status: SubmissionStatus;
  roomId?: string;
  statementAccepted?: boolean;
  statementAcceptedAt?: string;
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
  condition?: string;
  checkOutNotes?: string;
  createdAt: string;
  estimatedArrivalTime?: string;
  roomType?: string;
  assignmentLetterUrl?: string;
}

export interface PPEBorrowing {
  id: string;
  borrowCode: string;
  submissionId: string;
  guestName: string;
  roomNumber: string;
  items: string[];
  borrowedAt: string;
  expectedReturnAt: string;
  actualReturnedAt?: string;
  status: 'borrowed' | 'returned' | 'late';
  idCardImageUrl?: string;
  notes?: string;
  createdBy: string;
}
