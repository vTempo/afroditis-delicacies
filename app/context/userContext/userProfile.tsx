import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../authContext/authContext";

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  console.log("ih");
  useEffect(() => {
    console.log("in useeffect");
    if (!user) {
      setProfile(null);
      return;
    }

    async function loadProfile() {
      console.log("hiii");
      if (!user) return;
      console.log("hi");
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setProfile(snap.data());
      }
    }

    loadProfile();
  }, [user]);

  console.log(user);
  console.log(profile);
  return profile; // contains { email, role, verified, ... }
}
