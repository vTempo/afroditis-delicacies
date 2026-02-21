import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export async function getUserFavorites(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return [];
  return snap.data().favorites || [];
}

export async function addFavorite(
  uid: string,
  menuItemId: string,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    favorites: arrayUnion(menuItemId),
  });
}

export async function removeFavorite(
  uid: string,
  menuItemId: string,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    favorites: arrayRemove(menuItemId),
  });
}
