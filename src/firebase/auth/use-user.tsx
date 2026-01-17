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

  return {
    user: userProfile,
    firebaseUser: firebaseUser,
    loading: firebaseUser === undefined || (firebaseUser && profileLoading),
    isAuthenticated: !!userProfile,
  };
}
