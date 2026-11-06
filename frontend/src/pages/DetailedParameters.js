import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Activity, Database, Droplet, Zap, Thermometer, Wind } from "lucide-react";

// ======================================================================
// 1. KONFIGURASI PARAMETER (TEMPLATE UNTUK DITAMBAHKAN KEMUDIAN)
// ======================================================================
// Cara menambah: 
// 1. Pilih atau buat 'Area' baru (misal: "Utility Area")
// 2. Pilih atau buat 'Machine' baru di dalam Area (misal: "Water Tank")
// 3. Masukkan 'panel' dan 'tag' yang sesuai dengan program OPC Anda.
// ======================================================================
const PARAMETER_CONFIG = [
  
  {
    area: "Production Area",
    machines: [
      {
        name: "CWC Evaporator",
        icon: <Thermometer size={18} className="text-red-400" />,
        parameters: [
          { label: "TT11", panel: "CWC", tag: "tt11", unit: "°C", type: "number" },
          { label: "TT21", panel: "CWC", tag: "tt21", unit: "°C", type: "number" },
          { label: "TT31", panel: "CWC", tag: "tt31", unit: "°C", type: "number" },
          { label: "Production Step", panel: "CWC", tag: "evap_prod_step", unit: "", type: "status" },
          // Tambahkan parameter CWC lainnya di sini
        ]
      },
      {
        name: "CWC Tank Before",
        icon: <Thermometer size={18} className="text-red-400" />,
        parameters: [
          { label: "LT4200", panel: "CWC", tag: "lt4200", unit: "%", type: "number" },
          { label: "TT4200", panel: "CWC", tag: "tt4200", unit: "°C", type: "number" },
          { label: "LT4300", panel: "CWC", tag: "lt4300", unit: "%", type: "number" },
          { label: "TT4300", panel: "CWC", tag: "tt4300", unit: "°C", type: "number" },
          { label: "LT4400", panel: "CWC", tag: "lt4400", unit: "%", type: "number" },
          { label: "TT4400", panel: "CWC", tag: "tt4400", unit: "°C", type: "number" },
          // Tambahkan parameter CWC lainnya di sini
        ]
      },
      {
        name: "CWC Pasteuriser",
        icon: <Thermometer size={18} className="text-red-400" />,
        parameters: [
          { label: "TT3001", panel: "CWC", tag: "tt3001", unit: "°C", type: "number" },
          { label: "TT3002", panel: "CWC", tag: "tt3002", unit: "°C", type: "number" },
          { label: "TT3003", panel: "CWC", tag: "tt3003", unit: "°C", type: "number" },
          { label: "TT3004", panel: "CWC", tag: "tt3004", unit: "°C", type: "number" },
          { label: "TT3005", panel: "CWC", tag: "tt3005", unit: "°C", type: "number" },
          { label: "TT3006", panel: "CWC", tag: "tt3006", unit: "°C", type: "number" },
          { label: "TT3007", panel: "CWC", tag: "tt3007", unit: "°C", type: "number" },
          { label: "TT3010", panel: "CWC", tag: "tt3010", unit: "°C", type: "number" },
          { label: "FT3001", panel: "CWC", tag: "ft3001", unit: "m³/h", type: "number" },
          // Tambahkan parameter CWC lainnya di sini
        ]
      },
      {
        name: "CWC Tank After",
        icon: <Thermometer size={18} className="text-red-400" />,
        parameters: [
          { label: "LT4800", panel: "CWC", tag: "lt4800", unit: "%", type: "number" },
          { label: "TT4800", panel: "CWC", tag: "tt4800", unit: "°C", type: "number" },
          { label: "LT4900", panel: "CWC", tag: "lt4900", unit: "%", type: "number" },
          { label: "TT4900", panel: "CWC", tag: "tt4900", unit: "°C", type: "number" },
          { label: "LT5000", panel: "CWC", tag: "lt5000", unit: "%", type: "number" },
          { label: "TT5000", panel: "CWC", tag: "tt5000", unit: "°C", type: "number" },
          // Tambahkan parameter CWC lainnya di sini
        ]
      },
      {
        name: "CCL VTIS",
        icon: <Thermometer size={18} className="text-red-400" />,
        parameters: [
          { label: "TT44", panel: "CCL", tag: "tt44", unit: "°C", type: "number" },
          { label: "TT51", panel: "CCL", tag: "tt51", unit: "°C", type: "number" },
          { label: "TT342", panel: "CCL", tag: "tt342", unit: "°C", type: "number" },
          { label: "TT344", panel: "CCL", tag: "tt344", unit: "°C", type: "number" },
          { label: "TT830", panel: "CCL", tag: "tt830", unit: "°C", type: "number" },
          { label: "FT04", panel: "CCL", tag: "ft04", unit: "m³/h", type: "number" },
          // Tambahkan parameter CCL lainnya di sini
        ]
      }
    ]
  },
  {
    area: "Utility Area",
    machines: [
      {
        name: "Raw Water System",
        icon: <Droplet size={18} className="text-blue-400" />,
        parameters: [
          { label: "Level Tangki Raw Water", panel: "WaterFlow", tag: "ft_opening_total", unit: "m³", type: "number" },
          { label: "Level Tangki RO", panel: "WaterFlow", tag: "ft_dc_total", unit: "m³", type: "number" },
          // Tambahkan parameter tangki/air lainnya di sini
        ]
      },
      {
        name: "Electrical COS",
        icon: <Zap size={18} className="text-yellow-400" />,
        parameters: [
          { label: "Voltage AB", panel: "COS", tag: "voltage_ab", unit: "V", type: "number" },
          { label: "Voltage BC", panel: "COS", tag: "voltage_bc", unit: "V", type: "number" },
          { label: "Voltage CA", panel: "COS", tag: "voltage_ca", unit: "V", type: "number" },
          // Tambahkan parameter listrik COS lainnya di sini
        ]
      }
    ]
  },
  {
    area: "WWTP Area",
    machines: [
      {
        name: "Biogas",
        icon: <Droplet size={18} className="text-blue-400" />,
        parameters: [
          { label: "AE-201", panel: "WWTP", tag: "ph_equalization", unit: "", type: "number" },
          { label: "AE-202", panel: "WWTP", tag: "ph_reactor", unit: "", type: "number" },
          { label: "AE-301", panel: "WWTP", tag: "ae301", unit: "", type: "number" },
          { label: "AE-401", panel: "WWTP", tag: "ae401", unit: "", type: "number" },
          { label: "AE-402", panel: "WWTP", tag: "ae402", unit: "", type: "number" },
          { label: "AE-601", panel: "WWTP", tag: "ph_effluent", unit: "", type: "number" },
          { label: "AE-501", panel: "WWTP", tag: "do_aeration", unit: "mg/L", type: "number" },
          { label: "FT-102", panel: "WWTP", tag: "ft102", unit: "m³/h", type: "number" },
          { label: "FT-201", panel: "WWTP", tag: "ft201", unit: "m³/h", type: "number" },
          { label: "FT-301", panel: "WWTP", tag: "ft301", unit: "m³/h", type: "number" },
          { label: "FT-401", panel: "WWTP", tag: "ft401", unit: "m³/h", type: "number" },
          { label: "FT-402", panel: "WWTP", tag: "ft402", unit: "m³/h", type: "number" },
          // Tambahkan parameter tangki/air lainnya di sini
        ]
      },
    ]
  },
];

