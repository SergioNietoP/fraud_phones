import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PhoneLookup, getAllLookups } from "../services/firebaseService";
import { motion } from "motion/react";
import { Phone, CheckCircle2, ShieldAlert, Fingerprint } from "lucide-react";
import { cn } from "../lib/utils";

export default function Directory() {
  const [items, setItems] = useState<PhoneLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetch() {
      const all = await getAllLookups();
      // Filter out empty ones if necessary, but we'll show most now
      const valid = all.filter(u => u.phone);
      setItems(valid);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 bg-[#050505]">
         <div className="w-16 h-16 border-4 border-[#ffffff1a] border-t-[#ff4e00] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Pre-group by category, fallback to "Otros"
  const grouped: Record<string, PhoneLookup[]> = {};
  items.forEach(item => {
     let key = item.categoria_general || "Otros";
     if (key.length > 30) key = "Otros"; // Prevent incredibly long categories
     
     if (!grouped[key]) grouped[key] = [];
     grouped[key].push(item);
  });

  const categories = Object.entries(grouped).sort((a,b) => {
     if (a[0] === "Otros") return 1;
     if (b[0] === "Otros") return -1;
     return b[1].length - a[1].length;
  });

  return (
    <div className="flex-1 bg-[#050505] text-white p-6 md:p-12 h-full overflow-y-auto hidden-scrollbar">
      <div className="max-w-[1200px] mx-auto">
        <header className="mb-12">
           <button onClick={() => navigate('/')} className="text-[10px] uppercase tracking-widest text-[#666] hover:text-[#ff4e00] transition-colors mb-6 font-bold flex items-center gap-2">
              ← Regresar al Inicio
           </button>
           <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 uppercase">Directorio</h1>
           <p className="text-sm text-white/40 max-w-xl font-mono">
              Listado global de identificadores telefónicos buscados.
              Agrupados por tipología general extraída por nuestra IA.
           </p>
        </header>

        {categories.length === 0 ? (
           <div className="text-center p-20 bg-white/[0.02] border border-white/5 rounded-3xl text-[#666] uppercase tracking-widest text-sm font-bold">
              No hay registros comerciales guardados en el historial aún.
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {categories.map(([category, records]) => (
               <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={category} 
                  className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col transition-colors group hover:border-white/10"
               >
                  <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                     <div className="w-2 h-2 rounded-full bg-[#ff4e00] opacity-80"></div>
                     <h2 className="text-xs uppercase tracking-widest font-bold text-white/80">{category}</h2>
                     <span className="ml-auto text-[10px] font-mono text-white/40 bg-white/5 px-2 py-1 rounded">
                        {records.length} {records.length === 1 ? "REGISTRO" : "REGISTROS"}
                     </span>
                  </div>

                  <div className="flex flex-col gap-3">
                     {records.map((item, idx) => {
                        const isThreat = item.nivel_sospecha_suplantacion > 60 || item.fraude_detectado;
                        return (
                           <div 
                             key={idx}
                             onClick={() => navigate(`/results/${encodeURIComponent(item.phone)}`)}
                             className="cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-[#ff4e00]/40 transition-colors gap-4"
                           >
                              <div className="flex items-center gap-4">
                                 <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                                    isThreat ? "bg-[#ff4e00]/10 border-[#ff4e00]/20 text-[#ff4e00]" : "bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88]"
                                 )}>
                                    {isThreat ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
                                 </div>
                                 <div>
                                    <div className="font-mono font-bold text-white/90 group-hover:text-[#ff4e00] transition-colors">
                                       {item.phone}
                                    </div>
                                    <div className="text-[10px] uppercase font-bold text-white/40 mt-1 flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-[250px]">
                                       <Fingerprint size={10} />
                                       {item.empresa_pertenece_tlf || "No identificada"}
                                    </div>
                                 </div>
                              </div>
                              
                              {item.nivel_insistencia !== undefined && (
                                 <div className="flex items-center gap-2 sm:ml-auto">
                                    <span className="text-[9px] uppercase tracking-widest text-white/30 hidden sm:block font-bold">Insistencia</span>
                                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                       <div 
                                          className="h-full rounded-full" 
                                          style={{ 
                                             width: `${item.nivel_insistencia}%`,
                                             backgroundColor: item.nivel_insistencia > 75 ? '#ff4e00' : item.nivel_insistencia > 30 ? '#eab308' : '#00ff88'
                                          }}
                                       ></div>
                                    </div>
                                 </div>
                              )}
                           </div>
                        );
                     })}
                  </div>
               </motion.div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
