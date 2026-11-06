import React, { useState } from 'react';
import { Lock, User, ShieldCheck, ArrowRight } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false); 
  
  // Efek Parallax Tilt Lembut
  const [tiltStyle, setTiltStyle] = useState({
    transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)'
  });

  const handleMouseMove = (e) => {
    if (isExiting) return;
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const centerX = box.width / 2;
    const centerY = box.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -4; 
    const rotateY = ((x - centerX) / centerX) * 4;

    setTiltStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`,
      transition: 'transform 0.1s ease-out'
    });
  };

  const handleMouseLeave = () => {
    if (isExiting) return;
    setTiltStyle({
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`http://${window.location.hostname}:3001/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        setIsExiting(true);
        setTimeout(() => {
          onLogin(data.token, data.role, data.username);
        }, 800);
      } else {
        setErrorMsg(data.error || 'Autentikasi gagal. Kredensial tidak valid.');
        setIsLoading(false);
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke Server SASA-CORE.');
      setIsLoading(false);
    }
  };

  return (
    <div 
      className={`fixed inset-0 h-[100dvh] w-screen flex items-center justify-center font-sans selection:bg-red-500/30 overflow-hidden transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isExiting ? 'opacity-0 scale-110 blur-2xl pointer-events-none' : 'opacity-100 scale-100 blur-0'
      }`}
      style={{
        backgroundImage: "url('/images/factory-drone-view.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* 
        Background Overlay: Mempertahankan background gambar agar terlihat natural dan tidak terlalu blur
      */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

      {/* AMBIENT GLOWS (Intensitas ditingkatkan untuk membiaskan warna pada kaca) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] bg-red-500/20 rounded-full blur-[100px] mix-blend-screen opacity-70 animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[35vw] h-[35vw] bg-blue-500/20 rounded-full blur-[90px] mix-blend-screen opacity-60"></div>
      </div>

      <div 
        className="w-full max-w-[420px] px-6 relative z-10 flex flex-col justify-center"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={tiltStyle}
      >
        {/* LIQUID GLASS CARD (Diperkuat efek depth dan refleksinya) */}
        <div className="bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-md border-t border-l border-white/40 border-b border-r border-white/5 p-8 md:p-10 rounded-[2.5rem] shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all hover:bg-gradient-to-br hover:from-white/[0.15] hover:to-white/[0.03]">
          
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/20 rounded-full blur-3xl pointer-events-none"></div>
          
          {/* LOGO & TYPOGRAPHY */}
          <div className="flex flex-col items-center mb-10 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-white/15 to-white/5 border-t border-l border-white/40 border-b border-r border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_8px_20px_rgba(227,30,36,0.2)] rounded-2xl flex items-center justify-center mb-5 backdrop-blur-md">
              <img 
                src="/image/sasa.ico" 
                onError={(e) => { e.target.onerror = null; e.target.src = "/sasa.png"; }} 
                alt="SASA Logo" 
                className="h-10 w-auto object-contain filter drop-shadow-[0_2px_8px_rgba(239,68,68,0.6)]"
              />
            </div>
            
            <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase flex items-center gap-2 drop-shadow-md">
              SASA <span className="text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]">MachEye</span>
            </h1>
            <p className="text-white/60 text-[9px] font-bold tracking-[0.3em] mt-2 uppercase drop-shadow-sm">
              Machine Insight Platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            
            {/* INPUT USERNAME */}
            <div className="space-y-1.5 group">
              <label className="text-[9px] font-bold text-white/60 uppercase tracking-[0.2em] ml-2 transition-colors group-focus-within:text-red-400">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={16} className="text-white/40 group-focus-within:text-red-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/30 border-t border-l border-black/40 border-b border-r border-white/10 text-white text-sm rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-red-500/50 focus:bg-white/10 focus:ring-1 focus:ring-red-500/50 transition-all placeholder-white/30 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s] [&:-webkit-autofill]:[-webkit-text-fill-color:#fff]"
                  placeholder="Enter your ID"
                  required
                />
              </div>
            </div>

            {/* INPUT PASSWORD */}
            <div className="space-y-1.5 group">
              <label className="text-[9px] font-bold text-white/60 uppercase tracking-[0.2em] ml-2 transition-colors group-focus-within:text-red-400">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={16} className="text-white/40 group-focus-within:text-red-400 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/30 border-t border-l border-black/40 border-b border-r border-white/10 text-white text-sm rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-red-500/50 focus:bg-white/10 focus:ring-1 focus:ring-red-500/50 transition-all placeholder-white/30 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s] [&:-webkit-autofill]:[-webkit-text-fill-color:#fff]"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* ERROR MESSAGE */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] font-medium p-3 rounded-2xl text-center flex items-center justify-center gap-2 backdrop-blur-md shadow-lg animate-in fade-in zoom-in duration-300">
                <ShieldCheck size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading || isExiting}
              className={`group w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 border-t border-l border-white/40 border-b border-r border-white/10 text-white font-bold tracking-[0.2em] uppercase text-xs py-4 rounded-2xl transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_20px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_10px_25px_rgba(239,68,68,0.4)] flex justify-center items-center gap-2 mt-4 backdrop-blur-md ${
                isLoading || isExiting ? 'opacity-70 cursor-wait' : 'hover:-translate-y-1'
              }`}
            >
              {isLoading || isExiting ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="text-red-400 group-hover:text-red-300 transition-colors drop-shadow-sm">Authenticate</span>
                  <ArrowRight size={14} className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* COPYRIGHT */}
        <div className="mt-8 text-center drop-shadow-md relative z-10 pointer-events-none">
          <p className="text-[9px] text-white/50 uppercase tracking-[0.25em] font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            &copy; 2025 PT Sasa Inti • I&C Division
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;