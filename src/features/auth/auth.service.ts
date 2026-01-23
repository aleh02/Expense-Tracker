import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import { auth } from "../../shared/firebase/auth";

export function signUpEmail(email: string, password: string){
    return createUserWithEmailAndPassword(auth, email, password);
}

export function signInEmail(email: string, password: string){
    return signInWithEmailAndPassword(auth, email, password);
}

export function signInGoogle(){
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
}

export function logout() {
    return signOut(auth);
}





