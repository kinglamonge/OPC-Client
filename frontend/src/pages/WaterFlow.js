import React, { useState, useEffect } from "react";
import { Droplets, RotateCcw, X, AlertTriangle, AlertOctagon, History } from "lucide-react";

// 🔬 Menambahkan Tag Baru untuk Hari Ini, Kemarin, dan Waktu Reset
const FLOWMETER_CHANNELS = [
  { id: "CH1", title: "Input Header Raw Water", flowTag: "ft_opening_flow", totalTag: "ft_opening_total", todayTag: "ft_opening_today", yesterdayTag: "ft_opening_yesterday", lastResetTag: "ft_opening_last_reset", resetTag: "ns=2;s=Water Totalizer.Reset Button.CH1" },
  { id: "CH2", title: "FT DC", flowTag: "ft_dc_flow", totalTag: "ft_dc_total", todayTag: "ft_dc_today", yesterdayTag: "ft_dc_yesterday", lastResetTag: "ft_dc_last_reset", resetTag: "ns=2;s=Water Totalizer.Reset Button.CH2" },
  { id: "CH3", title: "FT CWC", flowTag: "ft_cwc_flow", totalTag: "ft_cwc_total", todayTag: "ft_cwc_today", yesterdayTag: "ft_cwc_yesterday", lastResetTag: "ft_cwc_last_reset", resetTag: "ns=2;s=Water Totalizer.Reset Button.CH3" },
  { id: "CH4", title: "FT Aseptic", flowTag: "ft_aseptic_flow", totalTag: "ft_aseptic_total", todayTag: "ft_aseptic_today", yesterdayTag: "ft_aseptic_yesterday", lastResetTag: "ft_aseptic_last_reset", resetTag: "ns=2;s=Water Totalizer.Reset Button.CH4" },
  { id: "CH5", title: "FT AFM", flowTag: "ft_afm_flow", totalTag: "ft_afm_total", todayTag: "ft_afm_today", yesterdayTag: "ft_afm_yesterday", lastResetTag: "ft_afm_last_reset", resetTag: "ns=2;s=Water Totalizer.Reset Button.CH5" },
  { id: "CH6", title: "FT Biogas", flowTag: "ft_biogas_flow", totalTag: "ft_biogas_total", todayTag: "ft_biogas_today", yesterdayTag: "ft_biogas_yesterday", lastResetTag: "ft_biogas_last_reset", resetTag: "ns=2;s=Water Totalizer.Reset Button.CH6" },
  { id: "CH7", title: "FT Spare1", flowTag: "ft_spare1_flow", totalTag: "ft_spare1_total", todayTag: "ft_spare1_today", yesterdayTag: "ft_spare1_yesterday", lastResetTag: "ft_spare1_last_reset", resetTag: "ns=2;s=Water Totalizer.Reset Button.CH7" },
  { id: "CH8", title: "FT Spare2", flowTag: "ft_spare2_flow", totalTag: "ft_spare2_total", todayTag: "ft_spare2_today", yesterdayTag: "ft_spare2_yesterday", lastResetTag: "ft_spare2_last_reset", resetTag: "ns=2;s=Water Totalizer.Reset Button.CH8" },
];

