import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Target, TrendingUp, Clock, Zap, AlertCircle, FileText, CheckCircle2, Maximize, LayoutDashboard, Activity, RotateCcw } from 'lucide-react';

// =================================================================================
// CUSTOM ICONS
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

// =================================================================================
// LIQUID GLASS CARD COMPONENT
// =================================================================================
const LiquidGlassCard = ({ children, className = "", contentClassName = "" }) => (
  <div className={`relative bg-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-500 group border-t border-l border-white/30 border-b border-r border-white/5 flex flex-col ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
    <div className={`relative z-10 flex-1 flex flex-col w-full h-full ${contentClassName}`}>
      {children}
    </div>
  </div>
);

const Opening = () => {
  const [viewMode, setViewMode] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // State untuk melacak status loading tombol reset
  const [isResetting, setIsResetting] = useState(false);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'viewer';
  
  const getInitialData = () => {
    const saved = localStorage.getItem('opening_live_data');
    if (saved) return JSON.parse(saved);
    return {
      opening1_counter1: 0, opening1_counter2: 0,
      opening2_counter1: 0, opening2_counter2: 0,
      shift_1: 0, shift_2: 0, shift_3: 0, speed_cpm: 0
    };
  };

  const [liveData, setLiveData] = useState(getInitialData());
  const [speedTrend, setSpeedTrend] = useState([]);
  
  const [cameraOk, setCameraOk] = useState(false);
  const lastHeartbeatRef = useRef(Date.now());
  const [statusMesin, setStatusMesin] = useState('CONNECTING...');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // =================================================================================
  // WATCHDOG TIMER
  // =================================================================================
  useEffect(() => {
    const watchdog = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current;
      if (timeSinceLastHeartbeat > 5000) { 
        setStatusMesin('OFFLINE / NO HEARTBEAT');
      } else {
        setStatusMesin(cameraOk ? 'CAMERA OK' : 'CAM ERROR');
      }
    }, 1000);
    return () => clearInterval(watchdog);
  }, [cameraOk]);

  const getShift = (date) => {
    const h = date.getHours();
    if (h >= 5 && h < 13) return 1;
    if (h >= 13 && h < 21) return 2;
    return 3;
  };

  const currentShift = getShift(currentTime);
  const timeString = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const totalOp1 = liveData.opening1_counter1 + liveData.opening1_counter2;
  const totalOp2 = liveData.opening2_counter1 + liveData.opening2_counter2;
  const grandTotal = totalOp1 + totalOp2;
  const TARGET_HARIAN = 150000; 
  const progressPersen = Math.min((grandTotal / TARGET_HARIAN) * 100, 100).toFixed(1);

  // =================================================================================
  // WEBSOCKET
  // =================================================================================
  useEffect(() => {
    const socket = io(`http://${window.location.hostname}:3001`);
    
    socket.on("opc-data", (data) => {
      if (data.panel === "Opening-Panel" || data.panel === "Opening") {
        
        if (data.tag === 'camera_ok') {
          const isOk = data.value === 1 || data.value === true || data.value === "1" || data.value === "true";
          setCameraOk(isOk);
        }
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

  // =================================================================================
  // FUNGSI WRITE RESET DIPERBAIKI (ERROR HANDLING LEBIH KETAT)
  // =================================================================================
  const handleResetCounter = async () => {
    const confirmReset = window.confirm("PERINGATAN: Reset Counter Line A kembali ke 0?");
    
    if (confirmReset) {
      setIsResetting(true); // Aktifkan status loading

      try {
        const resetPayload = { 
          nodeId: "ns=2;s=Kelapa.Counter.Reset", 
          value: true, 
          type: "Boolean" // Pastikan backend Anda memahami format string ini atau gunakan "boolean" huruf kecil jika gagal
        };

        const response = await fetch(`http://${window.location.hostname}:3001/api/control/write`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(resetPayload)
        });

        // 🔬 Validasi 1: Jika server merespons HTTP Error (Misal 401, 500)
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || `Server Error ${response.status}`);
        }

        // Jika perintah TRUE berhasil, tunggu 1 detik lalu kembalikan ke FALSE
        setTimeout(async () => {
          try {
            await fetch(`http://${window.location.hostname}:3001/api/control/write`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({ ...resetPayload, value: false })
            });
          } catch (e) {
            console.warn("Gagal mengembalikan tombol reset ke false (Timeout):", e);
          } finally {
            setIsResetting(false); // Matikan loading setelah siklus selesai
          }
        }, 1000);

        alert("Sukses! Sinyal Reset telah dikirim ke PLC.");

      } catch (err) {
        setIsResetting(false); // Matikan loading jika gagal
        console.error("Detail Error Reset:", err);
        alert(`GAGAL MERESET!\nPesan Server: ${err.message}\nPastikan OPC bisa di-write via server.`);
      }
    }
  };

  const shiftChartData = [
    { name: 'Shift 1', kelapa: liveData.shift_1, color: '#38bdf8' },
    { name: 'Shift 2', kelapa: liveData.shift_2, color: '#a78bfa' },
    { name: 'Shift 3', kelapa: liveData.shift_3, color: '#34d399' },
  ];

  const AmbientBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-teal-500/20 rounded-full blur-[120px] mix-blend-screen opacity-70 animate-pulse-slow"></div>
      <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-purple-500/20 rounded-full blur-[140px] mix-blend-screen opacity-60"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-emerald-500/15 rounded-full blur-[150px] mix-blend-screen opacity-50"></div>
    </div>
  );

  // =================================================================================
  // RENDER 1: FIELD VIEW 
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
                <span className="text-xs font-bold tracking-[0.15em] text-purple-300 uppercase bg-white/5 px-2 py-0.5 rounded-md border border-white/10">SHIFT {currentShift}</span>
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
              
              {/* TOMBOL RESET DENGAN STATUS LOADING */}
              {(role === 'admin' || role === 'manager') && (
                <button 
                  onClick={handleResetCounter}
                  disabled={isResetting}
                  title="Test Reset Line A"
                  className={`absolute -top-3 -left-3 p-1.5 ${isResetting ? 'bg-gray-500 cursor-wait' : 'bg-red-500/80 hover:bg-red-500'} text-white rounded-full shadow-lg border border-white/20 transition-all ${!isResetting && 'hover:scale-110 active:scale-95'} z-20 flex items-center justify-center`}
                >
                  {isResetting ? (
                    <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <RotateCcw size={12} />
                  )}
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
  // RENDER 2: DASHBOARD VIEW
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
            <p className="text-xs text-teal-100/70 mt-1 font-medium tracking-[0.15em] uppercase">Coconut Peeling & Flow Analytics</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap md:flex-nowrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white shadow-sm">
            <Clock size={14} className="text-teal-300" />
            <span className="text-[11px] font-bold tracking-widest uppercase">
              Shift {currentShift} <span className="font-mono text-teal-200 ml-1">({timeString})</span>
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

        <LiquidGlassCard>
          <div className="flex justify-between items-start w-full">
            <div>
              <h3 className="text-xs text-white/70 font-bold uppercase tracking-[0.2em]">Kecepatan (Speed)</h3>
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

        <LiquidGlassCard>
          <div className="flex justify-between items-start w-full">
            <div>
              <h3 className="text-xs text-white/70 font-bold uppercase tracking-[0.2em]">Est. Sisa Waktu</h3>
              <p className="text-4xl font-black text-white mt-2 drop-shadow-md">
                3.2 <span className="text-sm text-purple-300 font-medium tracking-normal ml-1">Jam</span>
              </p>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <Clock size={20} className="text-purple-300" />
            </div>
          </div>
          <p className="text-xs text-white/50 mt-auto pt-5 font-medium flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-purple-400" /> Menuju target 150K
          </p>
        </LiquidGlassCard>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 mb-8">
        <LiquidGlassCard>
          <h3 className="text-xs font-bold text-white/70 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <CoconutIcon size={16} className="text-white/50" /> Distribusi Shift
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shiftChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" tick={{ fill: '#cbd5e1', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" tick={{ fill: '#cbd5e1', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#ffffff0a' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                <Bar dataKey="kelapa" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={true}>
                  {shiftChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard>
          <h3 className="text-xs font-bold text-white/70 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Activity size={16} className="text-white/50" /> Live Speed Trend
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={speedTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis dataKey="time" stroke="#ffffff40" tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis stroke="#ffffff40" tick={{ fill: '#cbd5e1', fontSize: 12 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} labelStyle={{ color: '#94a3b8', fontSize: '11px' }} itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="speed" stroke="#38bdf8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }} isAnimationActive={false} style={{ filter: 'drop-shadow(0px 4px 8px rgba(56, 189, 248, 0.4))' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  );
};

export default Opening;