import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink } from 'lucide-react';

export default function SponsorDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className="relative"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-white/70 backdrop-blur-md border border-[#dddddd] px-3 py-2 rounded-full text-[12px] font-medium text-[#41454d] hover:bg-white hover:shadow-sm transition-all shadow-sm"
        >
          <div className="flex items-center gap-[4px]">
             <img src="https://masorange.es/wp-content/uploads/2024/04/logoO_positivo.jpg" alt="Logo" className="h-4 w-auto mix-blend-multiply" />
             <div className="flex items-center tracking-tighter text-[13px]" style={{ fontFamily: "Arial, sans-serif" }}>
               <span className="font-black text-[#000000]">CALL</span>
               <span className="font-black text-[#FF6600]">SHIELD</span>
             </div>
          </div>
          <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 w-64 bg-white border border-[#dddddd] rounded-[16px] shadow-lg overflow-hidden p-5"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                   <div className="flex items-center gap-[4px] text-[18px]">
                     <img src="https://masorange.es/wp-content/uploads/2024/04/logoO_positivo.jpg" alt="Logo" className="h-6 w-auto mix-blend-multiply" />
                     <div className="flex items-center tracking-tighter" style={{ fontFamily: "Arial, sans-serif" }}>
                       <span className="font-black text-[#000000]">CALL</span>
                       <span className="font-black text-[#FF6600]">SHIELD</span>
                     </div>
                  </div>
                </div>
                <p className="text-[13px] text-[#41454d] leading-relaxed">
                  Un servicio de validación de confianza impulsado por MasOrange para proteger a nuestros usuarios del fraude telefónico y las llamadas spam.
                </p>
                <a 
                  href="https://www.masorange.es" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#FF6600] hover:text-[#cc5200] transition-colors mt-1"
                >
                  Conocer más sobre MASORANGE <ExternalLink size={12} />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
