import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { firebaseApp } from "./firebase";

//firestore with persistent local cache (indexedDB)
export const db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(), //works with multi tabs
    }),
});
