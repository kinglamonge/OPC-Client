import React from "react";
import {
  Scale,
  Droplets,
  Database,
  Truck,
  Activity,
  Power,
  AlertOctagon,
  CheckCircle2,
  Factory,
} from "lucide-react";
import TrendChart from "../components/TrendChart";
import HistoricalTrendPanel from "../components/HistoricalTrendPanel";

const CNO = ({ opcData }) => {
  const cnoData = opcData?.CNO || {};

  const getValue = (key, defaultVal = "0.00") =>
    cnoData[key] !== undefined ? cnoData[key] : defaultVal;

  const StatusCard = ({ title, isActive, icon, colorTheme }) => {
    const themes = {
      blue: {
        text: "text-blue-400",
        border: "border-blue-500/40",
        bg: "bg-blue-500/15 shadow-[0_0_20px_rgba(59,130,246,0.15)]",
      },
      amber: {
        text: "text-amber-400",
        border: "border-amber-500/40",
        bg: "bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
      },
      green: {
        text: "text-emerald-400",
        border: "border-emerald-500/40",
        bg: "bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
      },
      red: {
        text: "text-red-400",
        border: "border-red-500/40",
        bg: "bg-red-500/15 shadow-[0_0_20px_rgba(239,68,68,0.15)]",
      },
    };
    const activeTheme = themes[colorTheme];

    return (
      <div
        className={`rounded-2xl border p-4 flex flex-col justify-center items-center text-center backdrop-blur-md transition-all duration-300 ${
          isActive
            ? `${activeTheme.bg}${activeTheme.border}`
            : "bg-black/20 border-white/5 opacity-60"
        }`}
      >
        <div
          className={`mb-2 ${
            isActive ? `${activeTheme.text} animate-pulse` : "text-gray-600"
          }`}
        >
          {icon}
        </div>
        <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">
          {title}
        </p>
        <p
          className={`text-xs font-mono font-bold tracking-wider ${
            isActive ? activeTheme.text : "text-gray-600"
          }`}
        >
          {isActive ? "ACTIVE" : "IDLE"}
        </p>
      </div>
    );
  };

  // Komponen Visualisasi Storage Tank CNO (Kapasitas Maksimal 250 Ton)
  const StorageTankCard = ({ title, tag, maxCapacity = 250 }) => {
    const currentVal = parseFloat(getValue(tag, "0"));
    const percentage = Math.min((currentVal / maxCapacity) * 100, 100).toFixed(1);
    const isHighLevel = currentVal > maxCapacity * 0.9;

    return (
      <div className="group bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-2xl group-hover:from-amber-500/20 transition-all pointer-events-none"></div>
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl border backdrop-blur-sm ${
                isHighLevel
                  ? "bg-red-500/15 border-red-500/30 text-red-400"
                  : "bg-amber-500/15 border-amber-500/30 text-amber-400"
              }`}
            >
              <Database size={26} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest drop-shadow-md">
                {title}
              </h3>
              <p className="text-[10px] text-gray-400 font-mono tracking-wider mt-0.5">
                Max Cap: {maxCapacity} T
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-3xl font-mono font-black drop-shadow-md ${
                isHighLevel ? "text-red-400 animate-pulse" : "text-amber-400"
              }`}
            >
              {currentVal.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 font-sans">Ton</p>
          </div>
        </div>

        {/* Visualisasi Level Bar */}
        <div className="mt-3 relative z-10">
          <div className="flex justify-between text-[10px] text-gray-400 font-mono mb-2">
            <span>0%</span>
            <span className="font-bold text-white">{percentage}%</span>
          </div>
          <div className="w-full bg-black/40 rounded-full h-3.5 border border-white/10 overflow-hidden relative shadow-inner">
            <div
              className={`h-full transition-all duration-1000 ease-in-out ${
                isHighLevel
                  ? "bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                  : "bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              }`}
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/25"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Status Logika untuk Pompa Loading
  const isPumpReady = Number(cnoData["loading_pump_ready"]) === 1;
  const isPumpRun = Number(cnoData["loading_pump_run"]) === 1;
  const isPumpFault = Number(cnoData["loading_pump_fault"]) === 1;

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
      {/* ORNAMEN KOSMIK LATAR BELAKANG */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-amber-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER HALAMAN */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Factory size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-amber-200 tracking-wide uppercase">
              Crude Nut Oil (CNO) Plant
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
              Mass Balance, Storage Tank & Truck Loading Telemetry
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: YIELD & MASS BALANCE (INPUT KELAPA VS OUTPUT MINYAK) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-emerald-500/30 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl group-hover:from-emerald-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
              Total Input Kelapa Mentah
            </p>
            <p className="text-3xl font-mono text-white font-black mt-2 drop-shadow-md">
              {getValue("total_input_coconut", "0.00")}
              <span className="text-sm font-sans text-gray-500 font-normal ml-2">
                Ton
              </span>
            </p>
          </div>
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl backdrop-blur-sm relative z-10">
            <Scale size={32} />
          </div>
        </div>

        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-amber-500/30 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-2xl group-hover:from-amber-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
              Total Output CNO (Yield)
            </p>
            <p className="text-3xl font-mono text-amber-400 font-black mt-2 drop-shadow-md">
              {getValue("total_output_cno", "0.00")}
              <span className="text-sm font-sans text-gray-500 font-normal ml-2">
                m3/H
              </span>
            </p>
          </div>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl backdrop-blur-sm relative z-10">
            <Droplets size={32} />
          </div>
        </div>
      </div>

      {/* SECTION 2: STORAGE TANKS AREA (2 x 250 T) */}
      <div className="mb-8 relative z-10">
        <div className="flex items-center gap-2 px-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest drop-shadow-md">
            CNO Storage Area
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StorageTankCard
            title="Storage Tank 1"
            tag="tank1_level"
            maxCapacity={250}
          />
          <StorageTankCard
            title="Storage Tank 2"
            tag="tank2_level"
            maxCapacity={250}
          />
        </div>
      </div>

      {/* SECTION 3: LOADING BAY (TRUCK DISPATCH) */}
      <div className="mb-8 relative z-10">
        <div className="flex items-center gap-2 px-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest drop-shadow-md">
            Truck Loading Bay
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel Status Pompa */}
          <div className="group bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 lg:col-span-1 relative overflow-hidden">
            <h3 className="text-xs font-bold text-blue-400 mb-4 uppercase tracking-widest text-center">
              Loading Pump Status
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <StatusCard
                title="Ready"
                isActive={isPumpReady}
                icon={<CheckCircle2 size={24} />}
                colorTheme="blue"
              />
              <StatusCard
                title="Running"
                isActive={isPumpRun}
                icon={<Power size={24} />}
                colorTheme="green"
              />
              <StatusCard
                title="Fault"
                isActive={isPumpFault}
                icon={<AlertOctagon size={24} />}
                colorTheme="red"
              />
            </div>
          </div>

          {/* Panel Flowmeter Loading */}
          <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl group-hover:from-blue-500/20 transition-all pointer-events-none"></div>
            <div className="flex items-center space-x-5 relative z-10">
              <div className="p-4 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-2xl relative backdrop-blur-sm">
                <Truck size={36} />
                {isPumpRun && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                  Loading Flowrate
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-mono text-white font-black drop-shadow-md">
                    {getValue("loading_flowrate", "0.00")}
                  </p>
                  <span className="text-sm font-sans text-gray-500">Ton/h</span>
                </div>
              </div>
            </div>

            {/* Totalizer Loading */}
            <div className="sm:pl-6 sm:border-l border-white/10 relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={14} className="text-amber-400" />
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  Totalizer Transfer
                </p>
              </div>
              <p className="text-3xl font-mono text-amber-400 font-black drop-shadow-md">
                {getValue("loading_totalizer", "0.00")}{" "}
                <span className="text-xs text-gray-500 font-sans font-normal">
                  Ton
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: GRAFIK & TRACING HISTORIS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 relative z-10">
        <TrendChart
          panel="CNO"
          tag="tank1_level"
          title="Trend Level Storage Tank 1"
          color="#F59E0B"
        />
        <TrendChart
          panel="CNO"
          tag="loading_flowrate"
          title="Trend Laju Pengisian (Loading Flowrate)"
          color="#3B82F6"
        />
      </div>

      <div className="w-full relative z-10">
        <HistoricalTrendPanel
          panel="CNO"
          tag="loading_flowrate"
          title="Analisa Log Historis Distribusi Minyak (Loading Tracing)"
        />
      </div>
    </div>
  );
};

export default CNO;