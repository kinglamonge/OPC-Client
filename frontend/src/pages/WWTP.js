import React, { useState, useEffect } from 'react';
import { 
  Beaker, 
  Droplets, 
  Wind, 
  Play, 
  Pause, 
  RefreshCw, 
  Activity, 
  CircleDashed, 
  Cpu,
  Gauge
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

// =======================================================
// KOMPONEN: GROUPED TREND CHART (GLASSMORPHISM 3D)
// =======================================================
const GroupedTrendChart = ({ title, panel, tags, labels, colors }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!panel) return;

    const fetchGroupedData = async () => {
      try {
        const requests = tags.map(tag => 
          fetch(`http://${window.location.hostname}:3001/api/history?panel=${panel}&tag=${tag}&limit=30`).then(res => res.json())
        );
        const results = await Promise.all(requests);
        const merged = [];
        const maxLength = Math.max(...results.map(r => r.length));

        for (let i = 0; i < maxLength; i++) {
          const dataPoint = { time: results[0][i]?.time || '--:--:--' };
          labels.forEach((label, index) => {
            dataPoint[label] = results[index][i]?.value || 0;
          });
          merged.push(dataPoint);
        }
        
        setChartData(merged);
        setLoading(false);
      } catch (err) { 
        console.error(`Gagal load grafik ${panel}:`, err); 
      }
    };

    fetchGroupedData();
    const interval = setInterval(fetchGroupedData, 2000);
    return () => clearInterval(interval);
  }, [panel, tags, labels]);

  if (loading) return (
    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-gray-500 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
      <Cpu className="animate-pulse mb-2 text-emerald-500/50" size={28} />
      <span className="text-xs font-mono tracking-widest uppercase">Loading Historian...</span>
    </div>
  );

  return (
    <div className="h-full bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden group hover:-translate-y-1 hover:border-white/20 transition-all duration-500 z-10 flex flex-col justify-between">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
      <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-gradient-to-tl from-emerald-500/10 to-transparent rounded-full blur-2xl group-hover:from-emerald-500/20 transition-all duration-500 pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-emerald-400" />
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest drop-shadow-md">{title}</h3>
        </div>
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Real-Time Stream</span>
      </div>

      <div className="h-64 w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
            <XAxis dataKey="time" stroke="#888" tick={{ fontSize: 10, fill: '#aaa' }} tickMargin={10} />
            <YAxis stroke="#888" tick={{ fontSize: 10, fill: '#aaa' }} domain={['auto', 'auto']} tickFormatter={(val) => Number(val).toFixed(1)} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(10,10,12,0.85)', 
                backdropFilter: 'blur(12px)', 
                borderColor: 'rgba(255,255,255,0.1)', 
                color: '#fff', 
                borderRadius: '14px',
                boxShadow: '0 8px 32px 0 rgba(0,0,0,0.4)'
              }} 
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} 
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px', opacity: 0.85 }} />
            {labels.map((label, index) => (
              <Line 
                key={label} 
                type="monotone" 
                dataKey={label} 
                stroke={colors[index]} 
                strokeWidth={2.5} 
                dot={false} 
                isAnimationActive={false} 
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// =======================================================
// MAIN COMPONENT: WWTP BIOGAS (GLASSMORPHISM 3D)
// =======================================================
const WWTP = ({ opcData }) => {
  const panelData = opcData?.['WWTP'] || {};
  
  const getValue = (key, def = '0.00') => {
    const val = panelData[key];
    return val !== undefined && !isNaN(val) ? Number(val).toFixed(2) : def;
  };

  const formatTotalizer = (val) => {
    const num = Number(val);
    return !isNaN(num) ? num.toLocaleString('id-ID') : '0';
  };

  // ENGINE MODE LOGIC (Asumsi: 0 = Idle, 1 = Process, 2 = Sirkulasi)
  const modeVal = Number(panelData['wwtp_mode'] || 0);
  let modeConfig = { 
    label: 'IDLE', 
    color: 'text-gray-400', 
    bg: 'bg-white/5 border border-white/10 shadow-inner', 
    dot: 'bg-gray-500',
    icon: <Pause size={22} /> 
  };
  
  if (modeVal === 1) {
    modeConfig = { 
      label: 'PROCESS', 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]', 
      dot: 'bg-emerald-500 animate-ping',
      icon: <Play size={22} className="animate-pulse" /> 
    };
  } else if (modeVal === 2) {
    modeConfig = { 
      label: 'SIRKULASI', 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/15 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]', 
      dot: 'bg-blue-500 animate-ping',
      icon: <RefreshCw size={22} className="animate-spin" /> 
    };
  }

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
      
      {/* ========================================== */}
      {/* ORNAMEN KOSMIK LATAR BELAKANG (GLOW)       */}
      {/* ========================================== */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-emerald-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[45%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ========================================== */}
      {/* HEADER & SYSTEM MODE                       */}
      {/* ========================================== */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <Droplets size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-200 tracking-wide uppercase">
              WWTP Biogas Reactor
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
              Anaerobic Digestion & Effluent System
            </p>
          </div>
        </div>

        <div className={`mt-5 md:mt-0 flex items-center space-x-4 px-5 py-3 rounded-2xl backdrop-blur-md transition-all duration-500 ${modeConfig.bg}`}>
          <div className={`p-2 rounded-xl bg-black/30 border border-white/10 ${modeConfig.color}`}>
            {modeConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${modeConfig.dot}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${modeVal === 1 ? 'bg-emerald-500' : modeVal === 2 ? 'bg-blue-500' : 'bg-gray-500'}`}></span>
              </span>
              <p className="text-[10px] text-gray-300 uppercase tracking-widest font-bold">System Mode</p>
            </div>
            <p className={`text-xl font-black tracking-wider mt-0.5 drop-shadow-md ${modeConfig.color}`}>
              {modeConfig.label}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* SECTION 1: INLET & OUTLET LIQUID FLOW      */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 relative z-10">
        
        {/* INLET FLUID */}
        <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-blue-500/40 transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 opacity-80"></div>
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl group-hover:from-blue-500/25 transition-all duration-500 pointer-events-none"></div>

          <div className="flex justify-between items-center mb-6 pl-2 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 backdrop-blur-sm">
                <Droplets size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold uppercase tracking-wider text-sm drop-shadow-md">
                  Inlet Fluid (Raw Water)
                </h3>
                <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Sementara pake FT-102 (Fira)</p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Inflow
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 relative z-10">
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Flowrate</p>
              <p className="text-3xl font-mono text-white font-bold mt-2 drop-shadow-md">
                {getValue('inlet_flow')} <span className="text-xs font-sans text-gray-400 font-normal">m³/h</span>
              </p>
            </div>
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Totalizer</p>
              <p className="text-3xl font-mono text-blue-400 font-black mt-2 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                {formatTotalizer(getValue('inlet_total', '0'))} <span className="text-xs font-sans text-gray-400 font-normal">m³</span>
              </p>
            </div>
          </div>
        </div>

        {/* OUTLET FLUID */}
        <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-emerald-500/40 transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-80"></div>
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl group-hover:from-emerald-500/25 transition-all duration-500 pointer-events-none"></div>

          <div className="flex justify-between items-center mb-6 pl-2 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 backdrop-blur-sm">
                <Droplets size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold uppercase tracking-wider text-sm drop-shadow-md">
                  Outlet Fluid (Treated)
                </h3>
                <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Sensor FT-601(Sementara tidak fungsi)</p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Outflow
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 relative z-10">
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Flowrate</p>
              <p className="text-3xl font-mono text-white font-bold mt-2 drop-shadow-md">
                {getValue('outlet_flow')} <span className="text-xs font-sans text-gray-400 font-normal">m³/h</span>
              </p>
            </div>
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Totalizer</p>
              <p className="text-3xl font-mono text-emerald-400 font-black mt-2 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                {formatTotalizer(getValue('outlet_total', '0'))} <span className="text-xs font-sans text-gray-400 font-normal">m³</span>
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/* SECTION 2: QUALITY CONTROL (pH) & DO       */}
      {/* ========================================== */}
      <div className="mb-8 relative z-10">
        <div className="flex items-center gap-2 px-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest drop-shadow-md">
            Water Quality & Chemical Parameters
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {['ph_equalization', 'ph_reactor', 'ph_effluent', 'do_aeration'].map((tag, i) => {
            const names = ['Equalization', 'Main Reactor', 'Effluent', 'Dissolved Oxygen'];
            const sensors = ['AE-201', 'AE-202', 'AE-601', 'AE-501'];
            const rawVal = panelData[tag];
            const val = rawVal !== undefined && !isNaN(rawVal) ? Number(rawVal) : 0;
            
            // Logika pH: Peringatan merah jika di luar rentang 6.0 - 8.0 (saat nilai aktif > 0)
            const isOutOfRange = val > 0 && (val < 6.0 || val > 8.0);
            const textColor = isOutOfRange ? 'text-red-500 animate-pulse' : 'text-emerald-400';
            const borderAccent = isOutOfRange ? 'hover:border-red-500/40' : 'hover:border-emerald-500/40';
            const topBarColor = isOutOfRange ? 'bg-red-500' : 'bg-emerald-500';
            const glowColor = isOutOfRange ? 'group-hover:from-red-500/20' : 'group-hover:from-emerald-500/20';

            return (
              <div 
                key={tag} 
                className={`group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 ${borderAccent} transition-all duration-500 flex flex-col justify-between relative overflow-hidden`}
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${topBarColor} opacity-80`}></div>
                <div className={`absolute -bottom-10 -right-10 w-28 h-28 bg-gradient-to-tl from-white/5 to-transparent rounded-full blur-xl transition-all duration-500 pointer-events-none ${glowColor}`}></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest drop-shadow-md">
                      pH {names[i]}
                    </p>
                    <p className="text-[9px] text-gray-500 font-mono uppercase mt-0.5">{sensors[i]}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm ${isOutOfRange ? 'text-red-400' : 'text-emerald-400'}`}>
                    <Beaker size={18} />
                  </div>
                </div>

                <div className="flex items-baseline justify-between relative z-10 mt-2">
                  <p className={`text-4xl font-mono font-black drop-shadow-md ${textColor}`}>
                    {val.toFixed(2)}
                  </p>
                  <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded bg-black/40 border backdrop-blur-md ${
                    isOutOfRange ? 'text-red-400 border-red-500/30' : 'text-emerald-400 border-emerald-500/30'
                  }`}>
                    {isOutOfRange ? 'OUT OF SPEC' : 'NORMAL'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================== */}
      {/* SECTION 3: BIOGAS PRODUCTION & TRENDS      */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10">
        
        {/* Gas Production Metrics */}
        <div className="xl:col-span-1">
          <div className="h-full group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-amber-500/40 transition-all duration-500 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 opacity-80"></div>
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-2xl group-hover:from-amber-500/25 transition-all duration-500 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-6 pl-2 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 backdrop-blur-sm">
                  <Wind size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold uppercase tracking-wider text-sm drop-shadow-md">
                    Biogas Production
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Digester Dome</p>
                </div>
              </div>
              <Gauge size={18} className="text-gray-500" />
            </div>

            <div className="space-y-3 pl-2 relative z-10 flex-1 flex flex-col justify-center">
              {/* Dome Pressure */}
              <div className="flex justify-between items-center bg-black/20 border border-white/5 rounded-2xl p-4 backdrop-blur-sm hover:border-white/15 transition-colors">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Dome Pressure</p>
                  <p className="text-[9px] text-gray-500 font-mono mt-0.5">Sensor PT-201</p>
                </div>
                <p className="text-2xl font-mono text-white font-black drop-shadow-md">
                  {getValue('gas_pressure')} <span className="text-xs font-sans text-gray-400 font-normal">Bar</span>
                </p>
              </div>

              {/* Tank Level */}
              <div className="flex justify-between items-center bg-black/20 border border-white/5 rounded-2xl p-4 backdrop-blur-sm hover:border-blue-500/20 transition-colors">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Tank Level</p>
                  <p className="text-[9px] text-gray-500 font-mono mt-0.5">Sensor LE-201</p>
                </div>
                <p className="text-2xl font-mono text-blue-400 font-black drop-shadow-md">
                  {getValue('tank_level')} <span className="text-xs font-sans text-gray-400 font-normal">m</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="xl:col-span-2">
          <GroupedTrendChart 
            title="Trend Fluid Flowrate (m³/h)" 
            panel="WWTP" 
            tags={['inlet_flow', 'outlet_flow']} 
            labels={['Inlet', 'Outlet']} 
            colors={['#3B82F6', '#10B981']} 
          />
        </div>

      </div>

    </div>
  );
};

export default WWTP;