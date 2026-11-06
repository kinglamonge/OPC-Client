import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, ShieldAlert, Zap, Cpu, ChevronDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// =======================================================
// KOMPONEN: GROUPED TREND CHART (GLASSMORPHISM)
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
      } catch (err) { console.error(`Gagal load grafik PQ ${panel}:`, err); }
    };

    fetchGroupedData();
    const interval = setInterval(fetchGroupedData, 2000);
    return () => clearInterval(interval);
  }, [panel, tags, labels]);

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center text-gray-500 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10">
      <Cpu className="animate-pulse mb-2 text-blue-500/50" size={24} />
      <span className="text-xs font-mono tracking-widest uppercase">Loading Analytics...</span>
    </div>
  );

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden group hover:border-white/20 transition-all z-10">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      <h3 className="text-xs font-bold text-gray-300 mb-4 uppercase tracking-widest drop-shadow-md">{title}</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
            <XAxis dataKey="time" stroke="#888" tick={{ fontSize: 10, fill: '#aaa' }} tickMargin={10} />
            <YAxis stroke="#888" tick={{ fontSize: 10, fill: '#aaa' }} domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(10,10,12,0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} 
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} 
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px', opacity: 0.8 }} />
            {labels.map((label, index) => (
              <Line 
                key={label} type="monotone" dataKey={label} stroke={colors[index]} 
                strokeWidth={2.5} dot={false} isAnimationActive={false} 
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// =======================================================
// MAIN COMPONENT: POWER QUALITY ANALYTICS
// =======================================================
const PowerQuality = ({ opcData }) => {
  const location = useLocation();
  
  const panelOptions = ['LVMDP1', 'COS', 'SDPCompressor', 'SDPFilling', 'SDP5', 'SDP4'];
  const [activePanel, setActivePanel] = useState('LVMDP1');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const targetPanel = queryParams.get('target');
    if (targetPanel && panelOptions.includes(targetPanel)) {
      setActivePanel(targetPanel);
    }
  }, [location.search, panelOptions]);

  const panelData = opcData?.[activePanel] || {};
  const getValue = (key, def = '0.00') => {
    const val = panelData[key];
    return val !== undefined ? Number(val).toFixed(2) : def;
  };

  const getPFDetails = (val) => {
    const num = Number(val);
    const isGood = Math.abs(num) >= 0.85;
    return {
      value: Math.abs(num).toFixed(2),
      status: num < 0 ? 'LEADING' : 'LAGGING',
      color: isGood ? 'text-emerald-400 border-emerald-400/30' : 'text-red-500 border-red-500/30',
      bgClass: isGood ? 'bg-emerald-500' : 'bg-red-500'
    };
  };

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
      
      {/* ORNAMEN KOSMIK LATAR BELAKANG */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* HEADER */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Activity size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 tracking-wide uppercase">Power Quality</h1>
            <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">Harmonics & Efficiency Analytics</p>
          </div>
        </div>
        
        <div className="mt-5 md:mt-0 relative w-full md:w-64">
          <select 
            value={activePanel} 
            onChange={(e) => setActivePanel(e.target.value)}
            className="w-full appearance-none bg-black/20 backdrop-blur-md text-blue-400 font-bold py-3 pl-4 pr-10 rounded-xl border border-blue-500/30 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.15)]"
          >
            {panelOptions.map(opt => <option key={opt} value={opt} className="bg-[#1A1A1E] text-gray-200 font-semibold py-2">{opt} - ANALYTICS</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-3.5 text-blue-500 pointer-events-none" size={18} />
        </div>
      </div>

      {/* SECTION 1: SYSTEM HEALTH (Frequency & Overall THD) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        
        {/* Frequency */}
        <div className="group bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-emerald-500/30 transition-all duration-500 relative overflow-hidden flex items-center justify-between">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl transition-all duration-500 pointer-events-none group-hover:from-emerald-500/20"></div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-80"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1 drop-shadow-md">System Frequency</p>
            <p className="text-3xl font-mono text-white font-bold drop-shadow-md">{getValue('freq')} <span className="text-sm font-sans text-gray-500 font-normal">Hz</span></p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm relative z-10 text-emerald-400">
             <Activity size={28} />
          </div>
        </div>

        {/* Max THD Voltage */}
        <div className="group bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-amber-500/30 transition-all duration-500 relative overflow-hidden flex items-center justify-between">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-2xl transition-all duration-500 pointer-events-none group-hover:from-amber-500/20"></div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 opacity-80"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1 drop-shadow-md">Max THD Voltage</p>
            <p className="text-3xl font-mono text-amber-400 font-bold drop-shadow-md">
              {Math.max(Number(getValue('thd_v_a')), Number(getValue('thd_v_b')), Number(getValue('thd_v_c'))).toFixed(2)} 
              <span className="text-sm font-sans text-gray-500 font-normal ml-1">%</span>
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm relative z-10 text-amber-400">
             <ShieldAlert size={28} />
          </div>
        </div>

        {/* Max THD Current */}
        <div className="group bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-rose-500/30 transition-all duration-500 relative overflow-hidden flex items-center justify-between">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full blur-2xl transition-all duration-500 pointer-events-none group-hover:from-rose-500/20"></div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500 opacity-80"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1 drop-shadow-md">Max THD Current</p>
            <p className="text-3xl font-mono text-rose-400 font-bold drop-shadow-md">
              {Math.max(Number(getValue('thd_i_a')), Number(getValue('thd_i_b')), Number(getValue('thd_i_c'))).toFixed(2)} 
              <span className="text-sm font-sans text-gray-500 font-normal ml-1">%</span>
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-sm relative z-10 text-rose-400">
             <Zap size={28} />
          </div>
        </div>
      </div>

      {/* SECTION 2: DETAILED POWER FACTOR (Phase A, B, C) */}
      <div className="mb-8 relative z-10">
        <div className="flex items-center gap-2 px-2 mb-4">
           <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
           <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest drop-shadow-md">Power Factor (Cos Phi) Analysis</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['pf_a', 'pf_b', 'pf_c'].map((tag, i) => {
            const pf = getPFDetails(getValue(tag, '1.00'));
            const phaseColors = ['from-red-500/10', 'from-yellow-400/10', 'from-blue-500/10'];
            const hoverGlow = ['group-hover:from-red-500/20', 'group-hover:from-yellow-400/20', 'group-hover:from-blue-500/20'];
            
            return (
              <div key={tag} className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all flex flex-col justify-between relative overflow-hidden">
                <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${phaseColors[i]} to-transparent rounded-full blur-2xl transition-all pointer-events-none ${hoverGlow[i]}`}></div>
                
                <div className="flex justify-between items-center w-full mb-4 relative z-10">
                  <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest drop-shadow-md">Phase {['A','B','C'][i]}</p>
                  <Cpu className="text-gray-500" size={18} />
                </div>
                
                <div className="flex items-end justify-between relative z-10">
                  <p className={`text-4xl font-mono font-bold drop-shadow-md ${pf.color.split(' ')[0]}`}>{pf.value}</p>
                  <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded bg-black/40 border backdrop-blur-md ${pf.color}`}>
                    {pf.status}
                  </span>
                </div>
                
                {/* Visualizer Bar (Glass Style) */}
                <div className="w-full bg-black/40 border border-white/5 rounded-full h-1.5 mt-5 overflow-hidden relative z-10 shadow-inner">
                  <div className={`h-1.5 transition-all duration-1000 ${pf.bgClass} shadow-[0_0_10px_currentColor]`} style={{ width: `${Math.abs(Number(pf.value)) * 100}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: HARMONICS TREND CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
        <GroupedTrendChart 
          title={`Voltage Harmonics (THD-V) - ${activePanel}`} 
          panel={activePanel} 
          tags={['thd_v_a', 'thd_v_b', 'thd_v_c']} 
          labels={['THD_V_A', 'THD_V_B', 'THD_V_C']} 
          colors={['#EF4444', '#FBBF24', '#3B82F6']} 
        />
        
        <GroupedTrendChart 
          title={`Current Harmonics (THD-I) - ${activePanel}`} 
          panel={activePanel} 
          tags={['thd_i_a', 'thd_i_b', 'thd_i_c']} 
          labels={['THD_I_A', 'THD_I_B', 'THD_I_C']} 
          colors={['#F87171', '#FDE047', '#60A5FA']} 
        />
      </div>

    </div>
  );
};

export default PowerQuality;