import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, Target, Factory, Droplets, 
  Settings2, X, BatteryCharging, CheckCircle2, Container 
} from "lucide-react";

// ==========================================
// FRAMER MOTION VARIANTS
// ==========================================
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

// ==========================================
// HELPER FUNCTION
// ==========================================
const getProgress = (actual, target) => {
  if (!target || target === 0) return 0;
  return Math.min((actual / target) * 100, 100).toFixed(1);
};

// ==========================================
// KOMPONEN KARTU (DIPISAH KE LUAR AGAR TIDAK BERKEDIP)
// ==========================================
const HeroCard = ({ title, icon: Icon, actual, target, unit, colorClass, shadowClass }) => {
  const progress = getProgress(actual, target);
  const isOverTarget = actual >= target;

  return (
    <motion.div variants={cardVariants} className="bg-white/[0.02] backdrop-blur-[24px] border border-white/[0.08] p-5 rounded-3xl shadow-sm hover:bg-white/[0.04] transition-all relative overflow-hidden flex flex-col justify-between h-40">
      <div className="flex justify-between items-start">
        <p className="text-white/50 text-[9px] xl:text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
          <Icon size={14} className={colorClass} /> {title}
        </p>
        <span className={`text-[9px] font-bold px-2 py-1 rounded-md border transition-colors ${isOverTarget ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
          {progress}%
        </span>
      </div>
      
      <div>
        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-2xl xl:text-3xl font-semibold text-white tracking-tight">
            {Number(actual).toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] xl:text-xs text-white/40">{unit}</span>
        </div>
        <p className="text-[9px] xl:text-[10px] text-white/30 font-medium">Target: {Number(target).toLocaleString('id-ID')} {unit}</p>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
        <div className={`h-full ${shadowClass} transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>
      </div>
    </motion.div>
  );
};

const YieldCard = ({ actual }) => (
  <motion.div variants={cardVariants} className="bg-white/[0.02] backdrop-blur-[24px] border border-white/[0.08] p-5 rounded-3xl shadow-sm hover:bg-white/[0.04] transition-all relative flex flex-col justify-between h-40">
    <p className="text-white/50 text-[9px] xl:text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
      <TrendingUp size={14} className="text-emerald-400" /> Yield Extraction
    </p>
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-3xl xl:text-4xl font-semibold text-emerald-400">{actual}</p>
        <span className="text-sm text-white/40">%</span>
      </div>
      <p className="text-[9px] xl:text-[10px] text-white/40 font-medium">Std Target: 65% (Optimal)</p>
    </div>
  </motion.div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
const SummaryDashboard = ({ opcData }) => {
  const role = localStorage.getItem('role') || 'viewer';
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  
  // 1. Ambil target dari LocalStorage jika ada, jika tidak gunakan default
  const getInitialTargets = () => {
    const saved = localStorage.getItem('dashboard_targets');
    if (saved) return JSON.parse(saved);
    return {
      rawMaterial: 150000, 
      dc: 5000,           
      cwcInput: 15000,    
      cwcOutput: 12000,   
      ccl65: 25000,       
      ccl200: 8000        
    };
  };

  const [targets, setTargets] = useState(getInitialTargets);
  
  // State khusus untuk menampung inputan saat modal terbuka
  const [editTargets, setEditTargets] = useState(targets);

  // 2. Fungsi buka modal
  const handleOpenModal = () => {
    setEditTargets(targets); // Sinkronisasi nilai form dengan target aktif saat ini
    setIsTargetModalOpen(true);
  };

  // 3. Fungsi update field secara spesifik
  const handleTargetChange = (field, value) => {
    setEditTargets(prev => ({
      ...prev,
      [field]: Number(value) || 0
    }));
  };

  // 4. Fungsi simpan & tutup modal
  const handleSaveTargets = () => {
    setTargets(editTargets);
    localStorage.setItem('dashboard_targets', JSON.stringify(editTargets)); // Simpan di browser
    setIsTargetModalOpen(false);
  };

  // ==========================================
  // PENGGANTIAN VARIABEL DINAMIS (MAPPING OPC)
  // ==========================================
  const actuals = {
    // 1. Raw Material Kupas (Butir) -> OPC Opening
    rawMaterial: opcData?.['Opening-Panel']?.['total_counter'] || opcData?.['Opening']?.['total_counter'] || 0, 
    
    // 2. Raw Material Air Kelapa (Liter/Input) -> OPC CWC
    cwcInput: opcData?.['CWC']?.['input_totalizer'] || 0,
    
    // 3. Output Air Kelapa (Liter/Output) -> OPC WaterFlow
    cwcOutput: opcData?.['WaterFlow']?.['ft_cwc_output_today'] || 0,
    
    // Sisa data (sementara statis sampai panel lain siap)
    dc: 0,
    ccl65: 0,
    ccl200: 0,
    yieldExt: 68.5, 
    powerUsage: 120.5 
  };

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden font-sans bg-[#09090b]">
      
      {/* AMBIENT BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[30%] w-[40vw] h-[40vw] bg-indigo-500/5 rounded-full blur-[120px] mix-blend-screen opacity-50"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[35vw] h-[35vw] bg-emerald-500/5 rounded-full blur-[120px] mix-blend-screen opacity-40"></div>
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between relative z-10 mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-wide">Executive Summary</h1>
          <p className="text-[10px] md:text-xs text-white/50 mt-1.5 font-medium tracking-widest uppercase">Plant Performance Overview</p>
        </div>

        <div className="flex gap-3">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-[9px] md:text-[10px] text-white/70 font-bold uppercase tracking-widest">Today, {new Date().toLocaleDateString('id-ID')}</span>
          </div>

          {(role === 'admin' || role === 'manager') && (
            <button 
              onClick={handleOpenModal}
              className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            >
              <Settings2 size={14} /> Set Targets
            </button>
          )}
        </div>
      </div>

      {/* Grid Animasi Utama */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 space-y-6"
      >
        {/* ROW 1: 5 KOLOM CORE METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <HeroCard 
            title="Raw Material (Kupas)" 
            icon={Factory} 
            actual={actuals.rawMaterial} 
            target={targets.rawMaterial} 
            unit="Butir" 
            colorClass="text-sky-400" 
            shadowClass="bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]" 
          />
          
          <YieldCard actual={actuals.yieldExt} />

          <HeroCard 
            title="DC Output" 
            icon={Target} 
            actual={actuals.dc} 
            target={targets.dc} 
            unit="Kg" 
            colorClass="text-amber-400" 
            shadowClass="bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" 
          />

          <HeroCard 
            title="Input Air Kelapa" 
            icon={Droplets} 
            actual={actuals.cwcInput} 
            target={targets.cwcInput} 
            unit="Liter" 
            colorClass="text-blue-400" 
            shadowClass="bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" 
          />

          <HeroCard 
            title="Output Air Kelapa" 
            icon={Container} 
            actual={actuals.cwcOutput} 
            target={targets.cwcOutput} 
            unit="Liter" 
            colorClass="text-purple-400" 
            shadowClass="bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.8)]" 
          />
        </div>

        {/* ROW 2: FILLING MACHINES & UTILITIES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          <motion.div variants={cardVariants} className="lg:col-span-2 bg-white/[0.02] backdrop-blur-[24px] border border-white/[0.08] p-6 rounded-3xl shadow-sm">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-6">Filling Machine Status</h3>
            <div className="space-y-4">
              
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-indigo-400 rounded-full"></div>
                  <div>
                    <p className="text-sm font-semibold text-white">CCL 65ml <span className="text-[9px] text-indigo-300 ml-2 bg-indigo-500/10 px-2 py-0.5 rounded">7 Lines Active</span></p>
                    <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">Aggregated Total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{actuals.ccl65.toLocaleString('id-ID')} <span className="text-xs text-white/40 font-normal">Karton</span></p>
                  <p className="text-[10px] text-white/40 mt-0.5">Target: {targets.ccl65.toLocaleString('id-ID')}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-rose-400 rounded-full"></div>
                  <div>
                    <p className="text-sm font-semibold text-white">CCL 200ml <span className="text-[9px] text-rose-300 ml-2 bg-rose-500/10 px-2 py-0.5 rounded">1 Line Active</span></p>
                    <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">Line 8 Status</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{actuals.ccl200.toLocaleString('id-ID')} <span className="text-xs text-white/40 font-normal">Karton</span></p>
                  <p className="text-[10px] text-white/40 mt-0.5">Target: {targets.ccl200.toLocaleString('id-ID')}</p>
                </div>
              </div>

            </div>
          </motion.div>

          <motion.div variants={cardVariants} className="bg-white/[0.02] backdrop-blur-[24px] border border-white/[0.08] p-6 rounded-3xl shadow-sm flex flex-col justify-center">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-6">Plant Efficiency</h3>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-400/30 mb-4 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <BatteryCharging className="text-cyan-400" size={28} />
              </div>
              <p className="text-4xl font-semibold text-white tracking-tight">{actuals.powerUsage}</p>
              <p className="text-xs text-cyan-300 mt-2 font-medium">kWh / Ton Output</p>
              <p className="text-[10px] text-white/40 mt-3 border-t border-white/10 pt-3">Optimal jika berada di bawah 130 kWh/Ton. Menandakan mesin bekerja efisien tanpa idle berlebih.</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* TARGET MODAL */}
      <AnimatePresence>
        {isTargetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsTargetModalOpen(false)}
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md bg-[#18181b] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Update Daily Targets</h2>
                <button onClick={() => setIsTargetModalOpen(false)} className="text-white/40 hover:text-white"><X size={18}/></button>
              </div>
              <div className="p-6 space-y-4">
                
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5">Raw Material (Butir)</label>
                  <input 
                    type="number" 
                    value={editTargets.rawMaterial} 
                    onChange={(e) => handleTargetChange('rawMaterial', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" 
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5">DC (Kg)</label>
                  <input 
                    type="number" 
                    value={editTargets.dc} 
                    onChange={(e) => handleTargetChange('dc', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5">Input Air Kelapa (L)</label>
                    <input 
                      type="number" 
                      value={editTargets.cwcInput} 
                      onChange={(e) => handleTargetChange('cwcInput', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5">Output CWC (L)</label>
                    <input 
                      type="number" 
                      value={editTargets.cwcOutput} 
                      onChange={(e) => handleTargetChange('cwcOutput', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                {/* Bagian Input Filling Mesin */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5">Target CCL 65</label>
                    <input 
                      type="number" 
                      value={editTargets.ccl65} 
                      onChange={(e) => handleTargetChange('ccl65', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5">Target CCL 200</label>
                    <input 
                      type="number" 
                      value={editTargets.ccl200} 
                      onChange={(e) => handleTargetChange('ccl200', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSaveTargets}
                  className="w-full mt-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> Save Targets
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default SummaryDashboard;