'use client';

import { useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useAuth, useFirestore, useDoc } from '@/firebase';
import type { User } from '@/lib/types';

export function useUser() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null | undefined>(undefined);

  // This is true until onAuthStateChanged runs for the first time.
  const authStateLoading = firebaseUser === undefined;

  const userDocRef = useMemo(() => {
    if (!firebaseUser || !firestore) return null;
    return doc(firestore, 'users', firebaseUser.uid);
  }, [firebaseUser, firestore]);
  
  const { data: userProfile, loading: profileLoading } = useDoc<User>(userDocRef);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, [auth]);

  const isAuthenticated = !!firebaseUser;
  // We are "loading" if the auth state is still unknown, OR 
  // if we have an authenticated user but are still fetching their profile from Firestore.
  const loading = authStateLoading || (isAuthenticated && profileLoading);

  return {
    user: userProfile,
    firebaseUser: firebaseUser,
    loading: loading,
    isAuthenticated: isAuthenticated,
  };
}
