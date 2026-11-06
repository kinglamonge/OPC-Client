import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Zap, Factory, Droplets, Server, 
  Thermometer, Gauge, Activity, Navigation, Radio
} from "lucide-react";

const Overview = ({ opcData }) => {
  const navigate = useNavigate();
  const IS_CALIBRATION_MODE = false;

  const getStatus = (panelKey) => {
    const data = opcData[panelKey] || {};
    const thdA = Number(data.thd_i_a) || 0, thdB = Number(data.thd_i_b) || 0, thdC = Number(data.thd_i_c) || 0;
    const maxTHD = Math.max(thdA, thdB, thdC);
    const vAB = Number(data.voltage_ab) || 0, vBC = Number(data.voltage_bc) || 0, vCA = Number(data.voltage_ca) || 0;

    if ((vAB > 0 && vAB < 375) || (vBC > 0 && vBC < 375) || (vCA > 0 && vCA < 375) || (vAB > 410 || vBC > 410 || vCA > 410)) return "critical"; 
    if (maxTHD > 5.0) return "warning"; 
    return "normal"; 
  };

  const [hotspots] = useState([
    { id: "LVMDP1", name: "LVMDP 1", top: "94.92%", left: "34.51%", path: "/lvmdp?target=LVMDP1", icon: Zap },
    { id: "LVMDP2", name: "LVMDP 2", top: "94.99%", left: "29.00%", path: "/lvmdp?target=LVMDP2", icon: Zap },
    { id: "COS Panel", name: "Panel COS", top: "90.50%", left: "31.70%", path: "/cos", icon: Activity },
    { id: "CWC", name: "CWC-Panel", top: "75.49%", left: "48.50%", path: "/cwc", icon: Thermometer },
    { id: "CCL", name: "CCL-Panel", top: "69.49%", left: "42.50%", path: "/ccl", icon: Server },
    { id: "SDP_Compressor", name: "SDP Compressor", top: "84.49%", left: "44.56%", path: "/sdp?target=SDP1", icon: Gauge },
    { id: "Biogas", name: "Biogas-Panel", top: "7.49%", left: "65.56%", path: "/wwtp", icon: Server },
    { id: "Boiler", name: "Boiler-Panel", top: "42.49%", left: "77.56%", path: "/boiler", icon: Factory },
    { id: "CNO", name: "CNO-Panel", top: "30.49%", left: "82.56%", path: "/cno", icon: Factory },
    { id: "WaterFlow", name: "WaterHeader", top: "80.49%", left: "58.56%", path: "/waterflow", icon: Droplets },
  ]);

  const handleMapClick = (e) => {
    if (!IS_CALIBRATION_MODE) return;
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    console.log(`{ top: '${y.toFixed(2)}%', left: '${x.toFixed(2)}%' }`);
  };

  const HotspotIndicator = ({ status, name, onClick, Icon }) => {
    const themes = {
      critical: {
        bg: "bg-white/20 border-red-500 shadow-[0_4px_25px_rgba(239,68,68,0.8)] text-white",
        dot: "bg-red-400 shadow-[0_0_12px_rgba(239,68,68,1)]"
      },
      warning: {
        bg: "bg-white/20 border-yellow-500 shadow-[0_4px_25px_rgba(234,179,8,0.8)] text-white",
        dot: "bg-yellow-400 shadow-[0_0_12px_rgba(234,179,8,1)]"
      },
      normal: {
        bg: "bg-white/20 border-emerald-400 shadow-[0_4px_20px_rgba(0,0,0,0.4)] text-white",
        dot: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)]"
      }
    };

    const currentTheme = themes[status];

    return (
      <div className="group absolute z-10 flex flex-col items-center cursor-pointer hover:z-50" style={{ transform: "translate(-50%, -50%)" }}>
        <div onClick={(e) => { e.stopPropagation(); onClick(); }} className={`relative p-2.5 rounded-2xl border backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:scale-110 ${currentTheme.bg}`}>
          <span className="absolute inset-0 rounded-2xl animate-ping opacity-50" style={{ backgroundColor: 'currentColor' }}></span>
          <Icon size={18} className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
          <div className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border border-white/60 ${currentTheme.dot}`}></div>
        </div>
        <div className="absolute top-full mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pointer-events-none flex flex-col items-center">
          <div className="w-2.5 h-2.5 rotate-45 bg-white/20 border-l border-t border-white/40 -mb-1.5 relative z-10 backdrop-blur-xl"></div>
          <div className="bg-white/10 backdrop-blur-xl border-t border-l border-white/40 border-b border-r border-white/10 text-white text-[11px] font-bold tracking-widest uppercase px-4 py-2 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] whitespace-nowrap">
            {name}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-76px)] p-4 md:p-6 overflow-hidden flex items-center justify-center bg-transparent">
      
      {/* 1. AMBIENT BACKGROUND GLOW (Menembus Bingkai Peta) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[-10%] w-[50vw] h-[50vw] bg-teal-500/15 rounded-full blur-[120px] mix-blend-screen opacity-70"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-500/15 rounded-full blur-[120px] mix-blend-screen opacity-60"></div>
      </div>

      {/* 2. LIQUID GLASS MAP CONTAINER */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full max-h-[90vh]">
        {/* Bingkai Kaca Sangat Bening, Border Atas/Kiri Terang */}
        <div className="relative inline-block w-full h-full bg-white/[0.05] backdrop-blur-lg border-t border-l border-white/30 border-b border-r border-white/5 p-2.5 md:p-4 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition-all duration-700 hover:bg-white/[0.08]">
          
          {/* FLOATING PILL HEADER */}
          <div className="absolute top-6 left-6 md:top-8 md:left-8 z-20 flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white/10 backdrop-blur-xl border-t border-l border-white/40 border-b border-r border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <Radio size={16} className="text-teal-300 animate-pulse drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
              <span className="text-xs font-black tracking-[0.25em] text-white uppercase drop-shadow-md">Site Map</span>
            </div>
            
            <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-white/10 backdrop-blur-xl border-t border-l border-white/40 border-b border-r border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]"></div><span className="text-[10px] text-white font-bold uppercase tracking-widest drop-shadow-md">OK</span></div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,1)]"></div><span className="text-[10px] text-white font-bold uppercase tracking-widest drop-shadow-md">Warn</span></div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse shadow-[0_0_8px_rgba(248,113,113,1)]"></div><span className="text-[10px] text-white font-bold uppercase tracking-widest drop-shadow-md">Crit</span></div>
            </div>
          </div>

          {/* MAP IMAGE INSIDE GLASS FRAME */}
          <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden border border-white/10 shadow-inner bg-black/20">
            <img
              src="/images/factory-drone-view.jpeg"
              alt="Factory Drone View"
              onClick={handleMapClick}
              className={`w-full h-full object-cover transition-transform duration-[15s] ease-out hover:scale-110 ${
                IS_CALIBRATION_MODE ? "cursor-crosshair" : "opacity-90 mix-blend-lighten"
              }`}
            />

            {hotspots.map((spot) => {
              const IconComponent = spot.icon || Navigation;
              return (
                <div key={spot.id} style={{ top: spot.top, left: spot.left }} className="absolute">
                  <HotspotIndicator status={getStatus(spot.id)} name={spot.name} Icon={IconComponent} onClick={() => navigate(spot.path)} />
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Overview;