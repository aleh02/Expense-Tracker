import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { firebaseApp } from "./firebase";

//keep Firestore data in IndexedDB so reads still work offline
//multiple tabs share the same cache manager instead of fighting over locks
export const db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
    }),
});
