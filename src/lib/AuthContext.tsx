import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          let userProfile: UserProfile;

          if (profileDoc.exists()) {
            userProfile = profileDoc.data() as UserProfile;
          } else {
            const username = user.email?.split('@')[0] || '';
            const role = (username === 'admin' || user.email === 'aris.masdian@ppa.co.id') ? 'admin' : 'user';
            userProfile = {
              uid: user.uid,
              email: user.email || '',
              role: role,
              displayName: username.charAt(0).toUpperCase() + username.slice(1),
            };
            await setDoc(doc(db, 'users', user.uid), userProfile);
          }

          // Force admin role for super admin emails (Recovery Mechanism)
          const superAdminEmails = ['aris.masdian@ppa.co.id', 'admin@messguest.local'];
          if (user.email && superAdminEmails.includes(user.email.toLowerCase())) {
            if (userProfile.role !== 'admin') {
              userProfile.role = 'admin';
              // Persist the recovery to Firestore so security rules recognize it
              await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
            }
          }
          
          setProfile(userProfile);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string) => {
    const email = `${username.toLowerCase()}@messguest.local`;
    try {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error: any) {
        // Bootstrap admin user if it doesn't exist
        // auth/invalid-credential is the new generic error for wrong password OR user not found
        if ((error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') && username === 'admin' && password === 'hcga123') {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (createError: any) {
            // If it already exists, maybe the password was just wrong but we got invalid-credential
            if (createError.code === 'auth/email-already-in-use') {
              throw new Error('Username admin sudah terdaftar dengan password berbeda.');
            }
            throw createError;
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      // Failed logout
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
