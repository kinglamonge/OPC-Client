import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Zap, Activity, AlertTriangle, Shuffle, 
  Factory, Droplets, GraduationCap, Users, LogOut, 
  Database, LayoutGrid,
  PieChart
} from 'lucide-react';

const Sidebar = ({ onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const role = localStorage.getItem('role') || 'viewer';

  const navItems = [
    { name: 'Plant Overview', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Summary', path: '/summary', icon: <PieChart size={20} /> },
    { name: 'LVMDP', path: '/lvmdp', icon: <Zap size={20} /> },
    { name: 'SDP', path: '/sdp', icon: <Zap size={20} /> },
    { name: 'COS Panel', path: '/cos', icon: <Shuffle size={20} /> },
    { name: 'Power Quality', path: '/power-quality', icon: <Activity size={20} /> },
    { name: 'Water Header', path: '/waterflow', icon: <Droplets size={20} /> },
    { name: 'Opening Station', path: '/opening', icon: <LayoutGrid size={20} /> },
    { name: 'Aseptic CWC', path: '/cwc', icon: <Factory size={20} /> },
    { name: 'Aseptic CCL', path: '/ccl', icon: <Factory size={20} /> },
    { name: 'WWTP Biogas', path: '/wwtp', icon: <Droplets size={20} /> },
    { name: 'Boiler', path: '/boiler', icon: <Factory size={20} /> },
    { name: 'CNO', path: '/cno', icon: <Factory size={20} /> },
    { name: 'Alarms', path: '/alarm', icon: <AlertTriangle size={20} /> },
    { name: 'DOJO', path: '/control-lab', icon: <GraduationCap size={20} /> },
  ];

  const hasExtendedAccess = ['admin', 'supervisor', 'engineer'].includes(role);
  const isAdmin = role === 'admin';
  
  const sidebarVariants = {
    expanded: { width: '18rem', transition: { type: 'spring', stiffness: 300, damping: 30 } },
    collapsed: { width: '5rem', transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  const textVariants = {
    hidden: { opacity: 0, width: 0, marginLeft: 0, display: 'none' },
    visible: { opacity: 1, width: 'auto', marginLeft: '12px', display: 'block', transition: { delay: 0.1, duration: 0.3 } },
    exit: { opacity: 0, width: 0, marginLeft: 0, transition: { duration: 0.1 } }
  };

  const logoVariants = { expanded: { scale: 1 }, collapsed: { scale: 1.15 } };

  return (
    <motion.aside 
      initial={false}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      className="relative z-20 flex flex-col h-screen shrink-0 bg-white/[0.02] backdrop-blur-[40px] border-r border-white/10 shadow-[8px_0_32px_rgba(0,0,0,0.3)] overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-[-50%] w-[200%] h-64 bg-gradient-to-b from-red-500/10 to-transparent mix-blend-screen"></div>
      </div>

      {/* HEADER: LOGO DIPERBAIKI */}
      <motion.div className={`relative z-10 flex items-center h-24 border-b border-white/5 transition-colors ${isCollapsed ? 'justify-center px-0' : 'justify-start px-5'}`}>
        <motion.button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          variants={logoVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`shrink-0 flex items-center justify-center transition-colors ${isCollapsed ? 'w-12 h-12 bg-white/5 border border-white/10 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'w-10 h-10 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] bg-transparent border-transparent'}`}
        >
          {/* Hapus sasa.ico, gunakan sasa.png secara langsung & tambahkan loading="eager" */}
          <img 
            src="/sasa.png" 
            alt="SASA Logo" 
            loading="eager"
            className="w-full h-full object-contain filter drop-shadow-md"
          />
        </motion.button>
        
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div variants={textVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col whitespace-nowrap overflow-hidden">
              <h1 className="text-[17px] font-black text-white tracking-widest leading-none drop-shadow-sm">SASA <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">MachEye</span></h1>
              <span className="text-[8.5px] text-gray-400 font-bold tracking-[0.2em] mt-1.5 uppercase">Machine Insight Platform</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* MENU NAVIGASI */}
      <nav className="relative z-10 flex-1 py-6 px-3 space-y-2 overflow-y-auto hide-scrollbar overflow-x-hidden">
        {navItems.map((item) => (
          <NavLink key={item.name} to={item.path} title={isCollapsed ? item.name : ""} className={({ isActive }) => `group relative flex items-center px-3.5 py-3 rounded-2xl transition-colors overflow-hidden ${isActive ? 'bg-white/10 border-t border-l border-white/30 border-b border-r border-white/5 shadow-[0_8px_20px_rgba(0,0,0,0.2)]' : 'hover:bg-white/[0.04] border border-transparent'}`}>
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50 pointer-events-none"></div>}
                <motion.div className={`shrink-0 transition-colors ${isActive ? 'text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 'text-gray-400 group-hover:text-white'}`} animate={isActive ? { scale: 1.1 } : { scale: 1 }}>{item.icon}</motion.div>
                <AnimatePresence>
                  {!isCollapsed && <motion.span variants={textVariants} initial="hidden" animate="visible" exit="exit" className={`font-medium tracking-wide whitespace-nowrap overflow-hidden transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{item.name}</motion.span>}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}

        {(hasExtendedAccess || isAdmin) && (
          <div className="mt-8 pt-6 relative space-y-2">
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.25em] px-4 whitespace-nowrap pb-2">System Utility</p>
                </motion.div>
              )}
            </AnimatePresence>

            {hasExtendedAccess && (
              <NavLink to="/detailed-parameters" title={isCollapsed ? "Detailed Parameters" : ""} className={({ isActive }) => `group relative flex items-center px-3.5 py-3 rounded-2xl transition-colors overflow-hidden ${isActive ? 'bg-white/10 border-t border-l border-white/30 border-b border-r border-white/5 shadow-lg' : 'hover:bg-white/[0.04] border border-transparent'}`}>
                {({ isActive }) => (
                  <>
                    <motion.div className={`shrink-0 transition-colors ${isActive ? 'text-sky-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]' : 'text-gray-400 group-hover:text-white'}`} animate={isActive ? { scale: 1.1 } : { scale: 1 }}><Database size={20} /></motion.div>
                    <AnimatePresence>{!isCollapsed && <motion.span variants={textVariants} initial="hidden" animate="visible" exit="exit" className={`font-medium tracking-wide whitespace-nowrap overflow-hidden transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>Detailed Parameters</motion.span>}</AnimatePresence>
                  </>
                )}
              </NavLink>
            )}

            {isAdmin && (
              <NavLink to="/admin" title={isCollapsed ? "User Monitoring" : ""} className={({ isActive }) => `group relative flex items-center px-3.5 py-3 rounded-2xl transition-colors overflow-hidden ${isActive ? 'bg-white/10 border-t border-l border-white/30 border-b border-r border-white/5 shadow-lg' : 'hover:bg-white/[0.04] border border-transparent'}`}>
                {({ isActive }) => (
                  <>
                    <motion.div className={`shrink-0 transition-colors ${isActive ? 'text-purple-300 drop-shadow-[0_0_12px_rgba(192,132,252,0.6)]' : 'text-gray-400 group-hover:text-white'}`} animate={isActive ? { scale: 1.1 } : { scale: 1 }}><Users size={20} /></motion.div>
                    <AnimatePresence>{!isCollapsed && <motion.span variants={textVariants} initial="hidden" animate="visible" exit="exit" className={`font-medium tracking-wide whitespace-nowrap overflow-hidden transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>User Monitoring</motion.span>}</AnimatePresence>
                  </>
                )}
              </NavLink>
            )}
          </div>
        )}
      </nav>

      {/* FOOTER */}
      <div className="relative z-10 p-5 border-t border-white/5 bg-white/[0.02] flex flex-col">
        <motion.button 
          onClick={onLogout}
          whileHover={{ scale: 1.02, borderColor: "rgba(239, 68, 68, 0.4)" }}
          whileTap={{ scale: 0.97 }}
          className="group flex items-center justify-center w-full bg-white/[0.05] hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white py-3.5 rounded-2xl shadow-sm transition-all"
        >
          <LogOut size={18} className="shrink-0 text-red-400/80 group-hover:text-red-400 group-hover:translate-x-1 transition-transform duration-300 drop-shadow-sm" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span variants={textVariants} initial="hidden" animate="visible" exit="exit" className="font-bold text-[11px] tracking-[0.2em] uppercase whitespace-nowrap overflow-hidden ml-2">
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;