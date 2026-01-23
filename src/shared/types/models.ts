export type Category = {
    id: string;         //doc id
    name: string;
    color?: string;     //optional
    userId: string;
    createdAt: number;  //Date.now()
}

export type Expense = {
    id: string;         //doc id
    userId: string;
    amount: number;     
    categoryId: string; //reference by id
    note?: string;      //optional
    occuredAt: string;  //YYYY-MM-DD
    createdAt: number;  //Date.now()
}