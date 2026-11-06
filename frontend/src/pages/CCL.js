import React from "react";
import {
  Settings,
  RefreshCw,
  Power,
  Thermometer,
  Gauge,
  Activity,
  Factory,
} from "lucide-react";
import TrendChart from "../components/TrendChart";
import HistoricalTrendPanel from "../components/HistoricalTrendPanel";

const CCL = ({ opcData }) => {
  const cclData = opcData?.CCL || {};

  const getValue = (key, defaultVal = "0.00") =>
    cclData[key] !== undefined ? cclData[key] : defaultVal;

  const StatusCard = ({ title, isActive, icon, colorTheme }) => {
    const themes = {
      blue: {
        text: "text-blue-400",
        border: "border-blue-500/40",
        bg: "bg-blue-500/15 shadow-[0_0_20px_rgba(59,130,246,0.15)]",
      },
      orange: {
        text: "text-orange-400",
        border: "border-orange-500/40",
        bg: "bg-orange-500/15 shadow-[0_0_20px_rgba(249,115,22,0.15)]",
      },
      green: {
        text: "text-emerald-400",
        border: "border-emerald-500/40",
        bg: "bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
      },
    };
    const activeTheme = themes[colorTheme];

    return (
      <div
        className={`rounded-2xl border p-4 flex flex-col justify-center items-center text-center backdrop-blur-md transition-all duration-300 ${
          isActive
            ? `${activeTheme.bg} ${activeTheme.border}`
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

  const MachineStatusGroup = ({ machineName, prefix }) => {
    const isCIP = Number(cclData[`${prefix}_cip`]) === 1;
    const isSter = Number(cclData[`${prefix}_ster`]) === 1;
    const isProd = Number(cclData[`${prefix}_prod`]) === 1;

    return (
      <div className="group bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl group-hover:from-emerald-500/20 transition-all pointer-events-none"></div>
        <div className="flex items-center gap-2.5 mb-4 border-b border-white/10 pb-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest drop-shadow-md">
            {machineName}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3 relative z-10">
          <StatusCard
            title="CIP"
            isActive={isCIP}
            icon={<RefreshCw size={24} />}
            colorTheme="blue"
          />
          <StatusCard
            title="Steril"
            isActive={isSter}
            icon={<Settings size={24} />}
            colorTheme="orange"
          />
          <StatusCard
            title="Produksi"
            isActive={isProd}
            icon={<Power size={24} />}
            colorTheme="green"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
      {/* ORNAMEN KOSMIK LATAR BELAKANG */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-emerald-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-teal-900/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER HALAMAN */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Factory size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-200 tracking-wide uppercase">
              Coconut Cream Line (CCL)
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
              Aseptic VTIS Pasteuriser & Homogenizer Telemetry
            </p>
          </div>
        </div>
      </div>

      {/* Grid Mesin Utama CCL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 relative z-10">
        <MachineStatusGroup machineName="1. Pasteuriser VTIS" prefix="vtis" />
        <MachineStatusGroup machineName="2. Homogenizer" prefix="homo" />
        <MachineStatusGroup machineName="3. Aseptic Tank 2" prefix="ast2" />
        <MachineStatusGroup machineName="4. Aseptic Tank 3" prefix="ast3" />
      </div>

      {/* Parameter Analog Kritis (Suhu, Pressure, Flow) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl group-hover:from-red-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              Suhu TT344 VTIS
            </p>
            <p className="text-3xl font-mono text-white font-bold drop-shadow-md">
              {getValue("tt344")}{" "}
              <span className="text-sm font-sans text-gray-500 font-normal">
                °C
              </span>
            </p>
          </div>
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl backdrop-blur-sm relative z-10">
            <Thermometer size={28} />
          </div>
        </div>

        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl group-hover:from-red-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              Suhu TT44 VTIS
            </p>
            <p className="text-3xl font-mono text-white font-bold drop-shadow-md">
              {getValue("tt44")}{" "}
              <span className="text-sm font-sans text-gray-500 font-normal">
                °C
              </span>
            </p>
          </div>
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl backdrop-blur-sm relative z-10">
            <Thermometer size={28} />
          </div>
        </div>

        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl group-hover:from-red-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              Suhu TT830 VTIS
            </p>
            <p className="text-3xl font-mono text-white font-bold drop-shadow-md">
              {getValue("tt830")}{" "}
              <span className="text-sm font-sans text-gray-500 font-normal">
                °C
              </span>
            </p>
          </div>
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl backdrop-blur-sm relative z-10">
            <Thermometer size={28} />
          </div>
        </div>

        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl group-hover:from-blue-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              Pressure Homogenizer
            </p>
            <p className="text-3xl font-mono text-white font-bold drop-shadow-md">
              {getValue("homo_pressure")}{" "}
              <span className="text-sm font-sans text-gray-500 font-normal">
                Bar
              </span>
            </p>
          </div>
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl backdrop-blur-sm relative z-10">
            <Gauge size={28} />
          </div>
        </div>

        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-transparent rounded-full blur-2xl group-hover:from-teal-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              Product Flowrate
            </p>
            <p className="text-3xl font-mono text-white font-bold drop-shadow-md">
              {getValue("ft04")}{" "}
              <span className="text-sm font-sans text-gray-500 font-normal">
                L/h
              </span>
            </p>
          </div>
          <div className="p-3.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl backdrop-blur-sm relative z-10">
            <Activity size={28} />
          </div>
        </div>
      </div>

      {/* Grafik Tren */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 relative z-10">
        <TrendChart
          panel="CCL"
          tag="vtis_temp"
          title="Trend Suhu Pemanasan VTIS"
          color="#EF4444"
        />
        <TrendChart
          panel="CCL"
          tag="homo_pressure"
          title="Trend Tekanan Homogenizer"
          color="#3B82F6"
        />
      </div>

      {/* Historical Data Tracing */}
      <div className="w-full relative z-10">
        <HistoricalTrendPanel
          panel="CCL"
          tag="vtis_temp"
          title="Analisa Historis Kestabilan Suhu VTIS"
        />
      </div>
    </div>
  );
};

export default CCL;