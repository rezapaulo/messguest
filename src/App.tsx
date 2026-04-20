import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SubmissionForm from './components/SubmissionForm';
import SubmissionsList from './components/SubmissionsList';
import RoomsList from './components/RoomsList';
import UsersList from './components/UsersList';
import GuestCalendar from './pages/GuestCalendar';
import CheckInOut from './components/CheckInOut';
import SystemSettings from './components/SystemSettings';
import LoginPage from './components/LoginPage';
import PPEBorrowing from './pages/PPEBorrowing';
import GuestStatementAccess from './pages/GuestStatementAccess';
import GuestStatementForm from './pages/GuestStatementForm';
import { Toaster } from 'sonner';

function ProtectedRoute({ children, roles }: { children: React.ReactNode, roles?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/" />;

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/guest-statement" element={<GuestStatementAccess />} />
          <Route path="/guest-statement/form/:id" element={<GuestStatementForm />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/submissions" element={
            <ProtectedRoute>
              <SubmissionsList />
            </ProtectedRoute>
          } />

          <Route path="/check-in-out" element={
            <ProtectedRoute roles={['admin']}>
              <CheckInOut />
            </ProtectedRoute>
          } />

          <Route path="/ppe" element={
            <ProtectedRoute roles={['admin']}>
              <PPEBorrowing />
            </ProtectedRoute>
          } />
          
          <Route path="/apply" element={
            <ProtectedRoute roles={['user']}>
              <SubmissionForm />
            </ProtectedRoute>
          } />
          
          <Route path="/rooms" element={
            <ProtectedRoute roles={['admin']}>
              <RoomsList />
            </ProtectedRoute>
          } />
          
          <Route path="/users" element={
            <ProtectedRoute roles={['admin']}>
              <UsersList />
            </ProtectedRoute>
          } />

          <Route path="/calendar" element={
            <ProtectedRoute>
              <GuestCalendar />
            </ProtectedRoute>
          } />

          <Route path="/system" element={
            <ProtectedRoute roles={['admin']}>
              <SystemSettings />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
