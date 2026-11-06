import React from "react";
import {
  Settings,
  RefreshCw,
  Power,
  Droplets,
  TestTube,
  Database,
  FlaskConical,
  PackageCheck,
  Factory,
} from "lucide-react";
import TrendChart from "../components/TrendChart";
import HistoricalTrendPanel from "../components/HistoricalTrendPanel";

const CWC = ({ opcData }) => {
  const cwcData = opcData?.CWC || {};

  const getValue = (key, defaultVal = "0.00") =>
    cwcData[key] !== undefined ? cwcData[key] : defaultVal;

  // 1. Komponen Helper untuk Kotak Indikator (CIP, Ster, Prod)
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

  // 2. Komponen Helper untuk Membungkus 1 Mesin (3 Status Card) - Berbasis Boolean Tag PLC
  const MachineStatusGroup = ({ machineName, prefix }) => {
    const isCIP = Number(cwcData[`${prefix}_cip`]) === 1;
    const isSter = Number(cwcData[`${prefix}_ster`]) === 1;
    const isProd = Number(cwcData[`${prefix}_prod`]) === 1;

    return (
      <div className="group bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl group-hover:from-cyan-500/20 transition-all pointer-events-none"></div>
        <div className="flex items-center gap-2.5 mb-4 border-b border-white/10 pb-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest drop-shadow-md">
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

  // 3. Komponen Khusus Evaporator - Berbasis Nomor Step PLC (140 = Running)
  const EvaporatorStatusGroup = () => {
    const cipStep = Number(cwcData["evap_cip_step"] ?? 1);
    const sterStep = Number(cwcData["evap_ster_step"] ?? 1);
    const prodStep = Number(cwcData["evap_prod_step"] ?? 1);

    const isCIP = cipStep === 140;
    const isSter = sterStep === 140;
    const isProd = prodStep === 140;

    return (
      <div className="group bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl group-hover:from-cyan-500/20 transition-all pointer-events-none"></div>
        <div className="flex items-center gap-2.5 mb-4 border-b border-white/10 pb-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest drop-shadow-md">
            3. Evaporator
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
            title="Water Flush"
            isActive={isSter}
            icon={<Droplets size={24} />}
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

  // Logika peringatan BRIX Evaporator (Rentang normal 60-64% saat evap_prod_step = 140)
  const brixVal = parseFloat(getValue("evap_brix"));
  const isEvapProdRunning = Number(cwcData["evap_prod_step"] ?? 1) === 140;
  const isBrixOutOfRange = isEvapProdRunning && (brixVal < 60 || brixVal > 64);

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
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
              Coconut Water Concentrated (CWC)
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
              Pasteuriser, Separator, Evaporator & DSI Sterilizer System
            </p>
          </div>
        </div>
      </div>

      {/* Grid Status Operasional Mesin Terpisah */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 relative z-10">
        <MachineStatusGroup machineName="1. Pasteuriser" prefix="pasteur" />
        <MachineStatusGroup machineName="2. Separator" prefix="sep" />
        <EvaporatorStatusGroup />
        <MachineStatusGroup machineName="4. Sterilizer DSI" prefix="dsi" />
      </div>

      {/* Grid Nilai Analog (Flowrate, Brix, Totalizer) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl group-hover:from-blue-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              Flowrate from Drilling
            </p>
            <p className="text-3xl font-mono text-white font-bold drop-shadow-md">
              {getValue("flowrate_input")}{" "}
              <span className="text-sm font-sans text-gray-500 font-normal">
                L/h
              </span>
            </p>
          </div>
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl backdrop-blur-sm relative z-10">
            <Droplets size={28} />
          </div>
        </div>

        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-white/20 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl group-hover:from-purple-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              Total from Drilling
            </p>
            <p className="text-3xl font-mono text-white font-bold drop-shadow-md">
              {getValue("input_totalizer", "0")}{" "}
              <span className="text-sm font-sans text-gray-500 font-normal">
                L
              </span>
            </p>
          </div>
          <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl backdrop-blur-sm relative z-10">
            <Database size={28} />
          </div>
        </div>

        <div
          className={`group bg-white/5 backdrop-blur-xl rounded-3xl border p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-500 flex items-center justify-between relative overflow-hidden ${
            isBrixOutOfRange
              ? "border-red-500/50 hover:border-red-400"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          <div
            className={`absolute top-0 left-0 w-1.5 h-full opacity-80 ${
              isBrixOutOfRange ? "bg-red-500" : "bg-orange-500"
            }`}
          ></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              Evaporator BRIX
            </p>
            <p
              className={`text-3xl font-mono font-bold drop-shadow-md transition-colors duration-300 ${
                isBrixOutOfRange ? "text-red-500 animate-pulse" : "text-white"
              }`}
            >
              {getValue("evap_brix")}
              <span
                className={`text-sm font-sans ml-1 font-normal ${
                  isBrixOutOfRange ? "text-red-400" : "text-gray-500"
                }`}
              >
                %
              </span>
              {isBrixOutOfRange && (
                <span className="ml-2 text-xs font-sans text-red-400 tracking-wide">
                  {brixVal < 60 ? "▼ LOW" : "▲ HIGH"}
                </span>
              )}
            </p>
          </div>
          <div
            className={`p-3.5 rounded-2xl border backdrop-blur-sm relative z-10 transition-colors duration-300 ${
              isBrixOutOfRange
                ? "bg-red-500/15 border-red-500/30 text-red-400"
                : "bg-orange-500/10 border-orange-500/20 text-orange-400"
            }`}
          >
            <TestTube size={28} />
          </div>
        </div>
      </div>

      {/* Panel Output Produk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-teal-500/20 p-6 shadow-[0_8px_32px_0_rgba(20,184,166,0.1)] hover:-translate-y-1 hover:border-teal-500/40 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500 opacity-80"></div>
          <div className="pl-3 min-w-0 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              Output Non-UHT · Evaporator
            </p>
            <p className="text-3xl font-mono text-teal-400 font-black mt-2 truncate drop-shadow-md">
              {getValue("evap_output_totalizer", "0")}
              <span className="text-sm font-sans text-gray-500 font-normal ml-1.5">
                L
              </span>
            </p>
          </div>
          <div className="p-3.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl shrink-0 relative z-10">
            <FlaskConical size={28} />
          </div>
        </div>

        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-yellow-500/20 p-6 shadow-[0_8px_32px_0_rgba(234,179,8,0.1)] hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500 opacity-80"></div>
          <div className="pl-3 min-w-0 relative z-10">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              Output UHT · Filler Astepo
            </p>
            <p className="text-3xl font-mono text-yellow-400 font-black mt-2 truncate drop-shadow-md">
              {getValue("astepo_output_totalizer", "0")}
              <span className="text-sm font-sans text-gray-500 font-normal ml-1.5">
                L
              </span>
            </p>
          </div>
          <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-2xl shrink-0 relative z-10">
            <PackageCheck size={28} />
          </div>
        </div>
      </div>

      {/* Grafik Tren Analog */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 relative z-10">
        <TrendChart
          panel="CWC"
          tag="flowrate_input"
          title="Trend Flowrate Input"
          color="#3B82F6"
        />
        <TrendChart
          panel="CWC"
          tag="evap_brix"
          title="Trend Kualitas BRIX"
          color="#F97316"
        />
      </div>

      {/* Tracing Historis BRIX */}
      <div className="w-full relative z-10">
        <HistoricalTrendPanel
          panel="CWC"
          tag="evap_brix"
          title="Analisa Dan Tracing Historis Evaporator BRIX"
        />
      </div>
    </div>
  );
};

export default CWC;