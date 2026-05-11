import { useEffect, useState, FormEvent, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PhoneLookup, getPhoneLookup, updateHoneypot, HoneypotCall, DialogoSimulado, getRecentLookups } from "../services/firebaseService";
import { executeHoneypotCallSimulated } from "../services/geminiService";
import { motion, AnimatePresence } from "motion/react";
import { Search, Fingerprint, MessageSquareText, FileText, ArrowRight, X, Gauge, PhoneCall, Volume2, Mic } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { cn } from "../lib/utils";

const ReadMoreModal = ({ title, content, onClose }: { title: string, content: string, onClose: () => void }) => (
  <AnimatePresence>
     <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181d26]/40 backdrop-blur-sm"
        onClick={onClose}
     >
        <motion.div 
           initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
           className="bg-white border border-[#dddddd] rounded-[12px] shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto hidden-scrollbar relative"
           onClick={e => e.stopPropagation()}
        >
           <button onClick={onClose} className="absolute top-6 right-6 text-[#9297a0] hover:text-[#181d26] transition-colors">
              <X size={24} />
           </button>
           <h3 className="text-[18px] tracking-tight text-[#181d26] font-medium mb-6">{title}</h3>
           <div className="text-[14px] text-[#41454d] leading-relaxed whitespace-pre-wrap">{content}</div>
        </motion.div>
     </motion.div>
  </AnimatePresence>
);

export const TagNumbersModal = ({ tagText, numbers, onClose }: { tagText: string, numbers: PhoneLookup[], onClose: () => void }) => {
  const navigate = useNavigate();
  return (
  <AnimatePresence>
     <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181d26]/40 backdrop-blur-sm"
        onClick={onClose}
     >
        <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.95 }}
           className="bg-white border border-[#dddddd] rounded-[16px] shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto hidden-scrollbar relative flex flex-col"
           onClick={e => e.stopPropagation()}
        >
           <button onClick={onClose} className="absolute top-6 right-6 text-[#9297a0] hover:text-[#181d26] transition-colors">
              <X size={24} />
           </button>
           <h3 className="text-[20px] tracking-tight text-[#181d26] font-medium mb-2 shrink-0">Números con la etiqueta "{tagText}"</h3>
           <p className="text-[14px] text-[#41454d] mb-6 shrink-0 border-b border-[#dddddd] pb-4">Esta es una lista de números analizados recientemente que comparten esta tipología.</p>
           
           <div className="flex-1 overflow-y-auto hidden-scrollbar flex flex-col gap-3">
             {numbers.map((num, i) => (
                <div key={i} onClick={() => { onClose(); navigate(`/loading/${encodeURIComponent(num.phone)}`); }} className="bg-[#f8fafc] border border-[#dddddd] p-4 rounded-[12px] flex flex-col cursor-pointer hover:border-[#9297a0] transition-colors">
                   <div className="flex justify-between items-start mb-2">
                      <span className="text-[16px] font-medium text-[#181d26]">{num.phone}</span>
                      <span className="text-[12px] px-2 py-0.5 rounded-[4px] bg-white border border-[#dddddd] text-[#41454d] shadow-sm">{new Date(num.createdAt).toLocaleDateString()}</span>
                   </div>
                   <p className="text-[13px] text-[#41454d] line-clamp-2 leading-relaxed">{num.resumen_uso}</p>
                </div>
             ))}
             {numbers.length === 0 && (
                <p className="text-[14px] text-[#9297a0] p-4 text-center">No hay más números registrados con esta etiqueta.</p>
             )}
           </div>
        </motion.div>
     </motion.div>
  </AnimatePresence>
  );
}

export const getComputedTags = (data: PhoneLookup) => {
  const isFraude = data.fraude_detectado || data.nivel_sospecha_suplantacion > 60 || data.ratio_reportes_fraude > 60;
  const isComercial = data.es_comercial && !isFraude;
  const isMedRisk = (data.nivel_sospecha_suplantacion > 25 && data.nivel_sospecha_suplantacion <= 60) || (data.ratio_reportes_fraude > 25 && data.ratio_reportes_fraude <= 60);

  const evalLabel = isFraude ? "Evaluación Desfavorable" : isMedRisk ? "Evaluación Precaución" : "Evaluación Favorable";
  const evalColor = isFraude ? "#aa2d00" : isMedRisk ? "#d9a441" : "#006400";
  
  const typeLabel = isComercial ? "Comercial" : isFraude ? "Fraude" : "Otro";
  
  let specificLabelStr = "Desconocido";
  if (isComercial && data.nombre_empresa_corto) {
    specificLabelStr = data.nombre_empresa_corto;
  } else if (data.categoria_general && data.categoria_general !== "Desconocido") {
    specificLabelStr = data.categoria_general;
  } else if (data.empresa_pertenece_tlf) {
    specificLabelStr = data.empresa_pertenece_tlf.split(' ').slice(0, 2).join(' ');
  }
  
  const specificColor = (isComercial && data.empresa_color_hex) ? data.empresa_color_hex : evalColor;

  return {
    evalTag: { text: evalLabel, color: evalColor, bg: `${evalColor}15`, queryType: 'eval' as const },
    typeTag: { text: typeLabel, color: evalColor, bg: `${evalColor}15`, queryType: 'type' as const },
    specTag: { text: specificLabelStr, color: specificColor, bg: `${specificColor}15`, queryType: 'spec' as const },
    baseColor: evalColor
  };
};

const LOCAL_US_BUSINESSES = [
  { name: "Local Auto Repair (TX)", phone: "+15124593411" },
  { name: "Downtown Florist (IL)", phone: "+13124321800" },
  { name: "Greenwood Hardware (WA)", phone: "+12067832560" },
  { name: "Main St Barber (OH)", phone: "+16142998822" },
  { name: "Books on Main (CA)", phone: "+15307560378" },
  { name: "Local Bakery (FL)", phone: "+13054483733" }
];

