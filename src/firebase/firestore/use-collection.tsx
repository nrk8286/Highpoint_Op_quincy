'use client';

import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, Query, DocumentData, collection, CollectionReference } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T>(queryOrCollectionName: Query<DocumentData> | CollectionReference<DocumentData> | string | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const firestore = useFirestore();

  // Convert collection name string to Query if needed
  const query = useMemo(() => {
    if (!queryOrCollectionName) return null;
    if (typeof queryOrCollectionName === 'string' && firestore) {
      return collection(firestore, queryOrCollectionName);
    }
    return queryOrCollectionName;
  }, [queryOrCollectionName, firestore]) as Query<DocumentData> | CollectionReference<DocumentData> | null;

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (querySnapshot) => {
        const data: T[] = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        const collectionPath = typeof queryOrCollectionName === 'string'
          ? queryOrCollectionName
          : 'collection_path_unavailable';
        const permissionError = new FirestorePermissionError({
          path: collectionPath,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
