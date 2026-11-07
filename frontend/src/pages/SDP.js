import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, Zap, BatteryCharging, ChevronDown, Cpu } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// =======================================================
// KOMPONEN: GROUPED TREND CHART (GLASSMORPHISM Dinamis)
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
      } catch (err) { console.error(`Gagal load grafik ${panel}:`, err); }
    };

    fetchGroupedData();
    const interval = setInterval(fetchGroupedData, 2000);
    return () => clearInterval(interval);
  }, [panel, tags, labels]);

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center text-gray-500 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10">
      <Cpu className="animate-pulse mb-2 text-orange-500/50" size={24} />
      <span className="text-xs font-mono tracking-widest uppercase">Loading Historian...</span>
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
            <YAxis stroke="#888" tick={{ fontSize: 10, fill: '#aaa' }} domain={['auto', 'auto']} tickFormatter={(val) => val.toFixed(1)} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(10,10,12,0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} 
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} 
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px', opacity: 0.8 }} />
            {labels.map((label, index) => (
              <Line key={label} type="monotone" dataKey={label} stroke={colors[index]} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// =======================================================
// MAIN COMPONENT: SUB DISTRIBUTION PANEL (SDP)
// =======================================================
const SDP = ({ opcData }) => {
  const location = useLocation();
  const panelOptions = ['SDPCompressor', 'SDPFilling', 'SDP5', 'SDP4']; 
  const [activePanel, setActivePanel] = useState('SDPCompressor');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const targetPanel = queryParams.get('target');
    if (targetPanel && panelOptions.includes(targetPanel)) {
      setActivePanel(targetPanel);
    }
  }, [location.search, panelOptions]);

  const panelData = opcData?.[activePanel] || {};
  const getValue = (key, def = '0.0') => (panelData[key] !== undefined ? panelData[key] : def);

  const getPFDetails = (tagKey) => {
    const val = Number(panelData[tagKey]);
    return {
      value: Math.abs(val || 0).toFixed(2),
      status: val < 0 ? 'LEADING' : 'LAGGING',
      color: val < 0 ? 'text-cyan-400 border-cyan-400/30' : 'text-amber-500 border-amber-500/30'
    };
  };

  const phaseColors = ['bg-red-500', 'bg-yellow-400', 'bg-blue-500'];
  const phaseTextColors = ['text-red-500', 'text-yellow-400', 'text-blue-500'];
  const phaseGlows = ['group-hover:from-red-500/20', 'group-hover:from-yellow-500/20', 'group-hover:from-blue-500/20'];

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
      
      {/* ORNAMEN KOSMIK LATAR BELAKANG */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[50%] bg-orange-900/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-500/20 text-orange-500 rounded-2xl border border-orange-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(249,115,22,0.2)]">
            <Zap size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-orange-200 tracking-wide uppercase">Sub Distribution Panel</h1>
            <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">SDP Monitoring</p>
          </div>
        </div>
        
        <div className="mt-5 md:mt-0 relative w-full md:w-64">
          <select 
            value={activePanel} 
            onChange={(e) => setActivePanel(e.target.value)}
            className="w-full appearance-none bg-black/20 backdrop-blur-md text-orange-400 font-bold py-3 pl-4 pr-10 rounded-xl border border-orange-500/30 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.15)]"
          >
            {panelOptions.map(opt => (
              <option key={opt} value={opt} className="bg-[#1A1A1E] text-gray-200 font-semibold py-2">
                {opt} - SUB PANEL
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3.5 text-orange-500 pointer-events-none" size={18} />
        </div>
      </div>

      {/* VOLTAGE SECTION */}
      <div className="space-y-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {['voltage_ab', 'voltage_bc', 'voltage_ca'].map((tag, i) => (
            <div key={tag} className="group bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 relative overflow-hidden flex items-center justify-between">
              <div className={`absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl transition-all duration-500 pointer-events-none ${phaseGlows[i]}`}></div>
              <div className={`absolute top-0 left-0 w-1.5 h-full ${phaseColors[i]} opacity-80`}></div>
              
              <div className="pl-3 relative z-10">
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1 drop-shadow-md">Voltage {['A-B','B-C','C-A'][i]}</p>
                <p className="text-3xl font-mono text-white font-bold drop-shadow-md">{getValue(tag)} <span className="text-sm font-sans text-gray-500 font-normal">V</span></p>
              </div>
              <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm relative z-10 ${phaseTextColors[i]}`}>
                 <Zap size={24} />
              </div>
            </div>
          ))}
        </div>
        <GroupedTrendChart title={`Trend Voltage (V) - ${activePanel}`} panel={activePanel} tags={['voltage_ab', 'voltage_bc', 'voltage_ca']} labels={['V_AB', 'V_BC', 'V_CA']} colors={['#EF4444', '#FBBF24', '#3B82F6']} />
      </div>

      {/* CURRENT & THD SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 relative z-10">
        
        {/* Kolom Arus (A, B, C, N) */}
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            {['current_a', 'current_b', 'current_c', 'current_n'].map((tag, i) => {
              const extendedColors = [...phaseColors, 'bg-purple-500'];
              const extendedGlows = [...phaseGlows, 'group-hover:from-purple-500/20'];
              return (
                <div key={tag} className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] hover:border-white/20 transition-all relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-1 ${extendedColors[i]} opacity-80`}></div>
                  <div className={`absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-tl from-white/5 to-transparent rounded-full blur-xl transition-all pointer-events-none ${extendedGlows[i]}`}></div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-1">Current {['A','B','C','N'][i]}</p>
                  <p className="text-xl font-mono text-white font-bold mt-2 drop-shadow-md">{getValue(tag)} <span className="text-xs font-sans text-gray-500 font-normal">A</span></p>
                </div>
              );
            })}
          </div>
          <GroupedTrendChart title={`Trend Current Load (A) - ${activePanel}`} panel={activePanel} tags={['current_a', 'current_b', 'current_c', 'current_n']} labels={['I_A', 'I_B', 'I_C', 'I_N']} colors={['#EF4444', '#FBBF24', '#3B82F6', '#8B5CF6']} />
        </div>

        {/* Kolom THD (A, B, C) */}
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {['thd_i_a', 'thd_i_b', 'thd_i_c'].map((tag, i) => (
              <div key={tag} className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] hover:border-white/20 transition-all relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-500 opacity-80"></div>
                <div className={`absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-tl from-white/5 to-transparent rounded-full blur-xl transition-all pointer-events-none ${phaseGlows[i]}`}></div>
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-1">THD I {['A','B','C'][i]}</p>
                <p className="text-xl font-mono text-white font-bold mt-2 drop-shadow-md">{getValue(tag)} <span className="text-xs font-sans text-gray-500 font-normal">%</span></p>
              </div>
            ))}
          </div>
          <GroupedTrendChart title={`Trend THD I (%) - ${activePanel}`} panel={activePanel} tags={['thd_i_a', 'thd_i_b', 'thd_i_c']} labels={['THD_A', 'THD_B', 'THD_C']} colors={['#F87171', '#FDE047', '#60A5FA']} />
        </div>
      </div>

      {/* POWER FACTOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        {['pf_a', 'pf_b', 'pf_c'].map((tag, i) => {
          const pf = getPFDetails(tag);
          return (
            <div key={tag} className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all flex items-center justify-between relative overflow-hidden">
               <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:from-white/10 transition-all pointer-events-none"></div>
              <div className="relative z-10">
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest drop-shadow-md">Power Factor L{i+1}</p>
                <div className="flex items-center space-x-3 mt-2">
                  <p className="text-3xl font-mono text-white font-bold drop-shadow-md">{pf.value}</p>
                  <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded bg-black/40 border backdrop-blur-md ${pf.color}`}>{pf.status}</span>
                </div>
              </div>
              <Activity className="text-gray-500 relative z-10" size={32} />
            </div>
          );
        })}
      </div>

      {/* ACCUMULATED ENERGY */}
      <div className="space-y-5 pt-4 border-t border-white/10 relative z-10">
        <div className="flex items-center gap-2 px-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
           <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest drop-shadow-md">Accumulated Energy Consumption</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group bg-white/5 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(16,185,129,0.1)] hover:border-emerald-500/40 hover:-translate-y-1 transition-all flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-80"></div>
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl transition-all pointer-events-none group-hover:from-emerald-500/20"></div>
            <div className="pl-3 relative z-10">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest drop-shadow-md">Active Energy</p>
              <p className="text-3xl font-mono text-emerald-400 font-black mt-2 drop-shadow-md">{getValue('kwh_delivered')} <span className="text-sm font-sans text-gray-500 font-normal">kWh</span></p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 backdrop-blur-sm relative z-10">
               <BatteryCharging className="text-emerald-400" size={32} />
            </div>
          </div>
          
          <div className="group bg-white/5 backdrop-blur-xl border border-cyan-500/20 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(6,182,212,0.1)] hover:border-cyan-500/40 hover:-translate-y-1 transition-all flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500 opacity-80"></div>
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl transition-all pointer-events-none group-hover:from-cyan-500/20"></div>
            <div className="pl-3 relative z-10">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest drop-shadow-md">Reactive Energy</p>
              <p className="text-3xl font-mono text-cyan-400 font-black mt-2 drop-shadow-md">{getValue('kvarh_delivered')} <span className="text-sm font-sans text-gray-500 font-normal">kvarh</span></p>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 backdrop-blur-sm relative z-10">
               <BatteryCharging className="text-cyan-400" size={32} />
            </div>
          </div>
          
          <div className="group bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(168,85,247,0.1)] hover:border-purple-500/40 hover:-translate-y-1 transition-all flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500 opacity-80"></div>
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl transition-all pointer-events-none group-hover:from-purple-500/20"></div>
            <div className="pl-3 relative z-10">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest drop-shadow-md">Apparent Energy</p>
              <p className="text-3xl font-mono text-purple-400 font-black mt-2 drop-shadow-md">{getValue('kvah_delivered')} <span className="text-sm font-sans text-gray-500 font-normal">kVAh</span></p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm relative z-10">
               <BatteryCharging className="text-purple-400" size={32} />
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default SDP;