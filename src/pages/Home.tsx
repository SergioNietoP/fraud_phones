import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldAlert, Activity, Database, History, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { getRecentLookups, PhoneLookup } from "../services/firebaseService";

export default function Home() {
  const [phone, setPhone] = useState("");
  const [recent, setRecent] = useState<PhoneLookup[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getRecentLookups().then(data => setRecent(data));
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\\d+]/g, '');
    if (cleanPhone.length > 5) {
      navigate(`/loading/${encodeURIComponent(cleanPhone)}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-4 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-xs font-mono tracking-widest text-emerald-400 uppercase bg-emerald-400/10 border border-emerald-400/20 rounded-full">
          <Activity className="w-3 h-3" />
          Neural Threat Intelligence
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
          Trace Any Identity. <br/> Anticipate Fraud.
        </h1>
        <p className="text-neutral-400 text-lg md:text-xl max-w-2xl mx-auto font-light">
          Our specialized agent scans public internet and deep web resources to cross-verify numbers, determine commercial usage, and flag potential scams.
        </p>
      </motion.div>

      <motion.form 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSearch} 
        className="w-full max-w-md relative group"
      >
        <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-2xl group-hover:bg-emerald-500/30 transition-colors" />
        <div className="relative flex items-center bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
          <div className="pl-6 text-neutral-500">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 800 555 0199" 
            className="flex-1 bg-transparent px-4 py-6 text-xl placeholder-neutral-600 focus:outline-none text-neutral-100 font-mono"
            autoFocus
          />
          <button 
            type="submit"
            className={cn(
               "mr-3 px-6 py-3 rounded-xl font-medium transition-all",
               phone.length > 5 
                 ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                 : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
            )}
          >
            Trace
          </button>
        </div>
      </motion.form>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl"
      >
         {[
           { icon: Database, title: "Aggregated Sources", desc: "We query dozens of public forums, registries, and spam directories." },
           { icon: ShieldAlert, title: "Risk Scoring", desc: "Our LLM evaluates contextual signals to produce an accurate threat score." },
           { icon: Activity, title: "Historical Memory", desc: "Results are cached in our encrypted database for instant retrieval later." },
         ].map((feature, i) => (
           <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
             <feature.icon className="w-8 h-8 text-neutral-500 mb-4" />
             <h3 className="text-lg font-medium tracking-tight mb-2">{feature.title}</h3>
             <p className="text-sm text-neutral-500 leading-relaxed">{feature.desc}</p>
           </div>
         ))}
      </motion.div>

      {recent.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-24 w-full max-w-2xl border-t border-neutral-800 pt-12 pb-12"
        >
           <div className="flex items-center gap-2 text-neutral-500 mb-6">
              <History className="w-4 h-4" />
              <h2 className="text-sm font-mono uppercase tracking-widest">Global Scan History</h2>
           </div>
           <div className="space-y-4">
              {recent.map((item, idx) => {
                 const isHighRisk = item.riskScore > 60;
                 return (
                    <div 
                      key={idx}
                      onClick={() => navigate(`/results/${encodeURIComponent(item.phone)}`)}
                      className="group flex items-center justify-between p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/50 hover:bg-neutral-800 hover:border-neutral-700 cursor-pointer transition-all"
                    >
                       <div className="flex items-center gap-4">
                          <div className={cn("px-2 py-1 rounded-md text-xs font-mono border", isHighRisk ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20")}>
                             {item.riskScore}/100
                          </div>
                          <div>
                             <p className="font-mono text-neutral-200">{item.phone}</p>
                             <p className="text-xs text-neutral-500 truncate max-w-[200px] md:max-w-xs">{item.possibleCompany || item.purpose}</p>
                          </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </div>
                 )
              })}
           </div>
        </motion.div>
      )}

    </div>
  );
}
