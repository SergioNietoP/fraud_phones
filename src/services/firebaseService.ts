import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, query, collection, orderBy, limit, getDocs, updateDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export interface DialogoSimulado {
  emisor: string;
  mensaje: string;
}

export interface HoneypotCall {
  executedAt: string;
  transcript: DialogoSimulado[];
  conclusion_llm: string;
  nueva_tipologia: string;
  audio_synthesized?: boolean;
}

export interface PhoneLookup {
  phone: string;
  empresa_pertenece_tlf: string;
  ratio_seguridad_empresa_legitima: number;
  ratio_reportes_fraude: number;
  ratio_reportes_legitimo: number;
  total_reportes_encontrados: number;
  nivel_sospecha_suplantacion: number;
  fraude_detectado: boolean;
  resumen_uso: string;
  fuentes_consultadas: string;
  explicacion_tecnica: string;
  tipo_amenaza?: string;
  script_ataque?: string;
  categoria_general?: string;
  nivel_insistencia?: number;
  dialogo_simulado?: DialogoSimulado[];
  honeypot_call?: HoneypotCall;
  createdAt: string;
  es_comercial?: boolean;
  empresa_color_hex?: string;
  nombre_empresa_corto?: string;
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
    
    // Explicitly construct safeData to ensure correct types despite LLM hallucinations
    const safeData: PhoneLookup = {
      phone: lookup.phone || '',
      empresa_pertenece_tlf: lookup.empresa_pertenece_tlf || '',
      ratio_seguridad_empresa_legitima: Number(lookup.ratio_seguridad_empresa_legitima) || 0,
      ratio_reportes_fraude: Number(lookup.ratio_reportes_fraude) || 0,
      ratio_reportes_legitimo: Number(lookup.ratio_reportes_legitimo) || 0,
      total_reportes_encontrados: Number(lookup.total_reportes_encontrados) || 0,
      nivel_sospecha_suplantacion: Number(lookup.nivel_sospecha_suplantacion) || 0,
      fraude_detectado: Boolean(lookup.fraude_detectado),
      resumen_uso: lookup.resumen_uso || '',
      fuentes_consultadas: lookup.fuentes_consultadas || '',
      explicacion_tecnica: lookup.explicacion_tecnica || '',
      tipo_amenaza: lookup.tipo_amenaza || '',
      script_ataque: lookup.script_ataque || '',
      categoria_general: lookup.categoria_general || '',
      nivel_insistencia: Number(lookup.nivel_insistencia) || 0,
      dialogo_simulado: Array.isArray(lookup.dialogo_simulado) ? lookup.dialogo_simulado : [],
      createdAt: lookup.createdAt || new Date().toISOString()
    };
    
    if (lookup.honeypot_call) {
      safeData.honeypot_call = lookup.honeypot_call;
    }

    await setDoc(docRef, safeData);
  } catch (error) {
    console.error("Error saving lookup:", error);
    throw error;
  }
}

export async function updateHoneypot(phone: string, honeypot: HoneypotCall): Promise<void> {
   try {
      const docRef = doc(db, 'lookups', phone);
      await updateDoc(docRef, {
         honeypot_call: honeypot,
         categoria_general: honeypot.nueva_tipologia // Update general category
      });
   } catch (error) {
      console.error("Error updating honeypot:", error);
      throw error;
   }
}

export async function getRecentLookups(limitCountParams = 15): Promise<PhoneLookup[]> {
  try {
    const q = query(collection(db, 'lookups'), orderBy('createdAt', 'desc'), limit(limitCountParams));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PhoneLookup);
  } catch (error) {
    console.error("Error getting recent lookups:", error);
    return [];
  }
}

export async function getPhonesByCompany(companyName: string): Promise<PhoneLookup[]> {
  try {
    const q = query(collection(db, 'lookups'), orderBy('createdAt', 'desc'), limit(100)); // Firebase requires index for where+orderBy, so filter client-side to avoid index requirement for now
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PhoneLookup).filter(d => d.nombre_empresa_corto === companyName);
  } catch (error) {
    console.error("Error getting phones by company:", error);
    return [];
  }
}



export async function getAllLookups(): Promise<PhoneLookup[]> {
  try {
    const q = query(collection(db, 'lookups'), orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PhoneLookup);
  } catch (error) {
    console.error("Error getting all lookups:", error);
    return [];
  }
}
