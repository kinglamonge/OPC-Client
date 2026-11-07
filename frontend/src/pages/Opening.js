import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Target, TrendingUp, Clock, Zap, Maximize, LayoutDashboard, Activity, RotateCcw, CalendarDays } from 'lucide-react';

// =================================================================================
// CUSTOM ICONS & COMPONENTS
// =================================================================================
const CoconutIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" fillOpacity="0.15" />
    <circle cx="9.5" cy="11.5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="11.5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
    <path d="M4 12C4 7.58172 7.58172 4 12 4" strokeOpacity="0.4" />
  </svg>
);

const LiquidGlassCard = ({ children, className = "", contentClassName = "" }) => (
  <div className={`relative bg-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-500 group border-t border-l border-white/30 border-b border-r border-white/5 flex flex-col ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
    <div className={`relative z-10 flex-1 flex flex-col w-full h-full ${contentClassName}`}>
      {children}
    </div>
  </div>
);

// FUNGSI HELPER: Mendapatkan Nomor Minggu (Week Number) ISO
const getISOWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const Opening = () => {
  const [viewMode, setViewMode] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isResetting, setIsResetting] = useState(false);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'viewer';
  
  const getInitialData = () => {
    const saved = localStorage.getItem('opening_live_data');
    if (saved) return JSON.parse(saved);
    return {
      opening1_counter1: 0, opening1_counter2: 0,
      opening2_counter1: 0, opening2_counter2: 0,
      speed_cpm: 0
    };
  };

  const [liveData, setLiveData] = useState(getInitialData());
  const [speedTrend, setSpeedTrend] = useState([]);
  
  // STATE BARU: Hanya ada data tren Mingguan
  const [dbTrends, setDbTrends] = useState({
    weekly: [
      { day: 'Sen', total: 0 }, { day: 'Sel', total: 0 }, { day: 'Rab', total: 0 }, 
      { day: 'Kam', total: 0 }, { day: 'Jum', total: 0 }, { day: 'Sab', total: 0 }
    ]
  });

  const lastHeartbeatRef = useRef(Date.now());
  const [statusMesin, setStatusMesin] = useState('CONNECTING...');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Trend Data (Call API Backend)
  useEffect(() => {
    const fetchTrends = async () => {
      try {
        console.log("[FRONTEND] Meminta data grafik dari server...");
        const response = await fetch(`http://${window.location.hostname}:3001/api/opening/trends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("[FRONTEND] Data Trend Berhasil Diterima:", data);
          setDbTrends(data);
        } else {
          console.warn("[FRONTEND] API Error, Status:", response.status);
          // Jika status 401 atau 403, berarti Token Anda ditolak/kedaluwarsa!
          if (response.status === 401 || response.status === 403) {
             console.error("Sesi habis! API ditolak oleh middleware server.");
          }
        }
      } catch (error) {
        console.error("[FRONTEND] Gagal melakukan koneksi fetch ke server:", error);
      }
    };
    
    fetchTrends();
    const trendTimer = setInterval(fetchTrends, 5 * 60 * 1000); // 5 Menit Refresh
    return () => clearInterval(trendTimer);
  }, [token]);

  // Watchdog Timer
  useEffect(() => {
    const watchdog = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current;
      if (timeSinceLastHeartbeat > 5000) { 
        setStatusMesin('OFFLINE / NO HEARTBEAT');
      } else {
        setStatusMesin('CAMERA OK');
      }
    }, 1000);
    return () => clearInterval(watchdog);
  }, []);

  // FUNGSI SHIFT (07:00 - 15:00)
  const getShift = (date) => {
    const h = date.getHours();
    if (h >= 7 && h < 15) return 1;
    return 0; // Off Shift (Mesin Idle)
  };

  const currentShift = getShift(currentTime);
  const timeString = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const currentWeek = getISOWeek(currentTime);
  const currentYear = currentTime.getFullYear();

  const totalOp1 = liveData.opening1_counter1 + liveData.opening1_counter2;
  const totalOp2 = liveData.opening2_counter1 + liveData.opening2_counter2;
  const grandTotal = totalOp1 + totalOp2;
  const TARGET_HARIAN = 200000;
  const progressPersen = Math.min((grandTotal / TARGET_HARIAN) * 100, 100).toFixed(1);

  useEffect(() => {
    const socket = io(`http://${window.location.hostname}:3001`);
    
    socket.on("opc-data", (data) => {
      if (data.panel === "Opening-Panel" || data.panel === "Opening") {
        if (data.tag === 'camera_heartbeat') {
          lastHeartbeatRef.current = Date.now();
        }

        setLiveData(prev => {
          const newState = { ...prev };
          let isChanged = false;

          if (data.tag === 'total_counter') {
            newState.opening1_counter1 = Number(data.value);
            isChanged = true;
          }
          if (data.tag === 'counter_rateper_minute') {
            newState.speed_cpm = Number(data.value);
            isChanged = true;
          }
          
          if (isChanged) {
            localStorage.setItem('opening_live_data', JSON.stringify(newState));
          }
          return newState;
        });

        if (data.tag === 'counter_rateper_minute') {
          setSpeedTrend(prev => {
            const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const newTrend = [...prev, { time: now, speed: Number(data.value) }];
            return newTrend.length > 30 ? newTrend.slice(1) : newTrend;
          });
        }
      }
    });

    return () => socket.disconnect();
  }, []);

  const handleResetCounter = async () => {
    const confirmReset = window.confirm("PERINGATAN: Reset Counter Line A kembali ke 0?");
    if (confirmReset) {
      setIsResetting(true);
      try {
        const resetPayload = { nodeId: "ns=2;s=Kelapa.Counter.Reset", value: true, type: "Boolean" };
        const response = await fetch(`http://${window.location.hostname}:3001/api/control/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(resetPayload)
        });

        if (!response.ok) throw new Error(`Server Error ${response.status}`);

        setTimeout(async () => {
          try {
            await fetch(`http://${window.location.hostname}:3001/api/control/write`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ ...resetPayload, value: false })
            });
          } catch (e) {
            console.warn("Gagal false", e);
          } finally {
            setIsResetting(false);
          }
        }, 1000);
        alert("Sukses! Sinyal Reset dikirim.");
      } catch (err) {
        setIsResetting(false);
        alert(`GAGAL MERESET! ${err.message}`);
      }
    }
  };

  const AmbientBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-teal-500/20 rounded-full blur-[120px] mix-blend-screen opacity-70 animate-pulse-slow"></div>
      <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-purple-500/20 rounded-full blur-[140px] mix-blend-screen opacity-60"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-emerald-500/15 rounded-full blur-[150px] mix-blend-screen opacity-50"></div>
    </div>
  );

  // =================================================================================
  // RENDER: FIELD VIEW
  // =================================================================================
  if (viewMode === 'field') {
    return (
      <div className="relative w-full h-[calc(100vh-90px)] flex flex-col gap-6 p-4 md:p-8 bg-[#0f172a] overflow-hidden font-sans">
        <AmbientBackground />

        <div className="flex-none flex justify-between items-center relative z-10 px-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border-t border-l border-white/30 shadow-lg">
              <CoconutIcon className="text-teal-300" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide drop-shadow-md">
                Field Monitor
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-mono text-teal-200 tracking-wider bg-white/5 px-2 py-0.5 rounded-md border border-white/10">{timeString}</span>
                <span className="text-xs font-bold tracking-[0.15em] text-purple-300 uppercase bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                  {currentShift === 0 ? 'OFF SHIFT' : `SHIFT ${currentShift}`}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setViewMode('dashboard')}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-white font-bold tracking-widest uppercase transition-all shadow-[0_4px_15px_rgba(0,0,0,0.2)] active:scale-95 text-xs md:text-sm"
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
        </div>

        <div className="flex-[1.2] relative z-10 w-full">
          <LiquidGlassCard className="w-full h-full bg-white/[0.05]" contentClassName="items-center justify-center">
            <h2 className="text-lg md:text-2xl font-bold text-teal-100/70 uppercase tracking-[0.3em] mb-4 text-center">
              Total Kupasan Hari Ini
            </h2>
            <div className="text-[12vh] md:text-[18vh] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-teal-100 to-teal-400 drop-shadow-[0_10px_30px_rgba(45,212,191,0.3)]">
              {grandTotal.toLocaleString('id-ID')}
            </div>
          </LiquidGlassCard>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <LiquidGlassCard contentClassName="items-center justify-center relative">
            <h3 className="text-sm md:text-lg font-bold text-white/70 uppercase tracking-[0.2em] mb-3">Total Opening 1</h3>
            <div className={`text-[6vh] md:text-[9vh] font-black text-sky-300 leading-none mb-4 drop-shadow-[0_0_20px_rgba(56,189,248,0.2)]`}>
              {totalOp1.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-4 text-xs md:text-sm font-mono text-white/80 bg-white/5 px-6 py-2 rounded-xl border border-white/10 relative">
              {(role === 'admin' || role === 'manager') && (
                <button 
                  onClick={handleResetCounter}
                  disabled={isResetting}
                  title="Test Reset Line A"
                  className={`absolute -top-3 -left-3 p-1.5 ${isResetting ? 'bg-gray-500 cursor-wait' : 'bg-red-500/80 hover:bg-red-500'} text-white rounded-full shadow-lg border border-white/20 transition-all ${!isResetting && 'hover:scale-110 active:scale-95'} z-20 flex items-center justify-center`}
                >
                  {isResetting ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <RotateCcw size={12} />}
                </button>
              )}
              <span>Line A <b className="text-sky-300">{liveData.opening1_counter1.toLocaleString('id-ID')}</b></span>
              <span className="opacity-30">|</span>
              <span>Line B <b className="text-sky-300">{liveData.opening1_counter2.toLocaleString('id-ID')}</b></span>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard contentClassName="items-center justify-center">
            <h3 className="text-sm md:text-lg font-bold text-white/70 uppercase tracking-[0.2em] mb-3">Total Opening 2</h3>
            <div className={`text-[6vh] md:text-[9vh] font-black text-purple-300 leading-none mb-4 drop-shadow-[0_0_20px_rgba(192,132,252,0.2)]`}>
              {totalOp2.toLocaleString('id-ID')}
            </div>
            <div className="flex gap-4 text-xs md:text-sm font-mono text-white/80 bg-white/5 px-6 py-2 rounded-xl border border-white/10">
              <span>Line A <b className="text-purple-300">{liveData.opening2_counter1.toLocaleString('id-ID')}</b></span>
              <span className="opacity-30">|</span>
              <span>Line B <b className="text-purple-300">{liveData.opening2_counter2.toLocaleString('id-ID')}</b></span>
            </div>
          </LiquidGlassCard>
        </div>
      </div>
    );
  }

  // =================================================================================
  // RENDER: DASHBOARD VIEW
  // =================================================================================
  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden font-sans text-gray-200 bg-[#0f172a]">
      <AmbientBackground />

      <div className="flex flex-col md:flex-row md:items-center justify-between relative z-10 mb-8 gap-4 bg-white/5 backdrop-blur-xl border-t border-l border-white/20 border-b border-r border-white/5 p-5 md:p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-2xl shadow-[0_0_20px_rgba(45,212,191,0.4)] text-white">
            <CoconutIcon size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide drop-shadow-sm">Opening Station</h1>
            <p className="text-xs text-teal-100/70 mt-1 font-medium tracking-[0.15em] uppercase">Coconut Deshelling & Flow Analytics</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap md:flex-nowrap gap-3">
          
          {/* BADGE INFO WEEK (MINGGU KE-X TAHUN 202X) */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-purple-400/30 text-white shadow-sm">
            <CalendarDays size={14} className="text-purple-300" />
            <span className="text-[11px] font-bold tracking-widest uppercase">
              Week {currentWeek} <span className="font-mono text-purple-200 ml-1">({currentYear})</span>
            </span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white shadow-sm">
            <Clock size={14} className="text-teal-300" />
            <span className="text-[11px] font-bold tracking-widest uppercase">
              {currentShift === 0 ? 'OFF SHIFT' : `SHIFT ${currentShift}`} 
              <span className="font-mono text-teal-200 ml-1">({timeString})</span>
            </span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white shadow-sm">
            <Zap size={14} className={statusMesin === 'CAMERA OK' ? 'text-emerald-400 animate-pulse' : 'text-red-400'} />
            <span className={`text-[11px] font-bold tracking-widest uppercase ${statusMesin === 'CAMERA OK' ? 'text-emerald-100' : 'text-red-200'}`}>
              {statusMesin}
            </span>
          </div>

          <button 
            onClick={() => setViewMode('field')}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 text-white rounded-xl font-bold text-xs tracking-widest uppercase transition-all shadow-[0_4px_20px_rgba(14,165,233,0.4)] active:scale-95 border border-white/20"
          >
            <Maximize size={16} /> Field View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10 mb-8">
        
        {/* KOLOM 1 & 2: TOTAL VOLUME */}
        <LiquidGlassCard className="lg:col-span-2">
          <div className="flex justify-between items-start mb-6 w-full">
            <div>
              <h3 className="text-xs text-white/70 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <CoconutIcon size={16} className="text-teal-300" /> Total Volume Harian
              </h3>
              <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-200 mt-2">
                {grandTotal.toLocaleString('id-ID')}
                <span className="text-sm text-white/50 font-medium tracking-normal ml-2 uppercase">Butir</span>
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-xl border border-white/20 shadow-inner">
              <Target size={24} className="text-teal-300" />
            </div>
          </div>
          
          <div className="w-full mt-auto">
            <div className="flex justify-between text-[11px] font-bold text-white/60 mb-2 tracking-widest uppercase">
              <span>Target: {TARGET_HARIAN.toLocaleString('id-ID')}</span>
              <span className="text-teal-300">{progressPersen}%</span>
            </div>
            <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <div 
                className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${progressPersen}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-1/2 rounded-full blur-[2px]"></div>
              </div>
            </div>
          </div>
        </LiquidGlassCard>

        {/* KOLOM 3: KECEPATAN (TEXT) */}
        <LiquidGlassCard>
          <div className="flex justify-between items-start w-full">
            <div>
              <h3 className="text-xs text-white/70 font-bold uppercase tracking-[0.2em]">Kecepatan Mesin</h3>
              <p className="text-4xl font-black text-white mt-2 drop-shadow-md">
                {liveData.speed_cpm} <span className="text-sm text-teal-300 font-medium tracking-normal ml-1">CPM</span>
              </p>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <Activity size={20} className="text-teal-300" />
            </div>
          </div>
          <p className="text-xs text-white/50 mt-auto pt-5 font-medium flex items-center gap-1.5">
            <TrendingUp size={14} className="text-teal-400" /> Data OPC terkoneksi
          </p>
        </LiquidGlassCard>

        {/* KOLOM 4: MINI LIVE SPEED TREND (Menggantikan posisi grafik mingguan sebelumnya) */}
        <LiquidGlassCard className="overflow-hidden p-0" contentClassName="p-0">
          <div className="p-5 pb-0 flex justify-between items-start w-full relative z-10">
            <div>
              <h3 className="text-xs text-white/70 font-bold uppercase tracking-[0.2em]">Trend CPM</h3>
            </div>
            <div className="p-1.5 bg-white/10 rounded-lg border border-white/20">
              <TrendingUp size={16} className="text-sky-400" />
            </div>
          </div>
          <div className="w-full h-24 mt-auto pt-2 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={speedTrend}>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', fontSize: '11px', color: '#fff' }} 
                  itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }} 
                  labelStyle={{ display: 'none' }}
                />
                <Line type="monotone" dataKey="speed" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </LiquidGlassCard>

      </div>

      {/* FULL WIDTH SECTION: TREND PRODUKSI MINGGUAN (Untuk Manajemen) */}
      <div className="w-full relative z-10 mb-8">
        <LiquidGlassCard className="w-full">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                <CalendarDays size={18} className="text-purple-400" /> Trend Produksi Mingguan
              </h3>
            </div>
            <div className="mt-4 md:mt-0 text-left md:text-right">
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Total Akumulasi Minggu Ini</p>
              <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-purple-400 drop-shadow-md">
                {dbTrends.weekly.reduce((acc, curr) => acc + curr.total, 0).toLocaleString('id-ID')}
                <span className="text-sm text-white/50 font-medium tracking-normal ml-2 uppercase">Butir</span>
              </p>
            </div>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dbTrends.weekly} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis dataKey="day" stroke="#ffffff40" tick={{ fill: '#e2e8f0', fontSize: 13, fontWeight: '600' }} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" tick={{ fill: '#cbd5e1', fontSize: 12 }} tickLine={false} axisLine={false} />
                
                <Tooltip 
                  cursor={{ fill: '#ffffff0a' }} 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} 
                  labelStyle={{ color: '#94a3b8', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }} 
                  itemStyle={{ color: '#c084fc', fontWeight: '900', fontSize: '15px' }} 
                  formatter={(value) => [`${value.toLocaleString('id-ID')} Butir`, "Total Harian"]}
                />
                
                <Bar dataKey="total" radius={[8, 8, 0, 0]} maxBarSize={60} isAnimationActive={true}>
                  {dbTrends.weekly.map((entry, index) => (
                    // Bar yang hari ini belum/tidak ada produksinya akan dibuat transparan/gelap
                    <Cell key={`cell-${index}`} fill={entry.total > 0 ? '#c084fc' : '#ffffff10'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </LiquidGlassCard>
      </div>

    </div>
  );
};

export default Opening;