// ======================================================================
// 2. KOMPONEN UTAMA
// ======================================================================
const DetailedParameters = () => {
  // State untuk menyimpan nilai real-time dari server
  // Format: { "COS_voltage_ab": 380, "WaterFlow_ft_opening_total": 150.5 }
  const [liveData, setLiveData] = useState({});

  useEffect(() => {
    // 🔥 1. Tarik semua data statis terakhir saat halaman pertama kali dibuka
    const fetchInitialData = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:3001/api/opc/current`);
        if (res.ok) {
          const fullState = await res.json();
          const flattenedData = {};
          
          // Ubah format data dari backend agar cocok dengan state kotak parameter
          for (const panel in fullState) {
            for (const tag in fullState[panel]) {
              flattenedData[`${panel}_${tag}`] = fullState[panel][tag];
            }
          }
          // Isi semua kotak dengan nilai terakhir
          setLiveData(prev => ({ ...prev, ...flattenedData }));
        }
      } catch (err) {
        console.error("Gagal menarik data awal:", err);
      }
    };
    
    // Jalankan penarikan data statis
    fetchInitialData();

    // 🔥 2. Hubungkan ke WebSocket untuk mendengarkan perubahan selanjutnya (Real-time)
    const socket = io(`http://${window.location.hostname}:3001`);

    socket.on("connect", () => {
      console.log("Terhubung ke Server untuk Detailed Parameters");
    });

    socket.on("opc-data", (data) => {
      if (data && data.panel && data.tag !== undefined) {
        const key = `${data.panel}_${data.tag}`;
        setLiveData((prev) => ({
          ...prev,
          [key]: data.value,
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fungsi untuk memformat nilai agar rapi
  const formatValue = (val, type) => {
    if (val === undefined || val === null) return "--";
    if (type === "number") {
      const num = Number(val);
      return isNaN(num) ? val : num.toFixed(2); // Menampilkan 2 angka di belakang koma
    }
    return val;
  };

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
      {/* ============================================================ */}
      {/* BACKGROUND ORNAMEN KOSMIK (Sama seperti Admin.js & Dashboard) */}
      {/* ============================================================ */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-emerald-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ============================================================ */}
      {/* HEADER HALAMAN */}
      {/* ============================================================ */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Database size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-200 tracking-wide uppercase">
              Detailed Parameters
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
              Live Monitoring of All Factory Assets & Process Variables
            </p>
          </div>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-500/30 px-4 py-2 rounded-xl backdrop-blur-sm">
            <Activity size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase font-mono">
              Live Sync Active
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* KONTEN UTAMA - RENDER BERDASARKAN KONFIGURASI DI ATAS */}
      {/* ============================================================ */}
      <div className="relative z-10 space-y-8">
        {PARAMETER_CONFIG.map((areaObj, areaIdx) => (
          <div key={areaIdx} className="space-y-4">
            
            {/* Judul Area (Misal: UTILITY AREA) */}
            <h2 className="text-lg font-black text-emerald-300 tracking-widest uppercase border-b border-white/10 pb-2">
              {areaObj.area}
            </h2>

            {/* Grid Mesin di dalam Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {areaObj.machines.map((machine, machIdx) => (
                
                // Panel Card untuk Mesin (Glassmorphism)
                <div key={machIdx} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-lg hover:border-white/20 transition-all duration-300">
                  
                  {/* Header Panel Mesin */}
                  <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
                    <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                      {machine.icon}
                    </div>
                    <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
                      {machine.name}
                    </h3>
                  </div>

                  {/* Grid Parameter Kecil-Kecil di dalam Mesin */}
                  <div className="grid grid-cols-2 gap-3">
                    {machine.parameters.map((param, paramIdx) => {
                      const key = `${param.panel}_${param.tag}`;
                      const rawValue = liveData[key];
                      const displayValue = formatValue(rawValue, param.type);

                      return (
                        <div key={paramIdx} className="bg-black/30 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 line-clamp-1" title={param.label}>
                            {param.label}
                          </span>
                          <div className="flex items-end gap-1">
                            <span className={`text-lg font-black font-mono tracking-wide ${rawValue !== undefined ? 'text-white' : 'text-gray-600'}`}>
                              {displayValue}
                            </span>
                            <span className="text-[10px] text-emerald-500 font-bold mb-1">
                              {param.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default DetailedParameters;