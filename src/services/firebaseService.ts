import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, query, collection, orderBy, limit, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export interface PhoneLookup {
  phone: string;
  riskScore: number;
  commercialUsage: boolean;
  possibleCompany: string;
  purpose: string;
  summary: string;
  createdAt: string;
}

export async function getPhoneLookup(phone: string): Promise<PhoneLookup | null> {
  try {
    const docRef = doc(db, 'lookups', phone);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as PhoneLookup;
    }
  } catch (error) {
    console.error("Error getting lookup:", error);
  }
  return null;
}

export async function savePhoneLookup(lookup: PhoneLookup): Promise<void> {
  try {
    const docRef = doc(db, 'lookups', lookup.phone);
    await setDoc(docRef, lookup);
  } catch (error) {
    console.error("Error saving lookup:", error);
  }
}

export async function getRecentLookups(): Promise<PhoneLookup[]> {
  try {
    const q = query(collection(db, 'lookups'), orderBy('createdAt', 'desc'), limit(5));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PhoneLookup);
  } catch (error) {
    console.error("Error getting recent lookups:", error);
    return [];
  }
}
