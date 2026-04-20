import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { getPhoneLookup, savePhoneLookup } from "../services/firebaseService";
import { lookupPhoneNumber } from "../services/geminiService";

const SEARCH_STEPS = [
  { id: 1, text: "Initializing search agent..." },
  { id: 2, text: "Querying public spam registries..." },
  { id: 3, text: "Scanning consumer report forums..." },
  { id: 4, text: "Cross-referencing commercial databases..." },
  { id: 5, text: "Synthesizing threat intelligence modeling..." },
];

export default function Loading() {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let isSubscribed = true;

    async function performLookup() {
      if (!phone) return;

      try {
        // Start animation cycling
        const interval = setInterval(() => {
          if (isSubscribed) {
            setCurrentStep(s => Math.min(s + 1, SEARCH_STEPS.length - 1));
          }
        }, 1500);

        // 1. Check cache
        const cached = await getPhoneLookup(phone);
        
        if (cached) {
           // Fake a tiny delay so they see some cool UI anyway
           setTimeout(() => {
             if (isSubscribed) navigate(`/results/${encodeURIComponent(phone)}`);
           }, 2000);
        } else {
           // 2. Perform Gemini Search
           const result = await lookupPhoneNumber(phone);
           
           // 3. Save and go
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
        console.error(err);
        if (isSubscribed) {
          setError(err.message || "An error occurred during analysis.");
        }
      }
    }

    performLookup();

    return () => { isSubscribed = false; }
  }, [phone, navigate]);

  if (error) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
             <h2 className="text-xl font-bold mb-2">Analysis Failed</h2>
             <p>{error}</p>
             <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-neutral-800 rounded">Go back</button>
          </div>
        </div>
     );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 font-mono w-full max-w-2xl mx-auto">
       <div className="w-full relative py-12">
          {/* Decorative Terminal Header */}
          <div className="flex items-center gap-2 mb-8 pb-4 border-b border-white/10 text-neutral-500 text-xs">
             <div className="w-2 h-2 rounded-full bg-red-500/50" />
             <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
             <div className="w-2 h-2 rounded-full bg-green-500/50" />
             <span className="ml-4">AGENT_RUNTIME_ENV</span>
          </div>

          <div className="h-[300px] relative">
             <AnimatePresence>
                {SEARCH_STEPS.map((step, index) => {
                   if (index > currentStep) return null;
                   return (
                      <motion.div
                         key={step.id}
                         initial={{ opacity: 0, x: -20 }}
                         animate={{ opacity: index === currentStep ? 1 : 0.4, x: 0 }}
                         className="flex items-center gap-4 mb-4 text-sm md:text-base"
                      >
                         <div className="w-4 flex justify-center text-emerald-500">
                             {index < currentStep ? "✓" : <motion.span animate={{ opacity: [1,0]}} transition={{ repeat: Infinity, duration: 0.8 }}>_</motion.span>}
                         </div>
                         <div className={index === currentStep ? "text-emerald-400" : "text-neutral-500"}>
                            [{new Date().toISOString().split("T")[1].substring(0,8)}] {step.text}
                         </div>
                      </motion.div>
                   )
                })}
             </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="mt-8">
             <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden">
                <motion.div 
                   className="h-full bg-emerald-500"
                   initial={{ width: "0%" }}
                   animate={{ width: `${((currentStep + 1) / SEARCH_STEPS.length) * 100}%` }}
                   transition={{ ease: "linear" }}
                />
             </div>
             <div className="flex justify-between mt-2 text-xs text-neutral-600">
                <span>ANALYSIS_JOB_{phone?.replace(/\\D/g,'').substring(0,4)}</span>
                <span>{Math.round(((currentStep + 1) / SEARCH_STEPS.length) * 100)}%</span>
             </div>
          </div>
       </div>
    </div>
  );
}
