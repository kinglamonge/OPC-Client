import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Power,
  Droplets,
  TestTube,
  Database,
  FlaskConical,
  PackageCheck,
  Factory,
  CalendarDays,
  Activity,
  Settings
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ==========================================
// KARTU LIQUID GLASS (KONSISTEN TEMA)
// ==========================================
const LiquidGlassCard = ({ children, className = "", contentClassName = "" }) => (
  <div className={`relative bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 border border-white/10 transition-all duration-500 overflow-hidden flex flex-col ${className}`}>
    <div className={`relative z-10 flex-1 flex flex-col w-full h-full ${contentClassName}`}>
      {children}
    </div>
  </div>
);

const CWC = ({ opcData }) => {
  const cwcData = opcData?.CWC || {};
  const token = localStorage.getItem('token');

  // Helper mendapatkan nilai dan format angka ribuan
  const getValue = (key, defaultVal = 0) => cwcData[key] !== undefined ? Number(cwcData[key]) : defaultVal;
  const formatNumber = (num) => Number(num).toLocaleString('id-ID');

  // ==========================================
  // STATE TREND MINGGUAN
  // ==========================================
  const [weeklyTrends, setWeeklyTrends] = useState({
    input: [
      { day: 'Sen', total: 0 }, { day: 'Sel', total: 0 }, { day: 'Rab', total: 0 },
      { day: 'Kam', total: 0 }, { day: 'Jum', total: 0 }, { day: 'Sab', total: 0 }, { day: 'Min', total: 0 }
    ],
    output: [
      { day: 'Sen', total: 0 }, { day: 'Sel', total: 0 }, { day: 'Rab', total: 0 },
      { day: 'Kam', total: 0 }, { day: 'Jum', total: 0 }, { day: 'Sab', total: 0 }, { day: 'Min', total: 0 }
    ]
  });

  useEffect(() => {
    const fetchCwcTrends = async () => {
      try {
        const response = await fetch(`http://${window.location.hostname}:3001/api/cwc/trends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if(response.ok) {
          const data = await response.json();
          setWeeklyTrends(data);
        }
      } catch (error) {
        console.warn("Gagal mengambil data trend mingguan CWC dari DB.");
      }
    };
    
    fetchCwcTrends();
    const trendTimer = setInterval(fetchCwcTrends, 5 * 60 * 1000); 
    return () => clearInterval(trendTimer);
  }, [token]);

  // ==========================================
  // LOGIKA STATUS MESIN (COMPACT MODE)
  // ==========================================
  const getMachineState = (isCIP, isSter, isProd) => {
    if (isProd) return { state: "PRODUKSI", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40", icon: <Power size={14} className="animate-pulse" /> };
    if (isSter) return { state: "STERIL / FLUSH", color: "bg-orange-500/20 text-orange-400 border-orange-500/40", icon: <Droplets size={14} className="animate-pulse" /> };
    if (isCIP) return { state: "CIP ACTIVE", color: "bg-blue-500/20 text-blue-400 border-blue-500/40", icon: <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '3s' }} /> };
    return { state: "IDLE", color: "bg-white/5 text-gray-500 border-white/10", icon: <Power size={14} /> };
  };

  const CompactMachineStatus = ({ name, cip, ster, prod }) => {
    const { state, color, icon } = getMachineState(cip, ster, prod);
    return (
      <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
        <span className="text-sm font-bold text-gray-300 tracking-wide">{name}</span>
        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border flex items-center gap-2 tracking-widest ${color}`}>
          {icon} {state}
        </span>
      </div>
    );
  };

  // Status Evaporator (Menggunakan nilai step 140)
  const evapCip = Number(cwcData["evap_cip_step"] ?? 0) === 140;
  const evapSter = Number(cwcData["evap_ster_step"] ?? 0) === 140;
  const evapProd = Number(cwcData["evap_prod_step"] ?? 0) === 140;

  // Logika peringatan BRIX Evaporator
  const brixVal = parseFloat(getValue("evap_brix"));
  const isEvapProdRunning = evapProd;
  const isBrixOutOfRange = isEvapProdRunning && (brixVal < 60 || brixVal > 64);

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden font-sans">
      {/* ORNAMEN KOSMIK LATAR BELAKANG */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-cyan-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER HALAMAN */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Factory size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 tracking-wide uppercase">
              Coconut Water Concentrated
            </h1>
            <p className="text-[10px] md:text-xs text-cyan-100/50 mt-1 font-bold tracking-[0.15em] uppercase">
              Production Summary & Process Monitor
            </p>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* LEVEL 1: HIGHLIGHT PRODUKSI HARIAN (TOP)   */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        <LiquidGlassCard className="group border-indigo-500/20 hover:border-indigo-500/40 shadow-[0_8px_32px_0_rgba(99,102,241,0.1)]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 opacity-80"></div>
          <div className="flex items-center justify-between h-full">
            <div className="pl-3 relative z-10">
              <p className="text-indigo-200/60 text-[10px] font-bold uppercase tracking-widest mb-1">Today's Input (Drilling)</p>
              <p className="text-3xl font-mono text-white font-black drop-shadow-md">
                {formatNumber(getValue("input_totalizer"))} <span className="text-sm font-sans text-indigo-400/50 font-medium">L</span>
              </p>
            </div>
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl backdrop-blur-sm">
              <Database size={28} />
            </div>
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard className="group border-teal-500/20 hover:border-teal-500/40 shadow-[0_8px_32px_0_rgba(20,184,166,0.1)]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500 opacity-80"></div>
          <div className="flex items-center justify-between h-full">
            <div className="pl-3 min-w-0 relative z-10">
              <p className="text-teal-200/60 text-[10px] font-bold uppercase tracking-widest mb-1">Today's Output (Non-UHT)</p>
              <p className="text-3xl font-mono text-teal-400 font-black drop-shadow-md">
                {formatNumber(getValue("evap_output_totalizer"))} <span className="text-sm font-sans text-teal-400/50 font-medium ml-1">L</span>
              </p>
            </div>
            <div className="p-3.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl">
              <FlaskConical size={28} />
            </div>
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard className="group border-yellow-500/20 hover:border-yellow-500/40 shadow-[0_8px_32px_0_rgba(234,179,8,0.1)]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500 opacity-80"></div>
          <div className="flex items-center justify-between h-full">
            <div className="pl-3 min-w-0 relative z-10">
              <p className="text-yellow-200/60 text-[10px] font-bold uppercase tracking-widest mb-1">Today's Output (UHT)</p>
              <p className="text-3xl font-mono text-yellow-400 font-black drop-shadow-md">
                {formatNumber(getValue("astepo_output_totalizer"))} <span className="text-sm font-sans text-yellow-400/50 font-medium ml-1">L</span>
              </p>
            </div>
            <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-2xl">
              <PackageCheck size={28} />
            </div>
          </div>
        </LiquidGlassCard>
      </div>

      {/* ========================================== */}
      {/* LEVEL 2: TREND PRODUKSI MINGGUAN (Tengah)  */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 relative z-10">
        <LiquidGlassCard>
          <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                <CalendarDays size={18} /> Trend Input Mingguan
              </h3>
              <p className="text-xs text-white/50">Volume Air Kelapa Mentah (Liter)</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Total Akumulasi</p>
              <p className="text-2xl font-black text-indigo-300 drop-shadow-md">
                {formatNumber(weeklyTrends.input.reduce((a, b) => a + b.total, 0))} <span className="text-xs text-white/50 font-medium">L</span>
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrends.input} margin={{ top: 15, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis dataKey="day" stroke="#ffffff40" tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" tick={{ fill: '#cbd5e1', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#ffffff0a' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#818cf8', fontWeight: 'bold' }} formatter={(value) => [`${formatNumber(value)} L`, "Volume"]} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={50} isAnimationActive={true}>
                  {weeklyTrends.input.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.total > 0 ? '#818cf8' : '#ffffff10'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard>
          <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                <CalendarDays size={18} /> Trend Output Mingguan
              </h3>
              <p className="text-xs text-white/50">Volume Produksi CWC Non-UHT (Liter)</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Total Akumulasi</p>
              <p className="text-2xl font-black text-teal-300 drop-shadow-md">
                {formatNumber(weeklyTrends.output.reduce((a, b) => a + b.total, 0))} <span className="text-xs text-white/50 font-medium">L</span>
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrends.output} margin={{ top: 15, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis dataKey="day" stroke="#ffffff40" tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" tick={{ fill: '#cbd5e1', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#ffffff0a' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#2dd4bf', fontWeight: 'bold' }} formatter={(value) => [`${formatNumber(value)} L`, "Volume"]} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={50} isAnimationActive={true}>
                  {weeklyTrends.output.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.total > 0 ? '#2dd4bf' : '#ffffff10'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </LiquidGlassCard>
      </div>

      {/* ========================================== */}
      {/* LEVEL 3: PROSES LIVE & STATUS MESIN        */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        
        {/* Kolom Kiri: Flowrate & BRIX */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LiquidGlassCard className="group">
            <div className="pl-2 relative z-10 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-blue-400" />
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Live Flowrate</p>
              </div>
              <p className="text-3xl font-mono text-white font-bold drop-shadow-md">
                {formatNumber(getValue("flowrate_input"))} <span className="text-sm font-sans text-gray-500 font-normal">L/h</span>
              </p>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard className={`group ${isBrixOutOfRange ? "border-red-500/50" : ""}`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full opacity-80 ${isBrixOutOfRange ? "bg-red-500" : "bg-orange-500"}`}></div>
            <div className="pl-3 relative z-10 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 mb-2">
                <TestTube size={16} className={isBrixOutOfRange ? "text-red-400" : "text-orange-400"} />
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Evaporator BRIX</p>
              </div>
              <p className={`text-3xl font-mono font-bold drop-shadow-md transition-colors duration-300 ${isBrixOutOfRange ? "text-red-500 animate-pulse" : "text-white"}`}>
                {getValue("evap_brix")}
                <span className={`text-sm font-sans ml-1 font-normal ${isBrixOutOfRange ? "text-red-400" : "text-gray-500"}`}>%</span>
                {isBrixOutOfRange && (
                  <span className="ml-3 px-2 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-[10px] font-sans text-red-400 tracking-wide uppercase">
                    {brixVal < 60 ? "Low" : "High"}
                  </span>
                )}
              </p>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Kolom Kanan: Compact Machine Status */}
        <LiquidGlassCard>
          <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
            <Settings size={18} className="text-cyan-400" />
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.2em]">Operational Status</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CompactMachineStatus 
              name="1. Pasteuriser" 
              cip={Number(cwcData["pasteur_cip"]) === 1} ster={Number(cwcData["pasteur_ster"]) === 1} prod={Number(cwcData["pasteur_prod"]) === 1} 
            />
            <CompactMachineStatus 
              name="2. Separator" 
              cip={Number(cwcData["sep_cip"]) === 1} ster={Number(cwcData["sep_ster"]) === 1} prod={Number(cwcData["sep_prod"]) === 1} 
            />
            <CompactMachineStatus 
              name="3. Evaporator" 
              cip={evapCip} ster={evapSter} prod={evapProd} 
            />
            <CompactMachineStatus 
              name="4. Sterilizer DSI" 
              cip={Number(cwcData["dsi_cip"]) === 1} ster={Number(cwcData["dsi_ster"]) === 1} prod={Number(cwcData["dsi_prod"]) === 1} 
            />
          </div>
        </LiquidGlassCard>
        
      </div>
    </div>
  );
};

export default CWC;