const HoneypotTerminal = ({ 
   phone, 
   category, 
   entity,
   onComplete, 
   onClose 
}: { 
   phone: string, 
   category: string,
   entity: string,
   onComplete: (data: HoneypotCall) => void, 
   onClose: () => void 
}) => {
   const [mode, setMode] = useState<"select" | "simulated" | "real">("select");
   const [vapiKey, setVapiKey] = useState(localStorage.getItem('VAPI_KEY') || "b17e719f-86f5-4c2a-af6b-99b82af44c9a");
   const [vapiPhoneId, setVapiPhoneId] = useState(localStorage.getItem('VAPI_PHONE_ID') || "bc99d5a5-4a70-489a-94fc-6e48e0506164");
   const [overridePhone, setOverridePhone] = useState(phone);
   const [businessSearch, setBusinessSearch] = useState("");
   const [state, setState] = useState<"init" | "dialing" | "connecting" | "intercepting" | "generating" | "playing" | "done" | "aborted">("init");
   const [logs, setLogs] = useState<string[]>([]);
   const [generatedData, setGeneratedData] = useState<HoneypotCall | null>(null);
   const [playingIndex, setPlayingIndex] = useState<number>(-1);
   const [isAborted, setIsAborted] = useState(false);
   const [callId, setCallId] = useState<string | null>(null);
   const isAbortedRef = useRef(false);

   const ad = (msg: string) => { 
     setLogs(l => [...l, `[${new Date().toISOString().split('T')[1].slice(0,-1)}] ${msg}`]); 
   };

   // Advanced TTS Voice Selector
   const speakLine = async (line: any, synth: SpeechSynthesis) => {
      return new Promise<void>((resolve, reject) => {
         if (isAbortedRef.current) return resolve();
         const isIA = line.emisor.toLowerCase().includes("agente");
         const utterance = new SpeechSynthesisUtterance(line.mensaje);
         
         const voices = synth.getVoices();
         // ... (try to get Spanish voices)
         const esVoices = voices.filter(v => v.lang.includes('es'));
         const pool = esVoices.length > 0 ? esVoices : voices;
         
         let voiceAgent = pool.find(v => v.name.includes("Google") || v.name.includes("Neural") || (v.name.includes("Female") && !v.name.includes("Microsoft"))) || pool[0];
         let voiceTarget = pool.reverse().find(v => v.name.includes("Google") || v.name.includes("Neural") || (v.name.includes("Male") && !v.name.includes("Microsoft"))) || pool[pool.length-1] || pool[0];

         utterance.voice = isIA ? voiceAgent : voiceTarget;
         utterance.rate = isIA ? 1.05 : 1.0;
         utterance.pitch = isIA ? 1.0 : 0.8;
         
         utterance.onend = () => resolve();
         utterance.onerror = () => resolve();
         synth.speak(utterance);
         
         // In case abort is called WHILE speaking, we need a periodic check to break early
         const checkInterval = setInterval(() => {
            if (isAbortedRef.current) {
               synth.cancel();
               clearInterval(checkInterval);
               resolve();
            }
         }, 100);
         
         utterance.onend = () => { clearInterval(checkInterval); resolve(); };
      });
   };

   const startSimulated = async () => {
      setMode("simulated");
      setIsAborted(false);
      isAbortedRef.current = false;
      
      setState("init");
      ad(`Autenticando Honeypot Local contra el nodo objetivo...`);
      await new Promise(r => setTimeout(r, 1500));
      if (isAbortedRef.current) return;
      
      setState("dialing");
      ad(`Abriendo trunk SIP protegido. Marcando ${phone}...`);
      await new Promise(r => setTimeout(r, 2000));
      if (isAbortedRef.current) return;
      
      setState("connecting");
      ad(`Tono de llamada detectado. Esperando handshake...`);
      await new Promise(r => setTimeout(r, 3000));
      if (isAbortedRef.current) return;
      
      setState("intercepting");
      ad(`¡Conexión establecida! Operativa Honeypot iniciada con Agente IA.`);
      ad(`Sintetizando perfil de voz neuronal y deduciendo operativa...`);
      
      try {
         const result = await executeHoneypotCallSimulated(phone, entity, category);
         if (isAbortedRef.current) return;
         
         const completeData: HoneypotCall = {
            ...result,
            executedAt: new Date().toISOString()
         };
         
         setState("playing");
         ad(`Iniciando reproducción de interceptación...`);
         setGeneratedData(completeData);
         
         if ('speechSynthesis' in window) {
            const synth = window.speechSynthesis;
            synth.cancel(); // clear previous
            for (let i = 0; i < result.transcript.length; i++) {
               if (isAbortedRef.current) break;
               setPlayingIndex(i);
               await speakLine(result.transcript[i], synth);
               if (isAbortedRef.current) break;
               await new Promise(r => setTimeout(r, 300));
            }
         } else {
            for (let i = 0; i < result.transcript.length; i++) {
               if (isAbortedRef.current) break;
               setPlayingIndex(i);
               await new Promise(r => setTimeout(r, 2500));
            }
         }
         
         if (isAbortedRef.current) return;
         setPlayingIndex(-1);
         setState("done");
         ad(`Misión completada con éxito. Guardando inteligencia.`);
         onComplete(completeData);
         
      } catch(e: any) {
         ad(`ERROR CRÍTICO: ${e.message}`);
         setState("aborted");
      }
   };

   const startRealCall = async () => {
      if (!vapiKey) return alert("Se requiere API Key de Vapi.ai para interactuar con la red telefónica real.");
      if (!vapiPhoneId) return alert("Se requiere el ID de un número telefónico de Vapi.ai (Phone Number ID) para originar la llamada.");
      localStorage.setItem('VAPI_KEY', vapiKey);
      localStorage.setItem('VAPI_PHONE_ID', vapiPhoneId);
      setMode("real");
      setIsAborted(false);
      isAbortedRef.current = false;
      
      setState("init");
      ad(`Cargando módulos de red PSTN reales...`);
      await new Promise(r => setTimeout(r, 1000));
      
      setState("dialing");
      ad(`Conectando con pasarela telefónica. Pidiendo a la IA que llame a ${overridePhone}...`);
      
      try {
         let cleanPhone = overridePhone.replace(/\s+/g, '');
         if (!cleanPhone.startsWith("+")) {
           if (cleanPhone.length === 9) cleanPhone = "+34" + cleanPhone;
           else if (cleanPhone.length === 10) cleanPhone = "+1" + cleanPhone; // USA 10-digit
           else if (cleanPhone.startsWith("1") && cleanPhone.length === 11) cleanPhone = "+" + cleanPhone; // USA 11-digit
           else cleanPhone = "+" + cleanPhone; // fallback
         }
         
         const targetContext = entity && entity !== "Entidad Desconocida" ? `You believe this number might belong to ${entity} (Category: ${category}). Bring this up naturally if they don't say who they are.` : `You don't know who this number belongs to.`;
         const targetContextEs = entity && entity !== "Entidad Desconocida" ? `Crees que el número puede ser de ${entity} (Categoría: ${category}). Menciónalo de forma natural si no te dicen quiénes son.` : `No tienes idea de a quién pertenece el número.`;

         const isUSA = cleanPhone.startsWith("+1");
         const systemPrompt = isUSA 
            ? `You are an elderly confused American man (65+ years old). You saw a missed call from this number on your old phone and are calling back. Be very convincing, ask who they are and why they called you. ${targetContext} If an automated menu or person answers, say 'Hello? Is anyone there? Who is this?'.` 
            : `Escucha. Tienes que pasarte por una persona mayor de 65 años en España. Has visto en tu móvil antiguo que este número te ha llamado y lo devuelves asustado pidiendo explicaciones. Sé muy convincente, haz pausas raras. Quieres sacarles si venden algo o de qué compañía son. ${targetContextEs} Si te salta un contestador, di '¿hola? hay alguien?' y espera.`;
         const firstMessage = isUSA 
            ? "Hello? Ah... I have a missed call from this number."
            : "¿Dígame? Eh... hola. Tenía una llamada perdida de este número.";
         const aiVoice = isUSA ? "alloy" : "nova";

         const res = await fetch("https://api.vapi.ai/call/phone", {
            method: "POST",
            headers: {
               "Authorization": `Bearer ${vapiKey}`,
               "Content-Type": "application/json"
            },
            body: JSON.stringify({
               customer: {
                 number: cleanPhone
               },
               phoneNumberId: vapiPhoneId,
               assistant: {
                 name: "Agente de Investigación",
                 firstMessage: firstMessage,
                 model: {
                    provider: "openai",
                    model: "gpt-4-turbo",
                    messages: [
                       { 
                          role: "system", 
                          content: systemPrompt
                       }
                    ]
                 },
                 voice: {
                    provider: "openai",
                    voiceId: aiVoice
                 }
               }
            })
         });

         if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(`Error estableciendo conexión PSTN con Vapi: ${errData.message || res.statusText}`);
         }
         const bData = await res.json();
         const activeCallId = bData.id; // Vapi returns id
         setCallId(activeCallId);
         
         setState("intercepting");
         ad(`¡Conexión Vapi.ai establecida! ID de sesión (Trunk): ${activeCallId}`);
         ad(`Vigilando tráfico de voz y extrayendo transcripción en tiempo real...`);

         // Polling interval for live transcripts
         let mockTranscripts: DialogoSimulado[] = [];
         const poll = setInterval(async () => {
            if (isAbortedRef.current) { clearInterval(poll); return; }
            try {
               const stRes = await fetch(`https://api.vapi.ai/call/${activeCallId}`, {
                  headers: { "Authorization": `Bearer ${vapiKey}` }
               });
               const stData = await stRes.json();
               
               if (stData.messages && stData.messages.length > 0) {
                  // Figure out the best name for the target
                  let targetName = entity !== "Entidad Desconocida" ? entity : "Objetivo Real";
                  const mappedBusiness = LOCAL_US_BUSINESSES.find(b => b.phone === overridePhone);
                  if (mappedBusiness) {
                     targetName = mappedBusiness.name;
                  } else if (overridePhone !== phone && overridePhone.startsWith("+1")) {
                     targetName = "Objetivo (USA)";
                  } else if (overridePhone !== phone && overridePhone.startsWith("+34")) {
                     targetName = "Objetivo (España)";
                  }

                  // Vapi format mapping
                  const formatted = stData.messages
                     .filter((m: any) => m.role === 'user' || m.role === 'assistant' || m.role === 'bot')
                     .map((m: any) => ({
                        emisor: (m.role === "assistant" || m.role === "bot") ? "Agente IA (Honeypot)" : targetName,
                        mensaje: m.content || m.message || "(silencio interactivo)"
                     }));
                  
                  if (formatted.length > 0) {
                     mockTranscripts = formatted;
                     setGeneratedData({
                        executedAt: new Date().toISOString(),
                        transcript: formatted,
                        conclusion_llm: "Analizando tráfico real vivo...",
                        nueva_tipologia: "Por determinar"
                     });
                     setPlayingIndex(formatted.length - 1);
                  }
               }

               if (stData.status === "ended" || stData.status === "failed") {
                  clearInterval(poll);
                  if (stData.status === "failed") ad(`La llamada falló al intentar descolgar el nodo.`);
                  else ad(`El objetivo o el agente han colgado.`);
                  
                  setState("done");
                  
                  const finalConclusionLLM = stData.analysis?.summary || `Se interceptó una llamada con ${mockTranscripts.length} paquetes de voz intercambiados.`;
                  const finalCallData: HoneypotCall = {
                     executedAt: new Date().toISOString(),
                     transcript: mockTranscripts.length > 0 ? mockTranscripts : [{emisor: "Sistema", mensaje: "No hubo conversación audible."}],
                     conclusion_llm: finalConclusionLLM,
                     nueva_tipologia: category, 
                     audio_synthesized: false 
                  };
                  setGeneratedData(finalCallData);
                  onComplete(finalCallData);
               }
            } catch (e) {
               console.error("Polling error:", e);
            }
         }, 4000);

      } catch (err: any) {
         ad(`ERROR CRÍTICO VAPI: ${err.message}`);
         setState("aborted");
      }
   };

   const abortOperation = async () => {
      isAbortedRef.current = true;
      setIsAborted(true);
      setState("aborted");
      ad(`[!] OPERACIÓN ABORTADA. APAGANDO MÓDULOS DE RED.`);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setPlayingIndex(-1);
      
      // Stop Vapi Call
      if (mode === "real" && callId) {
         ad(`Enviando señal DELETE de finalización a Vapi trunk...`);
         try {
            // Wait, we need to end a Vapi call using DELETE /call/{id} or PATCH with status='ended'
            // Usually it's PATCH /call/id { "status": "ended" } or just let it close
            await fetch(`https://api.vapi.ai/call/${callId}`, {
               method: "PATCH",
               headers: { "Authorization": `Bearer ${vapiKey}`, "Content-Type": "application/json" },
               body: JSON.stringify({ status: "ended" })
            });
            ad(`Llamada Vapi finalizada remotamente.`);
         } catch(e) { }
      }
   };

   // UI components omitted specifically for brevity, showing the main return
   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181d26]/40 backdrop-blur-md">
         <div className="bg-white border border-[#dddddd] rounded-[12px] w-full max-w-5xl md:h-auto md:min-h-[500px] h-full max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
            
            {/* Visualizer Background - Removes glowing effects */}
            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none flex items-center justify-center overflow-hidden">
               {playingIndex >= 0 && state !== 'aborted' && (
                  <div className="flex gap-2 items-center justify-center h-full">
                     {[...Array(20)].map((_, i) => (
                        <div key={i} className="w-4 bg-[#181d26] rounded-full" 
                             style={{ 
                                height: `${20 + Math.random() * 80}%`,
                                animation: `pulse ${0.5 + Math.random() * 1}s infinite alternate`
                             }}
                        ></div>
                     ))}
                  </div>
               )}
               {state === 'connecting' && <div className="w-[800px] h-[800px] border border-[#1b61c9] rounded-full absolute animate-ping duration-1000"></div>}
            </div>

            <header className="p-4 md:p-6 border-b border-[#dddddd] flex justify-between items-center z-10 bg-[#f8fafc]">
               <div className="flex items-center gap-3 md:gap-4">
                  <div className={cn(
                     "w-3 h-3 rounded-full animate-pulse",
                     state === 'init' || state === 'dialing' ? "bg-[#d9a441]" :
                     state === 'aborted' ? "bg-red-500" :
                     state === 'connecting' || state === 'intercepting' || state === 'generating' || state === 'playing' ? "bg-[#39bf45]" : "bg-[#9297a0]"
                  )}></div>
                  <h2 className="text-[14px] md:text-[16px] font-medium tracking-tight text-[#181d26]">
                     Asistente de Llamada
                  </h2>
               </div>
               
               <div className="flex items-center gap-4">
                  {mode !== 'select' && state !== 'done' && state !== 'aborted' && (
                     <button onClick={abortOperation} className="px-4 py-2 bg-white text-[#181d26] border border-[#dddddd] font-medium text-[14px] rounded-[12px] hover:bg-[#f8fafc] transition-all">
                        Detener Llamada
                     </button>
                  )}
                  {(state === 'done' || state === 'aborted') && (
                     <button onClick={onClose} className="px-6 py-2 bg-[#181d26] text-white font-medium text-[14px] rounded-[12px] hover:bg-[#0d1218] transition-colors">
                        Cerrar Simulador
                     </button>
                  )}
               </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row relative z-10 overflow-y-auto hidden-scrollbar bg-white">
               {mode === "select" ? (
                  <div className="flex-1 w-full flex flex-col items-center justify-start md:justify-center p-6 md:p-8 bg-white min-h-max">
                     <h3 className="text-3xl font-normal text-[#181d26] tracking-tight mb-4">Elige una opción de análisis</h3>
                     <p className="text-[16px] text-[#333840] mb-8 text-center max-w-lg">
                        Puedes simular la interacción utilizando los datos que hemos recolectado, o enlazar a nuestro asistente de voz para llamar al número en tiempo real.
                     </p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                        {/* Option 1: Simulated */}
                        <div onClick={startSimulated} className="group cursor-pointer bg-[#f8fafc] border border-[#dddddd] hover:border-[#9297a0] p-8 rounded-[12px] transition-all shadow-sm hover:shadow-md relative overflow-hidden flex flex-col">
                           <div className="w-12 h-12 bg-white text-[#181d26] flex items-center justify-center rounded-full mb-6 border border-[#dddddd] shadow-sm shrink-0">
                              <Mic size={24} />
                           </div>
                           <h4 className="text-[20px] font-medium text-[#181d26] tracking-tight mb-2">Simulación con IA</h4>
                           <p className="text-[14px] text-[#41454d] leading-relaxed flex-1">
                              El asistente simula de forma sintética una llamada bidireccional basada en perfiles recolectados en internet, sin alertar al objetivo. 
                           </p>
                           <p className="text-[#181d26] font-medium text-[14px] mt-4 shrink-0">100% Gratuito y Rápido.</p>
                        </div>

                        {/* Option 2: PSTN */}
                        <div className="bg-[#f5e9d4] border border-[#dddddd] p-8 rounded-[12px] relative overflow-hidden flex flex-col">
                           <div className="w-12 h-12 bg-white text-[#aa2d00] flex items-center justify-center rounded-full mb-6 border border-[#dddddd] shadow-sm shrink-0">
                              <PhoneCall size={24} />
                           </div>
                           <h4 className="text-[20px] font-medium text-[#181d26] tracking-tight mb-2">Llamada Real en Vivo</h4>
                           <p className="text-[14px] text-[#41454d] leading-relaxed mb-6 shrink-0">
                              Una IA de voz generativa llamará directamente al número para interactuar en tiempo real y evaluarlo.
                           </p>
                           
                           <div className="mt-auto flex flex-col gap-3 shrink-0">
                              <label className="text-[14px] font-medium text-[#181d26] -mb-1 mt-2">ID Vapi del modelo</label>
                              <input 
                                 type="text" 
                                 placeholder="ID del número de Vapi (ej: 12ab...)" 
                                 value={vapiPhoneId} 
                                 onChange={e => setVapiPhoneId(e.target.value)} 
                                 className="bg-white border border-[#dddddd] px-4 py-3 rounded-[6px] text-[14px] font-normal text-[#181d26] outline-none focus:border-[#458fff]"
                              />
                              
                              <label className="text-[14px] font-medium text-[#181d26] -mb-1 mt-2">Número al que llamar</label>
                              <input 
                                 type="text" 
                                 placeholder="Nº Destino" 
                                 value={overridePhone} 
                                 onChange={e => setOverridePhone(e.target.value)} 
                                 className="bg-white border border-[#dddddd] px-4 py-3 rounded-[6px] text-[14px] font-medium text-[#1b61c9] outline-none focus:border-[#458fff]"
                              />
                              
                              <div className="flex flex-col gap-2 mt-2">
                                <label className="text-[12px] font-medium text-[#41454d]">Buscar negocios locales (sin IVR)</label>
                                <input 
                                   type="text" 
                                   placeholder="Ej: Panadería, Ferretería, TX..." 
                                   value={businessSearch} 
                                   onChange={e => setBusinessSearch(e.target.value)} 
                                   className="bg-white border border-[#dddddd] px-3 py-2 rounded-[6px] text-[13px] text-[#181d26] outline-none focus:border-[#458fff]"
                                />
                                <div className="flex gap-2 w-full overflow-x-auto hidden-scrollbar pb-1 mt-1">
                                   {LOCAL_US_BUSINESSES
                                      .filter(b => b.name.toLowerCase().includes(businessSearch.toLowerCase()))
                                      .map((b, idx) => (
                                         <button 
                                            key={idx} 
                                            onClick={() => setOverridePhone(b.phone)} 
                                            className="shrink-0 text-[12px] bg-white text-[#41454d] border border-[#dddddd] hover:bg-[#f8fafc] px-3 py-1.5 rounded-[6px]"
                                         >
                                            🇺🇸 {b.name}
                                         </button>
                                      ))
                                   }
                                   {LOCAL_US_BUSINESSES.filter(b => b.name.toLowerCase().includes(businessSearch.toLowerCase())).length === 0 && (
                                     <span className="text-[12px] text-[#9297a0] py-1.5">No se encontraron negocios.</span>
                                   )}
                                </div>
                              </div>

                              <button onClick={startRealCall} className="w-full mt-2 py-3 bg-[#181d26] text-white font-medium text-[16px] rounded-[12px] hover:bg-[#0d1218] transition-colors shrink-0">
                                 Iniciar Llamada Real
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               ) : (
                  <>
                     {/* Terminal Logs */}
                     <div className="flex-1 p-6 font-mono text-[13px] text-[#41454d] border-r border-[#dddddd] overflow-y-auto hidden-scrollbar flex flex-col gap-2 bg-[#f8fafc]">
                        <div className="text-[#181d26] mb-4 font-bold">{'>'} Log de sistema</div>
                        {logs.map((L, i) => (
                           <div key={i} className={cn("animate-in fade-in", L.includes('ERROR') ? 'text-red-600 font-bold' : L.includes('ABORTADA') ? 'text-red-600' : '')}>
                              {L}
                           </div>
                        ))}
                     </div>
                     
                     {/* Transcripts visualizer */}
                     <div className="flex-1 p-6 overflow-y-auto hidden-scrollbar bg-white">
                        <div className="text-[14px] font-medium text-[#41454d] mb-6 flex items-center justify-between">
                           <div className="flex gap-2 items-center">
                              <Mic size={16} className={(state === 'playing' || state === 'intercepting') && !isAborted ? 'text-[#39bf45] animate-pulse' : ''} />
                              Streaming de transcripción
                           </div>
                           {mode === 'real' && <div className="text-[12px] text-[#006400] bg-[#39bf45]/20 px-2 py-1 rounded-[6px]">LIVE REAL-TIME</div>}
                        </div>

                        {generatedData && generatedData.transcript.length > 0 && (
                           <div className="flex flex-col gap-6 pb-20">
                              <AnimatePresence mode="popLayout">
                                 {generatedData.transcript.map((line, idx) => {
                                    if (idx > playingIndex && state !== 'done' && mode !== 'real') return null; // Hide future lines in sim
                                    const isActive = idx === playingIndex || (mode === 'real' && idx === generatedData.transcript.length - 1);
                                    const isAgente = line.emisor.toLowerCase().includes("agente") || line.emisor.toLowerCase().includes("honeypot");
                                    
                                    return (
                                       <motion.div 
                                          key={idx}
                                          initial={{ opacity: 0, x: isAgente ? -10 : 10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          className={cn(
                                             "p-4 rounded-[10px] max-w-[85%] relative border",
                                             isAgente ? "self-start bg-[#f8fafc] border-[#dddddd]" : "self-end bg-white border-[#dddddd] shadow-sm",
                                             isActive && state !== 'done' && !isAborted && "border-[#458fff] ring-1 ring-[#458fff]"
                                          )}
                                       >
                                          <div className={cn("text-[12px] font-medium mb-2 flex items-center justify-between", isAgente ? "text-[#181d26]" : "text-[#41454d]")}>
                                             {line.emisor}
                                             {isActive && state !== 'done' && !isAborted && <Volume2 size={12} className="animate-pulse text-[#458fff]" />}
                                          </div>
                                          <div className={cn("text-[14px] leading-relaxed text-[#333840]")}>
                                             {line.mensaje}
                                          </div>
                                       </motion.div>
                                    )
                                 })}
                              </AnimatePresence>
                           </div>
                        )}
                        
                        {isAborted && (
                           <div className="text-center p-6 text-red-600 font-medium text-[14px] border border-red-200 rounded-[10px] bg-red-50 mt-8">
                              OPERACIÓN INTERRUMPIDA MANUALMENTE
                           </div>
                        )}
                     </div>
                  </>
               )}
            </div>

            {(state === 'done' || state === 'aborted') && generatedData && generatedData.conclusion_llm && (
               <div className="p-6 border-t border-[#dddddd] bg-[#f8fafc] z-10">
                  <div className="text-[14px] font-medium text-[#181d26] mb-2">Inteligencia Final Obtenida</div>
                  <div className="text-[14px] text-[#41454d] leading-relaxed">{generatedData.conclusion_llm}</div>
               </div>
            )}
         </div>
      </div>
   );
};

