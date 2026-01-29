import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../shared/firebase/firestore";
import { normalizeCurrency } from "../../shared/utils/currency";

export type Profile = {
    baseCurrency: string;
}

export async function getProfile(uid: string): Promise<Profile> {
    const ref = doc(db, 'profiles', uid);
    const snap = await getDoc(ref);

    if(!snap.exists()) {
        return { baseCurrency: 'EUR' };
    }

    const data = snap.data() as Partial<Profile>;
    return { baseCurrency: normalizeCurrency(data.baseCurrency) };
}

export async function setBaseCurrency(uid: string, baseCurrency: string): Promise<void> {
    const ref = doc(db, 'profiles', uid);
    await setDoc(ref, { baseCurrency: normalizeCurrency(baseCurrency), updatedAt: serverTimestamp() }, { merge: true });
}