const WaterFlow = ({ opcData }) => {
  const [currentTime, setCurrentTime] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'viewer';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-US", { hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const waterData = opcData?.WaterFlow || {};

  const getValue = (key, defaultVal = "0.00") =>
    waterData[key] !== undefined && waterData[key] !== null ? Number(waterData[key]).toFixed(2) : defaultVal;

  const getStringValue = (key, defaultVal = "--/--/---- --:--") => 
    waterData[key] ? waterData[key] : defaultVal;

  // ==========================================
  // RESET INDIVIDU
  // ==========================================
  const handleResetClick = async (channel) => {
    const confirmReset = window.confirm(
      `PERINGATAN: Apakah Anda yakin ingin mereset Totalizer ${channel.title} (${channel.id}) kembali ke 0?`
    );

    if (confirmReset) {
      setIsResetting(true);
      try {
        const response = await fetch(`http://${window.location.hostname}:3001/api/control/write`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            nodeId: channel.resetTag,
            value: true,
            type: "Boolean"
          })
        });

        if (response.ok) {
          setTimeout(async () => {
            await fetch(`http://${window.location.hostname}:3001/api/control/write`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({
                nodeId: channel.resetTag,
                value: false,
                type: "Boolean"
              })
            });
          }, 1000);

          alert(`Sukses! Instruksi reset untuk ${channel.title} berhasil dikirim.`);
        } else {
          throw new Error('Sesi otentikasi ditolak oleh server (Unauthorized)');
        }
      } catch (err) {
        console.error("Gagal mengirim perintah reset:", err);
        alert(`Gagal mereset ${channel.title}. Pastikan akun Anda memiliki akses admin.`);
      } finally {
        setIsResetting(false);
      }
    }
  };

  // ==========================================
  // RESET MASSAL
  // ==========================================
  const handleResetAllClick = async () => {
    const confirmResetAll = window.confirm(
      "PERINGATAN KRITIS: Apakah Anda yakin ingin mereset SEMUA Totalizer secara bersamaan kembali ke 0?"
    );

    if (confirmResetAll) {
      setIsResetting(true);
      try {
        await Promise.all(
          FLOWMETER_CHANNELS.map((ch) =>
            fetch(`http://${window.location.hostname}:3001/api/control/write`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({
                nodeId: ch.resetTag,
                value: true,
                type: "Boolean",
              })
            })
          )
        );

        setTimeout(async () => {
          await Promise.all(
            FLOWMETER_CHANNELS.map((ch) =>
              fetch(`http://${window.location.hostname}:3001/api/control/write`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                  nodeId: ch.resetTag,
                  value: false,
                  type: "Boolean",
                })
              })
            )
          );
        }, 1000);

        alert("Sukses! Instruksi RESET ALL berhasil dikirim ke seluruh flowmeter.");
      } catch (err) {
        console.error("Gagal mengirim perintah reset all:", err);
        alert("Terjadi kesalahan saat mereset totalizer. Cek akses otentikasi Anda.");
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
      
      {/* Ornamen Latar Belakang Kosmik Biru */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[50%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ========================================== */}
      {/* HEADER HALAMAN */}
      {/* ========================================== */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between relative z-10 mb-8">
        
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <Droplets size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 tracking-wide uppercase">
              Water Header
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 font-mono tracking-widest uppercase">Daily Log & Plant Flowmeter</p>
          </div>
        </div>
        
        <div className="mt-5 md:mt-0 flex flex-wrap items-center gap-3">
          {role === 'admin' && (
            <>
              <button 
                onClick={handleResetAllClick}
                disabled={isResetting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600/80 to-red-500/60 border border-red-500/50 hover:border-red-400 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50 backdrop-blur-md"
              >
                <AlertOctagon size={16} />
                Reset All
              </button>

              <button 
                onClick={() => setIsModalOpen(true)}
                disabled={isResetting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-900/40 border border-blue-500/40 hover:bg-blue-500/20 text-blue-300 hover:text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 backdrop-blur-md"
              >
                <RotateCcw size={16} />
                Single Reset
              </button>
            </>
          )}

          <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-500/30 px-3 py-2 rounded-xl backdrop-blur-sm ml-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
            <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">Online</span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* GRID KARTU FLOWMETER */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 relative z-10">
        {FLOWMETER_CHANNELS.map((ch, index) => (
          <div 
            key={ch.id} 
            className="group bg-white/5 backdrop-blur-xl border border-white/10 p-5 lg:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_0_rgba(59,130,246,0.15)] hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden flex flex-col justify-between"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl group-hover:from-blue-500/20 transition-all duration-500 pointer-events-none"></div>

            {/* Title & Status */}
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h3 className="text-sm lg:text-base font-bold text-white tracking-wide group-hover:text-blue-400 transition-colors drop-shadow-md">{ch.title}</h3>
                <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-0.5">{ch.id}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-1 shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
            </div>

            {/* Current Flowrate */}
            <div className="relative z-10 mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-black text-gray-100 group-hover:text-white transition-colors drop-shadow-md">
                  {getValue(ch.flowTag)}
                </span>
                <span className="text-xs text-gray-400 font-sans">m³/h</span>
              </div>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-1">Live Flowrate</p>
            </div>

            {/* Logsheet Harian (Today & Yesterday) */}
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 relative z-10">
              <div className="bg-black/20 p-2 rounded-xl border border-white/5 shadow-inner">
                <p className="text-[8px] lg:text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-1 line-clamp-1">Today (6 AM)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-mono font-bold text-emerald-400">{getValue(ch.todayTag)}</span>
                  <span className="text-[9px] text-gray-500 font-sans">m³</span>
                </div>
              </div>
              <div className="bg-blue-900/10 p-2 rounded-xl border border-blue-500/10 shadow-inner">
                <p className="text-[8px] lg:text-[9px] text-blue-300 uppercase tracking-widest font-bold mb-1 line-clamp-1">Yesterday Log</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-mono font-bold text-blue-400">{getValue(ch.yesterdayTag)}</span>
                  <span className="text-[9px] text-gray-500 font-sans">m³</span>
                </div>
              </div>
            </div>

            {/* Total Life-time Accumulation */}
            <div className="border-t border-white/10 pt-4 mt-4 relative z-10">
              <div className="flex justify-between items-end mb-1">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Life-Time Total</p>
                <div className="flex items-center gap-1 text-[8px] text-gray-500 font-mono tracking-wider bg-black/30 px-1.5 py-0.5 rounded">
                  <History size={10} />
                  <span>{getStringValue(ch.lastResetTag)}</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.3)]">
                  {getValue(ch.totalTag)}
                </span>
                <span className="text-xs text-gray-400 font-sans">m³</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-[9px] text-gray-600 font-mono uppercase tracking-widest relative z-10">
              <div className="w-1 h-1 rounded-full bg-emerald-500/40"></div>
              <span>Sync: {currentTime || "--:--:--"}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================== */}
      {/* MODAL RESET INDIVIDU */}
      {/* ========================================== */}
      {isModalOpen && role === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-[#0A0A0C]/90 backdrop-blur-2xl border border-white/10 w-full max-w-2xl rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="bg-white/5 px-6 py-5 border-b border-white/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wide">Reset Totalizer Panel</h2>
                  <p className="text-[10px] text-gray-400 font-mono tracking-widest mt-0.5 uppercase">Pilih channel individual</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-white bg-white/5 hover:bg-red-500/20 p-2 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar">
              {FLOWMETER_CHANNELS.map((ch) => (
                <div key={ch.id} className="group flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl hover:border-blue-500/40 hover:bg-blue-900/10 transition-all duration-300 gap-4">
                  
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-sm tracking-wide">{ch.title} <span className="text-gray-500 font-mono ml-1 text-xs">({ch.id})</span></span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-400 text-[10px] uppercase tracking-widest">Life-time Total:</span>
                      <span className="text-purple-400 font-mono font-bold text-sm">{getValue(ch.totalTag)} m³</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleResetClick(ch)}
                    disabled={isResetting}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-500 text-gray-300 hover:text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all disabled:opacity-50 shrink-0"
                  >
                    <RotateCcw size={14} />
                    RESET
                  </button>
                  
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default WaterFlow;