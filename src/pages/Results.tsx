import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PhoneLookup, getPhoneLookup } from "../services/firebaseService";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { ArrowLeft, Briefcase, Info, AlertTriangle, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export default function Results() {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<PhoneLookup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!phone) return;
      const res = await getPhoneLookup(phone);
      if (res) {
        setData(res);
      }
      setLoading(false);
    }
    load();
  }, [phone]);

  if (loading) return null;

  if (!data) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-xl">No data found for this number.</p>
          <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 border border-neutral-700 rounded hover:bg-neutral-800">Return Home</button>
       </div>
     )
  }

  const isHighRisk = data.riskScore > 60;
  const isMedRisk = data.riskScore > 30 && data.riskScore <= 60;
  const color = isHighRisk ? "#ef4444" : isMedRisk ? "#eab308" : "#22c55e"; // red, yellow, green
  const chartData = [{ name: "Risk", value: data.riskScore, fill: color }];

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto flex flex-col">
       <button onClick={() => navigate('/')} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors self-start mb-8 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>New Query</span>
       </button>

       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="grid grid-cols-1 lg:grid-cols-3 gap-6"
       >
          {/* Score Card */}
          <div className="lg:col-span-1 rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 flex flex-col items-center justify-center relative overflow-hidden">
             
             <div className="absolute top-0 w-full h-1" style={{ backgroundColor: color }} />
             
             <h2 className="text-neutral-400 font-mono tracking-widest text-sm uppercase mb-8">Threat Gauge</h2>
             
             <div className="h-[240px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                   <RadialBarChart 
                      cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" 
                      barSize={16} data={chartData} 
                      startAngle={180} endAngle={0}
                   >
                     <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                     <RadialBar background={{ fill: "#262626" }} dataKey="value" cornerRadius={8} />
                   </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center -mt-6">
                   <span className="text-6xl font-bold tracking-tighter" style={{ color }}>{data.riskScore}</span>
                   <span className="text-neutral-500 text-sm mt-1">/ 100</span>
                </div>
             </div>

             <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-neutral-950 border border-neutral-800">
                {isHighRisk ? (
                   <><AlertTriangle className="w-4 h-4 text-red-500" /> <span className="text-sm">High Fraud Probability</span></>
                ) : isMedRisk ? (
                   <><Info className="w-4 h-4 text-yellow-500" /> <span className="text-sm">Moderate Suspicion</span></>
                ) : (
                   <><ShieldCheck className="w-4 h-4 text-emerald-500" /> <span className="text-sm">Likely Safe / Legitimate</span></>
                )}
             </div>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
             <div className="rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-8 border-b border-neutral-800">
                   <div>
                      <h3 className="text-neutral-500 font-mono text-sm uppercase mb-1">Target Identity</h3>
                      <p className="text-3xl md:text-5xl font-mono tracking-tight">{data.phone}</p>
                   </div>
                   <div className={cn("px-4 py-2 rounded-xl text-sm font-medium border hidden md:block", isHighRisk ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400")}>
                      {isHighRisk ? "FLAGGED" : "CLEARED"}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                         <Briefcase className="w-4 h-4 text-neutral-400" />
                      </div>
                      <div>
                         <h4 className="text-neutral-500 text-sm mb-1">Business Association</h4>
                         <p className="text-lg font-medium">{data.possibleCompany || "Unknown Entity"}</p>
                         {data.commercialUsage && <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Commercial Number</span>}
                      </div>
                   </div>
                   
                   <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                         <Info className="w-4 h-4 text-neutral-400" />
                      </div>
                      <div>
                         <h4 className="text-neutral-500 text-sm mb-1">Primary Purpose</h4>
                         <p className="text-lg font-medium">{data.purpose}</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 flex-1">
                <h4 className="text-neutral-500 font-mono text-sm uppercase mb-4">Intelligence Summary</h4>
                <p className="text-neutral-300 leading-relaxed text-lg font-light">
                   {data.summary}
                </p>
             </div>
          </div>

       </motion.div>
    </div>
  );
}
