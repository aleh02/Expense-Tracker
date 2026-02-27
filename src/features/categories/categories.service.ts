import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../shared/firebase/firestore';
import type { Category } from '../../shared/types/models';

const CATEGORIES_COL = 'categories'; //Collection name

export async function listCategories(userId: string): Promise<Category[]> {
  //gets current user's categories
  const q = query(
    collection(db, CATEGORIES_COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as Omit<Category, 'id'>; //type w/o id, doc does not have id
    return { id: d.id, ...data }; //get id from d.id
  });
}

export async function createCategory(
  userId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  await addDoc(collection(db, CATEGORIES_COL), {
    userId,
    name: trimmed,
    createdAt: serverTimestamp(),
  });
}

export async function removeCategory(categoryId: string): Promise<void> {
  await deleteDoc(doc(db, CATEGORIES_COL, categoryId));
}

export async function updateCategory(
  categoryId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  await updateDoc(doc(db, CATEGORIES_COL, categoryId), {
    name: trimmed,
  });
}
