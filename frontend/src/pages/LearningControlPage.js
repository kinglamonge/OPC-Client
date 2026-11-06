import React, { useState } from 'react';
import { 
  Power, 
  Sliders, 
  Send, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldAlert, 
  Activity,
  Cpu
} from 'lucide-react';
import axios from 'axios';

const LearningControlPage = ({ opcData }) => {
  // --- OTENTIKASI JWT & RBAC ROLE ---
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'viewer';

  // --- PEMBACAAN DATA AKTUAL REAL-TIME DARI PLC (DOJO PANEL) ---
  const dojoData = opcData?.DOJO || {};
  const liveBoolVal = dojoData.button1 !== undefined ? Number(dojoData.button1) === 1 : null;
  const liveAnalogVal = dojoData.analog1 !== undefined ? Number(dojoData.analog1).toFixed(2) : '--';

  // --- STATE UNTUK KENDALI BOOLEAN (DIGITAL OUTPUT) ---
  const [nodeIdBool, setNodeIdBool] = useState('ns=2;s=DOJO.S71217.Switch 1');
  const [valueBool, setValueBool] = useState(false);
  
  // --- STATE UNTUK KENDALI DATA BLOCK RANGE (ANALOG) ---
  const [nodeIdAnalog, setNodeIdAnalog] = useState('ns=2;s=DOJO.S71217.Analog 1');
  const [valueAnalog, setValueAnalog] = useState(50.0);

  // --- STATE NOTIFIKASI & LOADING ---
  const [loadingType, setLoadingType] = useState(null); // 'Boolean' | 'Float' | null
  const [status, setStatus] = useState({ success: null, message: '' });

  // Fungsi Universal Kirim Perintah ke Backend (Dengan Token JWT & Hostname Dinamis)
  const kirimInstruksiKontrol = async (nodeId, value, type) => {
    if (role !== 'admin') {
      setStatus({
        success: false,
        message: 'Akses Ditolak: Hanya role ADMIN yang diizinkan melakukan eksekusi write ke PLC.'
      });
      return;
    }

    setLoadingType(type);
    setStatus({ success: null, message: '' });
    
    try {
      const res = await axios.post(
        `http://${window.location.hostname}:3001/api/control/write`,
        {
          nodeId,
          value,
          type
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (res.data.success) {
        setStatus({ 
          success: true, 
          message: res.data.isSimulated 
            ? `[Simulasi] Berhasil mendaftarkan nilai (${value}) ke memori server.`
            : `Sukses! Nilai (${value}) telah di-write ke register PLC [${nodeId}].` 
        });
      }
    } catch (err) {
      console.error("Gagal mengirim instruksi OPC UA Write:", err);
      const errMsg = err.response?.data?.error || 'Gagal mengirim instruksi. Pastikan sesi login valid dan server Kepware OPC UA terhubung.';
      setStatus({ 
        success: false, 
        message: errMsg
      });
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
      
      {/* ========================================== */}
      {/* ORNAMEN KOSMIK LATAR BELAKANG (GLOW)       */}
      {/* ========================================== */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-emerald-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[45%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ========================================== */}
      {/* HEADER PAGE (GLASSMORPHISM 3D)             */}
      {/* ========================================== */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <GraduationCap size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-200 tracking-wide uppercase">
              SCADA Interlocking Laboratory
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
              DOJO S7-1217 • Bidirectional OPC UA Read & Write Testing
            </p>
          </div>
        </div>

        {/* Status Role & Koneksi Live PLC */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-md text-xs font-mono uppercase tracking-widest ${
            role === 'admin' 
              ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' 
              : 'bg-amber-900/20 border-amber-500/30 text-amber-400'
          }`}>
            <Cpu size={15} />
            <span className="font-bold">{role === 'admin' ? 'Write Access: Unlocked' : 'Mode: Read-Only'}</span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* BANNER NOTIFIKASI RESPONS API              */}
      {/* ========================================== */}
      {status.message && (
        <div className={`mb-8 p-4 rounded-2xl border backdrop-blur-xl flex items-center justify-between gap-3 text-sm relative z-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-all ${
          status.success 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${status.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {status.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            </div>
            <p className="font-mono text-xs md:text-sm">{status.message}</p>
          </div>
          <button 
            onClick={() => setStatus({ success: null, message: '' })}
            className="text-xs font-mono uppercase text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-white/5"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ========================================== */}
      {/* GRID DUA PANEL KONTROL UTAMA               */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        
        {/* PANEL 1: BOOLEAN CONTROL CORES */}
        <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-blue-500/40 transition-all duration-500 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 opacity-80"></div>
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl group-hover:from-blue-500/25 transition-all duration-500 pointer-events-none"></div>

          <div className="pl-2 relative z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] font-bold font-mono uppercase tracking-widest px-3 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-xl">
                BIT / BOOLEAN (0 atau 1)
              </span>
              <div className={`p-2.5 rounded-2xl bg-white/5 border border-white/10 ${valueBool ? "text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "text-gray-500"}`}>
                <Power size={20} className={valueBool ? "animate-pulse" : ""} />
              </div>
            </div>
            
            <h3 className="text-white text-base font-bold uppercase tracking-wider drop-shadow-md">
              Digital Interlocking Switch
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Simulasi kendali Relay, Push Button Start/Stop, Buzzer Reset, atau Valve Open/Close.
            </p>

            {/* Indikator Status Aktual PLC (Readback) */}
            <div className="mt-5 bg-black/30 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <Activity size={16} className="text-blue-400" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                  Actual PLC Status (Switch 1):
                </span>
              </div>
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                liveBoolVal === null 
                  ? 'bg-gray-800/50 border-gray-700 text-gray-400'
                  : liveBoolVal 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                  : 'bg-gray-800/60 border-white/10 text-gray-300'
              }`}>
                {liveBoolVal === null ? 'WAITING OPC...' : liveBoolVal ? 'ON (1 / HIGH)' : 'OFF (0 / LOW)'}
              </span>
            </div>

            {/* Input NodeID */}
            <div className="mt-5">
              <label className="text-[10px] text-gray-400 font-mono uppercase tracking-widest block mb-2">
                OPC UA Node Identifier
              </label>
              <input 
                type="text" 
                value={nodeIdBool}
                onChange={(e) => setNodeIdBool(e.target.value)}
                disabled={role !== 'admin'}
                className="w-full text-xs font-mono bg-black/30 border border-white/10 rounded-xl p-3 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
              />
            </div>

            {/* Toggle Switch Target */}
            <div className="mt-5 flex items-center justify-between bg-black/25 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Target Write Value</p>
                <p className="text-[11px] text-gray-400 font-mono mt-1">
                  Payload: <span className={valueBool ? "text-emerald-400 font-bold" : "text-gray-300 font-bold"}>
                    {valueBool ? "TRUE (1 / HIGH)" : "FALSE (0 / LOW)"}
                  </span>
                </p>
              </div>
              <button 
                type="button"
                disabled={role !== 'admin'}
                onClick={() => setValueBool(!valueBool)}
                className={`w-16 h-8 rounded-full transition-all duration-300 relative focus:outline-none border p-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                  valueBool 
                    ? "bg-emerald-600/80 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                    : "bg-black/50 border-white/15"
                }`}
              >
                <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                  valueBool ? "translate-x-8" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

          {/* PROTEKSI WAJIB RBAC: Tombol Eksekusi hanya dirender jika role === 'admin' */}
          <div className="pl-2 mt-6 relative z-10">
            {role === 'admin' ? (
              <button
                onClick={() => kirimInstruksiKontrol(nodeIdBool, valueBool, 'Boolean')}
                disabled={loadingType !== null}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] border border-blue-400/30 active:scale-[0.99] disabled:opacity-50"
              >
                {loadingType === 'Boolean' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Execute Binary Write</span>
              </button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-gray-400 font-mono text-[11px] uppercase tracking-widest py-3 rounded-2xl">
                <ShieldAlert size={15} className="text-amber-400" />
                <span>Eksekusi Terkunci (Khusus Admin)</span>
              </div>
            )}
          </div>
        </div>

        {/* PANEL 2: ANALOG DATA BLOCK SLIDER */}
        <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-orange-500/40 transition-all duration-500 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 opacity-80"></div>
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-2xl group-hover:from-orange-500/25 transition-all duration-500 pointer-events-none"></div>

          <div className="pl-2 relative z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] font-bold font-mono uppercase tracking-widest px-3 py-1 bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded-xl">
                DATA BLOCK RANGE (REAL / FLOAT)
              </span>
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-orange-400">
                <Sliders size={20} />
              </div>
            </div>

            <h3 className="text-white text-base font-bold uppercase tracking-wider drop-shadow-md">
              Analog Range Configurator
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Simulasi pengiriman nilai Setpoint Analog (Valve Opening %, VFD Frequency, atau Temperatur).
            </p>

            {/* Indikator Nilai Aktual PLC (Readback) */}
            <div className="mt-5 bg-black/30 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <Activity size={16} className="text-orange-400" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                  Actual PLC Value (Analog 1):
                </span>
              </div>
              <span className="text-sm font-mono font-black text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-lg">
                {liveAnalogVal} %
              </span>
            </div>

            {/* Input NodeID */}
            <div className="mt-5">
              <label className="text-[10px] text-gray-400 font-mono uppercase tracking-widest block mb-2">
                OPC UA Node Identifier
              </label>
              <input 
                type="text" 
                value={nodeIdAnalog}
                onChange={(e) => setNodeIdAnalog(e.target.value)}
                disabled={role !== 'admin'}
                className="w-full text-xs font-mono bg-black/30 border border-white/10 rounded-xl p-3 text-gray-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all disabled:opacity-50"
              />
            </div>

            {/* Input Numeric & Slider */}
            <div className="mt-5 bg-black/25 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Set Value Target</p>
                <div className="flex items-center gap-1.5 font-mono text-xs bg-black/50 border border-orange-500/30 px-3 py-1.5 rounded-xl">
                  <input 
                    type="number" 
                    value={valueAnalog} 
                    disabled={role !== 'admin'}
                    onChange={(e) => setValueAnalog(parseFloat(e.target.value) || 0)}
                    className="bg-transparent w-14 text-right font-bold text-orange-400 outline-none disabled:opacity-50"
                    step="0.1"
                  />
                  <span className="text-gray-400 text-[10px]">%</span>
                </div>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="0.5"
                disabled={role !== 'admin'}
                value={valueAnalog}
                onChange={(e) => setValueAnalog(parseFloat(e.target.value))}
                className="w-full accent-orange-500 bg-gray-800 rounded-lg h-2 cursor-pointer disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-2">
                <span>0.0 %</span>
                <span>50.0 %</span>
                <span>100.0 %</span>
              </div>
            </div>
          </div>

          {/* PROTEKSI WAJIB RBAC: Tombol Eksekusi hanya dirender jika role === 'admin' */}
          <div className="pl-2 mt-6 relative z-10">
            {role === 'admin' ? (
              <button
                onClick={() => kirimInstruksiKontrol(nodeIdAnalog, valueAnalog, 'Float')}
                disabled={loadingType !== null}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] border border-orange-400/30 active:scale-[0.99] disabled:opacity-50"
              >
                {loadingType === 'Float' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Execute Range Write</span>
              </button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-gray-400 font-mono text-[11px] uppercase tracking-widest py-3 rounded-2xl">
                <ShieldAlert size={15} className="text-amber-400" />
                <span>Eksekusi Terkunci (Khusus Admin)</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default React.memo(LearningControlPage);