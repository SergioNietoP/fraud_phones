import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPhoneLookup, savePhoneLookup } from "../services/firebaseService";
import { lookupPhoneNumber } from "../services/geminiService";
import { motion, AnimatePresence } from "motion/react";
import { Activity } from "lucide-react";

const PUBLIC_STEPS = [
  "Analizando número...",
  "Buscando en registros...",
  "Consultando opiniones...",
  "Calculando nivel de riesgo...",
  "Generando resultados..."
];


export default function Loading() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [displayPhone, setDisplayPhone] = useState(phone ? phone.replace(/./g, '0') : '');

  // Scramble effect — sin cambios, funciona bien
  useEffect(() => {
    if (!phone) return;
    let isSubscribed = true;
    let iteration = 0;
    const interval = setInterval(() => {
      if (!isSubscribed) return clearInterval(interval);
      setDisplayPhone(phone.split('').map((char, idx) => {
        if (idx < iteration / 3) return phone[idx];
        return Math.floor(Math.random() * 10).toString();
      }).join(''));
      if (iteration >= phone.length * 3) clearInterval(interval);
      iteration += 1;
    }, 40);
    return () => { isSubscribed = false; clearInterval(interval); };
  }, [phone]);

  useEffect(() => {
    let isSubscribed = true;
    async function performLookup() {
      if (!phone) return;
      try {
        const interval = setInterval(() => {
          if (isSubscribed) setCurrentStep(s => Math.min(s + 1, PUBLIC_STEPS.length - 1));
        }, 1500);
        const cached = await getPhoneLookup(phone);
        if (cached) {
          setTimeout(() => { if (isSubscribed) navigate(`/results/${encodeURIComponent(phone)}`); }, 800);
        } else {
          const result = await lookupPhoneNumber(phone);
          await savePhoneLookup({ ...result, createdAt: new Date().toISOString() });
          if (isSubscribed) { clearInterval(interval); navigate(`/results/${encodeURIComponent(phone)}`); }
        }
        return () => clearInterval(interval);
      } catch (err: any) {
        if (isSubscribed) setError(err.message || "Análisis interrumpido. Señal perdida.");
      }
    }
    performLookup();
    return () => { isSubscribed = false; };
  }, [phone, navigate]);

  if (error) {
    return (
      <div className="flex-1 w-full bg-white flex flex-col items-center justify-center p-10 font-sans">
        <div className="w-16 h-16 bg-red-50 rounded-[16px] flex items-center justify-center mb-6">
          <Activity className="text-red-500 w-8 h-8" />
        </div>
        <div className="text-[20px] font-medium text-[#181d26] tracking-tight mb-3">Conexión Fallida</div>
        <p className="text-[14px] text-[#9297a0] max-w-sm text-center">{error}</p>
        <button onClick={() => navigate('/')} className="mt-8 px-6 py-2.5 font-medium text-[13px] bg-[#181d26] text-white rounded-full hover:bg-[#2c3340] transition-colors">
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#f8fafc] flex items-center justify-center overflow-hidden relative selection:bg-[#181d26] selection:text-white">

      {/* Grid background — sin cambios, queda bien */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_30%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl px-6 flex flex-col items-center gap-10">


        {/* Número — ahora es el héroe sin cursor roto */}
        <div className="text-center w-full">
          <div className="relative inline-block mb-2">
            <span className="text-[36px] md:text-[52px] font-mono font-medium tracking-[0.25em] text-[#181d26] tabular-nums">
              {displayPhone}
            </span>
          </div>
        </div>

        {/* Step label + progress dots — compactados */}
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="h-5 overflow-hidden relative w-full">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentStep}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.4, ease: "circOut" }}
                className="text-[#9297a0] text-[11px] font-semibold uppercase tracking-[0.2em] absolute inset-0 flex justify-center"
              >
                {PUBLIC_STEPS[currentStep]}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex gap-1.5 justify-center">
            {PUBLIC_STEPS.map((_, idx) => (
              <motion.div
                key={idx}
                className="h-[3px] rounded-full"
                animate={{
                  width: idx === currentStep ? 24 : 10,
                  backgroundColor: idx <= currentStep ? '#181d26' : '#e2e8f0',
                  opacity: idx < currentStep ? 0.25 : 1
                }}
                transition={{ duration: 0.35 }}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}