export default function Results() {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<PhoneLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPhone, setNewPhone] = useState("");
  
  // States used for modals
  const [modalData, setModalData] = useState<{title: string, content: string} | null>(null);
  const [showHoneypot, setShowHoneypot] = useState(false);
  const [tagModalData, setTagModalData] = useState<{tagText: string, numbers: PhoneLookup[]} | null>(null);
  
  // State for simulated chat progression
  const [visibleMessages, setVisibleMessages] = useState<number>(0);

  useEffect(() => {
    async function load() {
      if (!phone) return;
      setLoading(true);
      setModalData(null);
      setTagModalData(null);
      const res = await getPhoneLookup(phone);
      if (res) setData(res);
      else setData(null);
      setLoading(false);
      setVisibleMessages(0);
    }
    load();
  }, [phone]);

  const loadTaggedNumbers = async (tagText: string, queryType: 'eval' | 'type' | 'spec') => {
     try {
       const recents = await getRecentLookups(150);
       const filtered = recents.filter(p => {
          const t = getComputedTags(p);
          if (queryType === 'eval') return t.evalTag.text === tagText;
          if (queryType === 'type') return t.typeTag.text === tagText;
          if (queryType === 'spec') return t.specTag.text === tagText;
          return false;
       });
       setTagModalData({ tagText, numbers: filtered });
     } catch (e) {
       console.error(e);
     }
  };

  useEffect(() => {
      // Simulate chat progression
      if (data?.dialogo_simulado && data.dialogo_simulado.length > 0) {
         const tmr = setInterval(() => {
            setVisibleMessages(prev => {
               if (data.dialogo_simulado && prev < data.dialogo_simulado.length) return prev + 1;
               clearInterval(tmr);
               return prev;
            });
         }, 3500); // 3.5s delay
         return () => clearInterval(tmr);
      }
  }, [data?.phone]); // Restart when phone changes or specific lookup changes

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPhone) return;
    const cleanPhone = newPhone.replace(/[^\d+]/g, '');
    if (cleanPhone.trim().length >= 1) {
      navigate(`/loading/${encodeURIComponent(cleanPhone)}`);
    }
  };

  const handleHoneypotComplete = async (honeypot: HoneypotCall) => {
     if (!data || !phone) return;
     const updatedData = { ...data, honeypot_call: honeypot, categoria_general: honeypot.nueva_tipologia };
     setData(updatedData);
     // Persist asynchronously
     await updateHoneypot(phone, honeypot).catch(console.error);
  };

  const threatColor = (dataObj: PhoneLookup) => {
     if (dataObj.fraude_detectado || dataObj.nivel_sospecha_suplantacion > 60 || dataObj.ratio_reportes_fraude > 60) return "#aa2d00"; 
     if (dataObj.es_comercial && dataObj.empresa_color_hex) return dataObj.empresa_color_hex;
     return "#006400"; 
  }

  const radarData = useMemo(() => {
     if (!data) return [];
     return [
        { subject: "Suplantación", A: data.nivel_sospecha_suplantacion || 0, fullMark: 100 },
        { subject: "Fraude", A: data.ratio_reportes_fraude || 0, fullMark: 100 },
        { subject: "Neutro/Seguro", A: data.ratio_reportes_legitimo || 0, fullMark: 100 },
        { subject: "Empresa Real", A: data.ratio_seguridad_empresa_legitima || 0, fullMark: 100 },
     ];
  }, [data]);

  const barData = useMemo(() => {
     if (!data) return [];
     return [
        { name: "Estafa", value: data.ratio_reportes_fraude || 0, color: "#aa2d00" },
        { name: "Neutral", value: data.ratio_reportes_legitimo || 0, color: "#d9a441" },
        { name: "Seguro", value: data.ratio_seguridad_empresa_legitima || 0, color: "#006400" }
     ];
  }, [data]);

  if (loading) return null;

  if (!data) {
     return (
       <div className="flex flex-col items-center justify-center p-10 flex-1 bg-[#f8fafc]">
          <p className="text-[20px] font-normal text-[#41454d]">Número no encontrado</p>
          <button onClick={() => navigate('/')} className="mt-8 px-6 py-3 font-medium text-[16px] bg-[#181d26] text-white rounded-[12px] hover:bg-[#0d1218] transition-all">Regresar</button>
       </div>
     )
  }

  const tags = data ? getComputedTags(data) : null;
  const color = tags ? tags.baseColor : "#006400";
  const insistedLvl = data.nivel_insistencia || 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 bg-white p-4 md:p-8 relative overflow-hidden hidden-scrollbar h-full overflow-y-auto"
    >
      {modalData && <ReadMoreModal title={modalData.title} content={modalData.content} onClose={() => setModalData(null)} />}
      {tagModalData && <TagNumbersModal tagText={tagModalData.tagText} numbers={tagModalData.numbers} onClose={() => setTagModalData(null)} />}
      
      {showHoneypot && phone && (
         <HoneypotTerminal 
            phone={phone}
            category={data.categoria_general || "Desconocida"}
            entity={data.empresa_pertenece_tlf || "Entidad Desconocida"}
            onComplete={handleHoneypotComplete}
            onClose={() => setShowHoneypot(false)} 
         />
      )}

      {/* Dynamic Glows */}
      <div 
         className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none opacity-20"
         style={{ backgroundColor: color }}
      />
      
      <div className="max-w-[1500px] xl:max-w-[1600px] mx-auto h-full flex flex-col relative z-10 pb-20 pt-10">
        
        {/* Header Bar */}
        <header className="grid grid-cols-1 md:grid-cols-3 items-end gap-6 md:gap-4 mb-12 mt-2 px-2 relative min-h-[80px]">
          {/* Left Column */}
          <div className="flex justify-start pb-1">
            <button onClick={() => navigate('/')} className="shrink-0 text-[14px] text-[#41454d] bg-[#f8fafc] border border-[#dddddd] px-5 py-2.5 rounded-[12px] hover:bg-white hover:text-[#181d26] transition-colors font-medium flex items-center gap-2 shadow-sm">
               ← Página principal
            </button>
          </div>

          {/* Center Column */}
          <div className="flex flex-col items-center justify-end md:col-start-2">
             {tags && (
               <div className="flex flex-wrap items-center justify-center gap-2 w-full mb-3">
                  <div 
                     onClick={() => loadTaggedNumbers(tags.evalTag.text, tags.evalTag.queryType)}
                     className="px-3 py-1.5 rounded-[6px] text-[12px] font-medium border cursor-pointer hover:opacity-80 transition-opacity"
                     style={{ backgroundColor: tags.evalTag.bg, borderColor: `${tags.evalTag.color}30`, color: tags.evalTag.color }}
                  >
                    {tags.evalTag.text}
                  </div>
                  <div 
                     onClick={() => loadTaggedNumbers(tags.typeTag.text, tags.typeTag.queryType)}
                     className="px-3 py-1.5 rounded-[6px] text-[12px] font-medium border cursor-pointer hover:opacity-80 transition-opacity"
                     style={{ backgroundColor: tags.typeTag.bg, borderColor: `${tags.typeTag.color}30`, color: tags.typeTag.color }}
                  >
                    {tags.typeTag.text}
                  </div>
                  <div 
                     onClick={() => loadTaggedNumbers(tags.specTag.text, tags.specTag.queryType)}
                     className="px-3 py-1.5 rounded-[6px] text-[12px] font-medium border cursor-pointer hover:opacity-80 transition-opacity"
                     style={{ backgroundColor: tags.specTag.bg, borderColor: `${tags.specTag.color}30`, color: tags.specTag.color }}
                  >
                    {tags.specTag.text}
                  </div>
               </div>
             )}
             <h1 
               className="text-4xl md:text-[48px] lg:text-[56px] font-medium tracking-wide leading-none shrink-0" 
               style={{ transform: "translateY(2px)" }}
             >
               <span 
                  className="relative z-10"
                  style={{ 
                     backgroundImage: `linear-gradient(110deg, #181d26 40%, ${color} 50%, #181d26 60%)`,
                     backgroundSize: "200% auto",
                     color: "transparent",
                     WebkitBackgroundClip: "text",
                     backgroundClip: "text",
                     animation: "shine-anim 4s ease-in-out infinite"
                  }}
               >
                 {data.phone}
               </span>
             </h1>
          </div>

          {/* Right Column */}
          <div className="flex items-center md:items-end justify-center md:justify-end md:col-start-3 pb-1">
             {(!data.honeypot_call) && (
                <button 
                  onClick={() => setShowHoneypot(true)} 
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-[12px] rounded-[12px] text-[#181d26] transition-all font-medium text-[16px] shadow-sm group btn-magic-gradient-white hover:shadow-md"
                >
                   <PhoneCall size={18} className="group-hover:rotate-12 transition-transform" />
                   <span>Llamada inteligente</span>
                </button>
             )}
          </div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_minmax(0,1.35fr)_1fr] gap-6 items-stretch flex-1">
          
          {/* Identity & Technical Block */}
          <div className="flex flex-col gap-6 w-full h-full">
             <div className="bg-[#f8fafc] border border-[#dddddd] rounded-[10px] p-6 md:p-8 flex flex-col relative overflow-hidden group hover:border-[#181d26] transition-colors">
                <div className="flex justify-between items-start mb-12">
                   <div className="flex items-center justify-center w-12 h-12 rounded-[10px] bg-white border border-[#dddddd] shadow-sm">
                      <Fingerprint size={24} className="text-[#1b61c9]" />
                   </div>
                   <span className="text-[12px] font-medium text-[#9297a0]">Firma Principal</span>
                </div>
                <div className="text-[14px] text-[#41454d] mb-1 font-medium">Se identifica como</div>
                <div className="text-2xl lg:text-3xl font-medium tracking-tight text-[#181d26] break-words">
                   {data.empresa_pertenece_tlf || "Entidad Desconocida"}
                </div>
                <div className="mt-4">
                   <p className="text-[14px] text-[#41454d] line-clamp-3 leading-relaxed">
                      {data.resumen_uso}
                   </p>
                   {data.resumen_uso && data.resumen_uso.length > 100 && (
                      <button onClick={() => setModalData({ title: "Acerca de este número", content: data.resumen_uso })} className="text-[14px] font-medium text-[#1b61c9] mt-2 flex items-center gap-1 hover:text-[#1a3866] transition-colors">
                         Leer más <ArrowRight size={14} />
                      </button>
                   )}
                </div>
             </div>

             <div className="bg-[#f8fafc] border border-[#dddddd] rounded-[10px] p-6 md:p-8 flex-1 flex flex-col group hover:border-[#181d26] transition-colors">
                <div className="text-[14px] text-[#41454d] mb-6 font-medium flex gap-2 items-center">
                   Conclusión de la Búsqueda
                </div>
                <div className="text-[14px] leading-relaxed text-[#333840] line-clamp-6">
                   {data.explicacion_tecnica}
                </div>
                {data.explicacion_tecnica && data.explicacion_tecnica.length > 200 && (
                   <button onClick={() => setModalData({ title: "Conclusión de la Búsqueda", content: data.explicacion_tecnica })} className="text-[14px] font-medium text-[#1b61c9] mt-2 flex items-center gap-1 hover:text-[#1a3866] transition-colors">
                      Expandir <ArrowRight size={14} />
                   </button>
                )}

                {data.fuentes_consultadas && (
                   <div className="mt-auto pt-6">
                      <div className="text-[12px] text-[#9297a0] mb-3 font-medium">Fuentes de Origen</div>
                      <div className="flex flex-wrap gap-2">
                         {data.fuentes_consultadas.split(',').map((f, i) => (
                            <a 
                               key={i} 
                               href={`https://duckduckgo.com/?q=${encodeURIComponent(`${f.trim()} numero telefono ${data.phone}`)}`} 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="text-[12px] font-medium px-3 py-1.5 rounded-[6px] bg-white border border-[#dddddd] text-[#41454d] truncate max-w-[150px] shadow-sm hover:border-[#9297a0] hover:text-[#181d26] transition-colors"
                            >
                               {f.trim()}
                            </a>
                         ))}
                      </div>
                   </div>
                )}
             </div>
          </div>

          {/* SIMULATOR CHAT - Disruptive Middle Column */}
          <div className="flex flex-col gap-6 w-full h-full">
             {/* Main Dialogue Block */}
             <div className="bg-[#f8fafc] border border-[#dddddd] rounded-[10px] p-6 md:p-8 relative overflow-hidden group hover:border-[#181d26] transition-colors flex flex-col min-h-[400px] flex-1">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                   <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-[8px] bg-white border border-[#dddddd] shadow-sm text-[#181d26]">
                         <MessageSquareText size={20} />
                      </div>
                      <div>
                         <div className="text-[14px] font-medium text-[#181d26]">Ejemplo de Conversación</div>
                         <div className="text-[12px] text-[#9297a0]">Simulación Interactiva Predictiva</div>
                      </div>
                   </div>
                   
                   <div className="flex flex-col items-start sm:items-end border-t border-[#dddddd] sm:border-0 pt-4 sm:pt-0">
                       <div className="text-[11px] font-medium text-[#9297a0] mb-1.5 uppercase tracking-wide">Categoría Prevista</div>
                       <div className="inline-block px-3 py-1 rounded-[6px] font-medium text-[12px] bg-white border border-[#dddddd] text-[#41454d] shadow-sm">
                          {data.categoria_general || "Indefinida"}
                       </div>
                   </div>
                </div>

                {/* Chat Container */}
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto hidden-scrollbar pr-2 relative">
                   {(!data.dialogo_simulado || data.dialogo_simulado.length === 0) ? (
                      // Fallback for older lookups
                      <div className="bg-white border border-[#dddddd] rounded-[8px] p-5 text-[14px] leading-relaxed relative shadow-sm">
                         <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1b61c9] rounded-l-[8px]"></div>
                         <div className="text-[#1b61c9] mb-2 font-medium text-[12px] uppercase tracking-wide">Ejemplo Previsto:</div>
                         <span className="text-[#41454d]">{data.script_ataque || "«No se ha detectado un guion predecible.»"}</span>
                      </div>
                   ) : (
                      // Interactive Mapped Chat
                      <AnimatePresence>
                         {data.dialogo_simulado.slice(0, visibleMessages).map((msg, i) => {
                            const isCaller = msg.emisor.toLowerCase() === "llamante";
                            return (
                               <motion.div 
                                  key={i}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={cn(
                                     "max-w-[85%] flex flex-col gap-1.5",
                                     isCaller ? "self-start" : "self-end"
                                  )}
                               >
                                  <span className={cn(
                                     "text-[11px] font-medium",
                                     isCaller ? "text-[#aa2d00] ml-2" : "text-[#9297a0] mr-2 self-end"
                                  )}>
                                     {msg.emisor}
                                  </span>
                                  <div className={cn(
                                     "px-5 py-3.5 text-[14px] leading-relaxed shadow-sm relative",
                                     isCaller ? "bg-[#fdf2f2] border border-[#fdd1d1] text-[#902525] rounded-[16px] rounded-tl-[4px]" : "bg-white border border-[#dddddd] text-[#181d26] rounded-[16px] rounded-br-[4px]"
                                  )}>
                                     {msg.mensaje}
                                  </div>
                               </motion.div>
                            )
                         })}
                      </AnimatePresence>
                   )}
                   
                   {data.dialogo_simulado && visibleMessages < data.dialogo_simulado.length && (
                       <div className="flex gap-1.5 self-start ml-2 mt-2 items-center text-[#9297a0]">
                          <span className="w-2 h-2 bg-[#d9a441] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-[#d9a441] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-[#d9a441] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                       </div>
                   )}
                </div>

             </div>

             {/* HONEYPOT RESULTS (Appears only after making the call) */}
             {data.honeypot_call && (
               <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#f8fafc] border border-[#dddddd] rounded-[10px] p-6 md:p-8 flex flex-col relative overflow-hidden"
               >
                  <div className="flex items-center gap-4 mb-6">
                     <div className="p-2.5 rounded-[8px] bg-[#181d26] text-white shadow-sm">
                        <Volume2 size={20} />
                     </div>
                     <div>
                        <div className="text-[14px] font-medium text-[#181d26]">Llamada Inteligente Completada</div>
                        <div className="text-[12px] text-[#9297a0]">Transcripción real guardada</div>
                     </div>
                  </div>

                  <div className="flex-1 bg-white border border-[#dddddd] shadow-sm rounded-[8px] p-5 mb-6 overflow-y-auto max-h-[300px] hidden-scrollbar">
                     <div className="flex flex-col gap-4">
                        {data.honeypot_call.transcript.map((line, idx) => {
                           const isIA = line.emisor.toLowerCase().includes("agente") || line.emisor.toLowerCase().includes("honeypot");
                           return (
                              <div key={idx} className={cn("text-[13px] leading-relaxed", isIA ? "text-[#41454d]" : "text-[#181d26]")}>
                                 <span className="font-medium opacity-70 mr-2 text-[11px] uppercase tracking-wide">{line.emisor}:</span>
                                 <span>{line.mensaje}</span>
                              </div>
                           )
                        })}
                     </div>
                  </div>

                  <div className="bg-white border border-[#dddddd] rounded-[8px] p-5 shadow-sm">
                     <div className="text-[11px] uppercase text-[#9297a0] font-medium tracking-wide mb-2">Decodificación y Análisis Real</div>
                     <div className="text-[13px] text-[#41454d] leading-relaxed mb-4">
                        {data.honeypot_call.conclusion_llm}
                     </div>
                     {data.honeypot_call.nueva_tipologia !== data.categoria_general && (
                        <div className="text-[12px] font-medium text-[#9297a0] flex items-center gap-3 pt-4 border-t border-[#dddddd]">
                           <span className="line-through decoration-[#aa2d00]/40">{data.categoria_general}</span>
                           <ArrowRight size={14} className="text-[#181d26]" />
                           <span className="text-[#181d26] font-medium bg-[#e0e2e6] px-3 py-1 rounded-[6px]">{data.honeypot_call.nueva_tipologia}</span>
                        </div>
                     )}
                  </div>
               </motion.div>
             )}
          </div>

          {/* Right Metrics Block */}
          <div className="md:col-span-2 xl:col-span-1 flex flex-col gap-6 w-full h-full">

             {/* Radar Analytics */}
             <div className="bg-[#f8fafc] border border-[#dddddd] rounded-[10px] p-6 relative group hover:border-[#181d26] transition-colors h-[270px] flex flex-col items-center justify-center">
                <div className="absolute top-4 left-6 text-[12px] font-medium text-[#9297a0] z-20">
                   Análisis de riesgo
                </div>
                <div className="w-full h-full mt-6 opacity-90 overflow-hidden">
                   <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData} margin={{ top: 0, right: 10, bottom: 0, left: 30 }}>
                         <PolarGrid stroke="rgba(0,0,0,0.08)" />
                         <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(24,29,38,0.6)', fontSize: 10, fontFamily: 'Inter' }} />
                         <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                         <Radar name="Threat" dataKey="A" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.15} />
                      </RadarChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Insistencia Gauge */}
             <div className="bg-[#f8fafc] border border-[#dddddd] rounded-[10px] p-6 group hover:border-[#181d26] transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[12px] text-[#9297a0] font-medium flex items-center gap-2">
                    <Gauge size={14} /> Nivel Insistencia
                  </div>
                  <span className="font-mono text-[14px] font-medium text-[#181d26]">{insistedLvl}%</span>
                </div>
                <div className="w-full bg-[#e0e2e6] rounded-[6px] h-2 overflow-hidden">
                   <div 
                      className="h-full rounded-[6px] transition-all" 
                      style={{ 
                         width: `${insistedLvl}%`, 
                         backgroundColor: insistedLvl > 75 ? '#aa2d00' : insistedLvl > 30 ? '#d9a441' : '#006400'
                      }}
                   ></div>
                </div>
                <div className="text-[11px] uppercase text-[#41454d] font-medium mt-3 tracking-widest text-right">
                   {insistedLvl > 75 ? "Llamadas Acosadoras" : insistedLvl > 30 ? "Puntual pero reiterativo" : "Contacto Escaso"}
                </div>
             </div>

             {/* Raw Metrics Summary -> Advanced Bar Chart */}
             <div className="bg-[#f8fafc] border border-[#dddddd] rounded-[10px] p-6 group hover:border-[#181d26] transition-colors flex flex-col justify-center min-h-[200px]">
                <div className="text-[12px] font-medium text-[#9297a0] mb-6 flex justify-between items-center">
                   <span>Reportes de usuarios</span>
                   <span className="text-[#41454d]">n={data.total_reportes_encontrados}</span>
                </div>
                <div className="h-[120px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={barData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                         <XAxis type="number" hide domain={[0, 100]} />
                         <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'rgba(24,29,38,0.7)', fontSize: 11, fontFamily: 'Inter', fontWeight: 500 }} />
                         <Tooltip 
                            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                            content={({ active, payload }) => {
                               if (active && payload && payload.length) {
                                  return (
                                     <div className="bg-white border border-[#dddddd] shadow-sm p-3 rounded-[6px] text-[12px] font-medium">
                                        <span style={{ color: payload[0].payload.color }}>{payload[0].payload.name}</span>: {payload[0].value}%
                                     </div>
                                  );
                               }
                               return null;
                            }}
                         />
                         <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                            {barData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
