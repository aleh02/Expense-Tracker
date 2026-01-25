import type { Timestamp } from "firebase/firestore";

export type Category = {
    id: string;         //doc id
    userId: string;
    name: string;
    color?: string;     //optional
    createdAt: Timestamp;  //Date.now()
}

export type Expense = {
    id: string;         //doc id
    userId: string;
    amount: number;     
    categoryId: string; //category doc id
    note?: string;      //optional
    occurredAt: string;  //YYYY-MM-DD
    createdAt: Timestamp;  //Date.now()
}