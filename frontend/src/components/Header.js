import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Server, ShieldCheck, Clock, Sun, Moon, User, Shield } from 'lucide-react';

const Header = ({ isConnected, isLightMode, setIsLightMode }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const username = localStorage.getItem('username') || 'Unknown';
  const role = localStorage.getItem('role') || 'viewer';

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentDateTime.toLocaleTimeString('id-ID', { hour12: false });
  const dateString = currentDateTime.toLocaleDateString('id-ID', { 
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' 
  });

  return (
    <header className="h-[76px] flex items-center justify-between px-4 md:px-8 bg-white/[0.02] backdrop-blur-[40px] border-b border-white/10 relative overflow-hidden shrink-0 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      
      {/* ========================================== */}
      {/* 1. AMBIENT BACKGROUND GLOW (LIQUID EFFECT) */}
      {/* ========================================== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-50%] right-[15%] w-[40%] h-[200%] bg-blue-500/10 blur-[80px] mix-blend-screen opacity-60"></div>
        <div className="absolute top-[-50%] left-[10%] w-[30%] h-[200%] bg-teal-500/10 blur-[80px] mix-blend-screen opacity-50"></div>
      </div>

      {/* ========================================== */}
      {/* BAGIAN KIRI: Status Koneksi                */}
      {/* ========================================== */}
      <div className="flex items-center shrink-0 z-10">
        <div className={`group flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-500 backdrop-blur-md shadow-inner ${
          isConnected 
            ? 'bg-white/5 border-white/10 hover:bg-white/10 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          {isConnected ? (
            <Wifi size={16} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <WifiOff size={16} className="text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          )}
          
          <div className="flex items-center gap-2.5 hidden sm:flex">
            <span className="relative flex h-2 w-2">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
            </span>
            <span className={`font-mono text-[10.5px] font-bold tracking-[0.2em] uppercase transition-colors duration-500 ${
              isConnected ? 'text-emerald-100/90 group-hover:text-white' : 'text-red-300'
            }`}>
              {isConnected ? 'Node Active' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* BAGIAN TENGAH: System Diagnostics          */}
      {/* Hanya muncul di layar sangat lebar (xl)    */}
      {/* ========================================== */}
      <div className="hidden xl:flex items-center gap-6 text-gray-400 bg-white/[0.03] px-6 py-2.5 rounded-2xl border border-white/10 shrink-0 z-10 backdrop-blur-md shadow-inner hover:bg-white/[0.05] transition-colors duration-500">
        <div className="flex items-center gap-2.5">
          <Server size={14} className="text-blue-400/80 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]" />
          <span className="text-[10.5px] font-bold text-gray-300 uppercase tracking-[0.2em]">SASA-SRV-CORE</span>
        </div>
        <div className="h-3 w-px bg-white/10"></div>
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={14} className="text-emerald-400/80 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
          <span className="text-[10.5px] font-bold text-gray-300 uppercase tracking-[0.2em]">Secured</span>
        </div>
      </div>

      {/* ========================================== */}
      {/* BAGIAN KANAN: Profil, Toggle, & Waktu      */}
      {/* ========================================== */}
      <div className="flex items-center gap-3 md:gap-5 shrink-0 z-10">
        
        {/* Tombol Projector Mode (Sleek Glass Button) */}
        <button 
          onClick={() => setIsLightMode(!isLightMode)}
          className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all duration-300 shadow-sm active:scale-95"
          title="Toggle Projector Mode"
        >
          {isLightMode ? (
            <Sun size={18} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          ) : (
            <Moon size={18} />
          )}
        </button>

        {/* Separator Tipis */}
        <div className="hidden sm:block h-6 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent mx-1"></div>

        {/* Kotak Profil User (Glass Pill) */}
        <div className="group flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-sm cursor-default">
          <div className="flex flex-col items-end justify-center hidden sm:flex">
            <span className="text-[11.5px] font-bold text-gray-200 uppercase tracking-widest leading-none mb-1 group-hover:text-white transition-colors">{username}</span>
            <span className="text-[8.5px] text-teal-300/90 font-bold tracking-[0.25em] uppercase flex items-center gap-1.5 leading-none">
              <Shield size={9} className="text-teal-400" />
              {role}
            </span>
          </div>
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
            <User size={15} className="text-gray-300 group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* Separator Tipis */}
        <div className="hidden md:block h-6 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent mx-1"></div>

        {/* Waktu Digital (Premium Typography) */}
        <div className="hidden md:flex items-center gap-3 pl-1">
          <div className="flex flex-col items-end justify-center">
            <span className="text-[9px] text-gray-400/80 font-bold tracking-[0.25em] uppercase mb-1">
              {dateString}
            </span>
            {/* Efek teks gradient transparan seperti di Opening.js */}
            <span className="text-sm font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-[0.15em] leading-none drop-shadow-sm">
              {timeString}
            </span>
          </div>
        </div>
        
      </div>
    </header>
  );
};

export default Header;