import { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebaseService';
import { Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [numbers, setNumbers] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNumbers();
    }
  }, [isOpen]);

  const fetchNumbers = async () => {
    try {
      const q = query(collection(db, 'lookups'));
      const snap = await getDocs(q);
      setNumbers(snap.docs.map(t => t.id));
    } catch (error) {
      console.error("Error fetching db", error);
    }
  };

  const deletePhone = async (phone: string) => {
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'lookups', phone));
      await fetchNumbers();
    } catch (error) {
      console.error("Error deleting", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAll = async () => {
    if(!window.confirm("¿Estás seguro de que quieres borrar TODAS las evaluaciones de la base de datos?")) return;
    try {
      setIsDeleting(true);
      for (const phone of numbers) {
        await deleteDoc(doc(db, 'lookups', phone));
      }
      await fetchNumbers();
    } catch (error) {
      console.error("Error deleting all", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 bg-white border border-red-200 shadow-2xl rounded-[12px] w-[350px] overflow-hidden"
          >
            <div className="bg-red-50 border-b border-red-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-500 w-4 h-4" />
                <span className="font-semibold text-red-800 text-[13px]">Developer Tools</span>
              </div>
              <button 
                onClick={deleteAll}
                disabled={isDeleting || numbers.length === 0}
                className="text-[11px] font-medium bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
              >
                Wipe Todo
              </button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto p-2 bg-[#f8fafc]">
              {numbers.length === 0 ? (
                <div className="p-4 text-center text-[#9297a0] text-[12px]">La base de datos está limpia.</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {numbers.map(phone => (
                    <div key={phone} className="flex items-center justify-between bg-white p-2 border border-[#dddddd] rounded-[6px]">
                      <span className="text-[13px] font-mono text-[#333840]">{phone}</span>
                      <button 
                        onClick={() => deletePhone(phone)}
                        disabled={isDeleting}
                        className="p-1.5 text-[#9297a0] hover:text-red-500 hover:bg-red-50 rounded"
                        title="Borrar de la base de datos"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-[#181d26] rounded-full flex items-center justify-center text-white shadow-lg border border-white/20 hover:scale-105 transition-transform"
        title="Opciones de Desarrollador"
      >
        <ShieldCheck className="w-5 h-5" />
      </button>
    </div>
  );
}
