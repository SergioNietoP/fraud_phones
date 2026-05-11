import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { getRecentLookups, PhoneLookup } from "../services/firebaseService";
import { getComputedTags, TagNumbersModal } from "./Results";

export default function Home() {
  const [phone, setPhone] = useState("");
  const [recent, setRecent] = useState<PhoneLookup[]>([]);
  const [tagModalData, setTagModalData] = useState<{tagText: string, numbers: PhoneLookup[]} | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getRecentLookups().then(data => setRecent(data));
  }, []);

  const aggregatedTags = useMemo(() => {
     const tagMap = new Map<string, { tagInfo: any; count: number; items: PhoneLookup[] }>();

     for (const r of recent) {
        const tags = getComputedTags(r);
        
        if (tags.specTag.text !== 'Desconocido') {
            if (!tagMap.has(tags.specTag.text)) {
                 tagMap.set(tags.specTag.text, { tagInfo: tags.specTag, count: 0, items: [] });
            }
            const g = tagMap.get(tags.specTag.text)!;
            g.count++;
            g.items.push(r);
        }
     }

     return Array.from(tagMap.values()).sort((a,b) => b.count - a.count).slice(0, 8);
  }, [recent]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (cleanPhone.trim().length >= 1) {
      navigate(`/loading/${encodeURIComponent(cleanPhone)}`);
    }
  };

  return (
    <div className="flex-1 w-full bg-white font-sans flex flex-col">
      {/* Hero Band */}
      <section className="w-full flex-col flex items-center justify-center pt-32 pb-24 px-4">
         <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[640px] flex flex-col items-center text-center"
         >
            <h1 className="text-4xl md:text-[48px] font-normal tracking-tight text-[#181d26] mb-6 leading-[1.1]">
               Descubre <span className="relative inline-block group">
    <span className="word-blur-gradient select-none">quién</span>
  </span> te llama antes de contestar.
            </h1>
            <p className="text-[#333840] text-[16px] md:text-[18px] max-w-[500px] mb-12">
               Analizamos reportes y bases de datos para decirte a quién pertenece un número, si es seguro, o si se trata de spam.
            </p>

            <form onSubmit={handleSearch} className="w-full max-w-[420px] flex flex-col gap-4">
               <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Introduce el número..." 
                  className="w-full bg-white border border-[#dddddd] rounded-[6px] text-center text-xl font-medium tracking-tight px-4 py-4 outline-none text-[#181d26] placeholder-[#9297a0] focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all"
                  autoFocus
               />
               <button 
                  type="submit"
                  disabled={phone.trim().length < 1}
                  className={cn(
                     "w-full py-4 rounded-[12px] flex items-center justify-center font-medium text-[16px] transition-all gap-2",
                     phone.trim().length >= 1 
                        ? "text-white btn-magic-gradient-dark" 
                        : "bg-[#e0e2e6] text-[#9297a0] cursor-not-allowed"
                  )}
               >
                  <Search size={18} />
                  Identificar número
               </button>
            </form>
         </motion.div>
      </section>

      {recent.length > 0 && (
         <section className="w-full bg-[#f8fafc] flex-1 py-16 px-4 md:px-8 border-t border-[#dddddd] flex flex-col items-center">
            <div className="w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-[1fr_minmax(0,350px)] gap-12 md:gap-16">
               
               {/* Left Column: Recent Searches */}
               <div>
                  <h3 className="text-[20px] text-[#181d26] font-normal mb-8">Búsquedas recientes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     {recent.slice(0, 10).map((item, idx) => {
                        const tags = getComputedTags(item);
                        return (
                           <div 
                              key={idx}
                              onClick={() => navigate(`/results/${encodeURIComponent(item.phone)}`)}
                              className="cursor-pointer p-6 rounded-[12px] bg-white border border-[#dddddd] shadow-sm hover:border-[#9297a0] hover:shadow-md transition-all flex flex-col justify-between"
                           >
                              <div className="flex items-start justify-between mb-4">
                                 <span className="font-sans text-[16px] font-medium text-[#181d26] truncate pr-2">{item.phone}</span>
                                 <div className={cn(
                                    "flex-shrink-0 w-2.5 h-2.5 rounded-full"
                                 )} style={{ backgroundColor: tags.baseColor }}></div>
                              </div>
                              <span className="text-[14px] text-[#41454d] truncate block">{tags.specTag.text !== 'Desconocido' ? tags.specTag.text : item.resumen_uso}</span>
                           </div>
                        )
                     })}
                  </div>
               </div>

               {/* Right Column: Discover Categories */}
               <div>
                  <h3 className="text-[20px] text-[#181d26] font-normal mb-8">Tipologías detectadas</h3>
                  <div className="flex flex-col gap-4">
                     {aggregatedTags.map((tagObj, idx) => (
                         <div 
                            onClick={() => setTagModalData({ tagText: tagObj.tagInfo.text, numbers: tagObj.items })}
                            key={idx} 
                            className="bg-white border border-[#dddddd] p-5 rounded-[12px] shadow-sm flex items-center justify-between cursor-pointer hover:border-[#9297a0] hover:shadow-md transition-all"
                         >
                            <div className="flex items-center gap-3 truncate">
                                <div 
                                   className="px-3 py-1.5 rounded-[6px] text-[13px] font-medium border"
                                   style={{ backgroundColor: tagObj.tagInfo.bg, borderColor: `${tagObj.tagInfo.color}30`, color: tagObj.tagInfo.color }}
                                >
                                  {tagObj.tagInfo.text}
                                </div>
                            </div>
                            <span className="text-[13px] font-medium text-[#9297a0] shrink-0 ml-4">{tagObj.count} nums</span>
                         </div>
                     ))}
                     {aggregatedTags.length === 0 && (
                        <p className="text-[14px] text-[#9297a0]">Aún no hay suficientes datos para generar tipologías.</p>
                     )}
                  </div>
               </div>
               
            </div>
         </section>
      )}
      
      {tagModalData && <TagNumbersModal tagText={tagModalData.tagText} numbers={tagModalData.numbers} onClose={() => setTagModalData(null)} />}
    </div>
  );
}
