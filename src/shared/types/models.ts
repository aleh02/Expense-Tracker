import type { Timestamp } from 'firebase/firestore';

export type Category = {
  id: string; //doc id
  userId: string;
  name: string;
  color?: string; //optional
  createdAt: Timestamp;
};

export type Expense = {
  id: string; //doc id
  userId: string;
  amount: number;
  currency: string; //EUR/USD...
  categoryId: string; //category doc id
  note?: string; //optional
  occurredAt: string; //YYYY-MM-DD
  createdAt: Timestamp;
};
