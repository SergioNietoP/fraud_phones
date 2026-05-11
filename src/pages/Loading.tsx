import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getPhoneLookup, savePhoneLookup } from "../services/firebaseService";
import { lookupPhoneNumber } from "../services/geminiService";
import { cn } from "../lib/utils";

const SEARCH_STEPS = [
  "Buscando en bases de datos...",
  "Revisando reportes de usuarios...",
  "Analizando detalles de red...",
  "Evaluando nivel de riesgo...",
  "Preparando resultados...",
  "Generando análisis inteligente..."
];

export default function Loading() {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [isTakingLong, setIsTakingLong] = useState(false);

  const [displayPhone, setDisplayPhone] = useState(phone ? phone.replace(/./g, '0') : '');

  useEffect(() => {
    if (!phone) return;
    
    let isSubscribed = true;
    let iteration = 0;
    const interval = setInterval(() => {
      if (!isSubscribed) return clearInterval(interval);
      
      setDisplayPhone(prev => phone.split('').map((char, idx) => {
        if (idx < iteration / 3) {
          return phone[idx];
        }
        return Math.floor(Math.random() * 10).toString();
      }).join(''));
      
      if (iteration >= phone.length * 3) {
        clearInterval(interval);
      }
      
      iteration += 1;
    }, 50);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [phone]);

  useEffect(() => {
    let isSubscribed = true;

    async function performLookup() {
      if (!phone) return;

      try {
        const interval = setInterval(() => {
          if (isSubscribed) {
            setCurrentStep(s => {
               if (s === SEARCH_STEPS.length - 2) {
                  setIsTakingLong(true);
               }
               return Math.min(s + 1, SEARCH_STEPS.length - 1);
            });
          }
        }, 3000);

        const cached = await getPhoneLookup(phone);
        
        if (cached) {
           setTimeout(() => {
             if (isSubscribed) navigate(`/results/${encodeURIComponent(phone)}`);
           }, 2000);
        } else {
           const result = await lookupPhoneNumber(phone);
           const completeData = {
              ...result,
              createdAt: new Date().toISOString()
           }
           await savePhoneLookup(completeData);
           
           if (isSubscribed) {
             clearInterval(interval);
             navigate(`/results/${encodeURIComponent(phone)}`);
           }
        }
        
        return () => clearInterval(interval);
      } catch (err: any) {
        if (isSubscribed) {
          setError(err.message || "Ha ocurrido un error durante el análisis.");
        }
      }
    }

    performLookup();

    return () => { isSubscribed = false; }
  }, [phone, navigate]);

  if (error) {
     return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white">
           <div className="text-[20px] font-medium text-[#aa2d00] mb-4">Análisis Fallido</div>
           <p className="text-[14px] text-[#41454d] max-w-lg text-center">{error}</p>
           <button onClick={() => navigate('/')} className="mt-8 px-8 py-3 font-medium text-[14px] bg-[#181d26] text-white rounded-[10px] hover:bg-[#0d1218] transition-all">Regresar al inicio</button>
        </div>
     );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] px-6">
       <div className="w-full max-w-[500px] bg-white border border-[#dddddd] shadow-sm rounded-[16px] p-8 md:p-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#f0f4fc] text-[#1b61c9] rounded-full flex items-center justify-center mb-8">
             <Loader2 size={32} className="animate-spin" />
          </div>
          
          <h1 className="text-[24px] font-medium text-[#181d26] tracking-tight mb-2">
            Analizando <span 
              className="block mt-4 text-[32px] md:text-[40px] font-mono tracking-[4px] text-[#1b61c9] bg-[#f0f4fc] px-6 py-3 rounded-[16px] border border-[#1b61c9]/20 transition-all duration-700"
              style={{ filter: `blur(${Math.max(0, 10 - currentStep * 2)}px)` }}
            >
              {displayPhone}
            </span>
          </h1>
          <p className="text-[15px] text-[#41454d] mb-8">
            Por favor espera, estamos procesando la información...
          </p>

          <div className="w-full text-left bg-[#f8fafc] border border-[#dddddd] rounded-[10px] p-6">
            <div className="flex items-center justify-between mb-4">
               <span className="text-[13px] font-medium text-[#9297a0] uppercase tracking-wide">Progreso del análisis</span>
               {isTakingLong && <span className="text-[12px] font-medium text-[#d9a441]">Analizando a fondo...</span>}
            </div>

            <div className="space-y-3">
               {SEARCH_STEPS.map((step, idx) => {
                  const isPast = idx < currentStep;
                  const isCurrent = idx === currentStep;
                  
                  return (
                     <div key={idx} className="flex items-center gap-3">
                        {isPast ? (
                           <span className="text-[#006400] text-[14px] w-4 flex justify-center">✓</span>
                        ) : isCurrent ? (
                           <div className="w-4 flex justify-center"><div className="w-2 h-2 bg-[#1b61c9] rounded-full animate-pulse"></div></div>
                        ) : (
                           <span className="text-[#dddddd] text-[14px] w-4 flex justify-center">○</span>
                        )}
                        <span className={cn(
                           "text-[14px] transition-all",
                           isPast ? "text-[#9297a0]" : 
                           isCurrent ? "font-medium text-[#181d26]" : "text-[#9297a0] opacity-50"
                        )}>
                           {step}
                        </span>
                     </div>
                  );
               })}
            </div>
          </div>
       </div>
    </div>
  );
}
