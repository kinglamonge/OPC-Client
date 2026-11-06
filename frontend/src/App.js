import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import LVMDP from './pages/LVMDP';
import SDP from './pages/SDP';
import COS from './pages/COS';
import Boiler from './pages/Boiler';
import CWC from './pages/CWC';
import CCL from './pages/CCL';
import CNO from './pages/CNO';
import Alarm from './pages/Alarm'; 
import PowerQuality from './pages/PowerQuality';
import WWTP from './pages/WWTP';
import WaterFlow from './pages/WaterFlow';
import LearningControlPage from './pages/LearningControlPage';
import Login from './pages/Login'; 
import Admin from './pages/Admin'; 
import DetailedParameters from './pages/DetailedParameters';
import Opening from './pages/Opening';
import SummaryDashboard from './pages/SummaryDashboard';

const SOCKET_URL = `http://${window.location.hostname}:3001`;

// =======================================================
// KOMPONEN PEMBUNGKUS HALAMAN (UNTUK EFEK LIQUID FADE-IN)
// =======================================================
const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} // Liquid easing
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
};

// =======================================================
// KOMPONEN PEMBUNGKUS AUTENTIKASI (UNTUK TRANSISI VIEW LAYER)
// =======================================================
const AuthTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(5px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="w-full h-full flex"
    >
      {children}
    </motion.div>
  );
};

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  
  // STATE BARU: Menyimpan pesan salam saat transisi
  const [authMessage, setAuthMessage] = useState(null);
  
  const role = localStorage.getItem('role') || 'viewer';
  const [isConnected, setIsConnected] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  
  const [opcData, setOpcData] = useState({
    LVMDP1: {}, LVMDP2: {}, SDP5: {}, SDPCompressor: {},
    COS: {}, CWC: {}, CCL: {}, WaterFlow: {}, CNO: {}, DOJO: {} 
  });

  // LOGIKA LOGIN DIPERBAIKI DENGAN JEDA ANIMASI
  const handleLogin = (newToken, newRole, newUsername) => {
    // 1. Munculkan salam
    setAuthMessage(`Selamat datang, ${newUsername}`);
    
    // 2. Simpan kredensial sementara ke storage (State token tetap dijeda)
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', newRole);
    localStorage.setItem('username', newUsername);
    
    // 3. Eksekusi perpindahan rute setelah 1.8 detik
    setTimeout(() => {
      setToken(newToken);
      navigate('/', { replace: true }); 
      setAuthMessage(null);
    }, 1800); 
  };

  // LOGIKA LOGOUT DIPERBAIKI DENGAN JEDA ANIMASI
  const handleLogout = () => {
    const currentUsername = localStorage.getItem('username') || '';
    
    // 1. Munculkan salam perpisahan
    setAuthMessage(`Sampai jumpa${currentUsername ? `, ${currentUsername}` : ''}`);
    
    // 2. Eksekusi pembersihan dan perpindahan rute setelah 1.8 detik
    setTimeout(() => {
      localStorage.clear();
      setToken(null);
      navigate('/login', { replace: true });
      setAuthMessage(null);
    }, 1800);
  };

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL);
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('opc-init', (cachedState) => setOpcData((prev) => ({ ...prev, ...cachedState })));
    socket.on('opc-data', (data) => {
      setOpcData((prev) => ({
        ...prev, [data.panel]: { ...prev[data.panel], [data.tag]: data.value }
      }));
    });

    socket.on('force-logout', (data) => {
      if (localStorage.getItem('username') === data.username) {
        alert('Sesi Anda telah dihentikan secara paksa oleh Administrator.');
        handleLogout();
      }
    });

    return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <>
      {/* ======================================================= */}
      {/* OVERLAY PESAN SALAM (MUNCUL SAAT LOGIN/LOGOUT)            */}
      {/* ======================================================= */}
      <AnimatePresence>
        {authMessage && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(15px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#07090e]/80"
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <h2 className="text-2xl md:text-3xl font-light text-white tracking-widest mb-3 text-center">
                {authMessage}
              </h2>
              <div className="w-16 h-[2px] bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================= */}
      {/* STRUKTUR UTAMA APLIKASI                                 */}
      {/* ======================================================= */}
      <AnimatePresence mode="wait">
        {!token ? (
          <AuthTransition key="login-view">
            <Routes location={location}>
              <Route path="*" element={<Login onLogin={handleLogin} />} />
            </Routes>
          </AuthTransition>
        ) : (
          <AuthTransition key="dashboard-view">
            <div className={`flex w-full h-screen bg-[#07090e] text-gray-200 font-sans overflow-hidden transition-colors duration-700 ${isLightMode ? 'projector-mode' : ''}`}>
              
              <Sidebar onLogout={handleLogout} />
              
              <div className="flex-1 flex flex-col h-screen overflow-y-auto hide-scrollbar relative">
                <Header isConnected={isConnected} isLightMode={isLightMode} setIsLightMode={setIsLightMode} />
                
                <main className="flex-1 p-2 relative z-0">
                  <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                      <Route path="/" element={<PageTransition><Overview opcData={opcData} /></PageTransition>} />
                      <Route path="/opening" element={<PageTransition><Opening opcData={opcData} /></PageTransition>} />
                      <Route path="/lvmdp" element={<PageTransition><LVMDP opcData={opcData} /></PageTransition>} />
                      <Route path="/waterflow" element={<PageTransition><WaterFlow opcData={opcData} /></PageTransition>} />
                      <Route path="/summary" element={<PageTransition><SummaryDashboard opcData={opcData} /></PageTransition>} />
                      <Route path="/sdp" element={<PageTransition><SDP opcData={opcData} /></PageTransition>} />
                      <Route path="/cos" element={<PageTransition><COS opcData={opcData} /></PageTransition>} />
                      <Route path="/power-quality" element={<PageTransition><PowerQuality opcData={opcData} /></PageTransition>} />
                      <Route path="/cwc" element={<PageTransition><CWC opcData={opcData} /></PageTransition>} />
                      <Route path="/ccl" element={<PageTransition><CCL opcData={opcData} /></PageTransition>} />
                      <Route path="/cno" element={<PageTransition><CNO opcData={opcData} /></PageTransition>} />
                      <Route path="/wwtp" element={<PageTransition><WWTP opcData={opcData} /></PageTransition>} />
                      <Route path="/boiler" element={<PageTransition><Boiler opcData={opcData} /></PageTransition>} />
                      <Route path="/alarm" element={<PageTransition><Alarm opcData={opcData} /></PageTransition>} />
                      <Route path="/control-lab" element={<PageTransition><LearningControlPage opcData={opcData} /></PageTransition>} />
                      <Route path="/detailed-parameters" element={<PageTransition><DetailedParameters /></PageTransition>} />
                      
                      <Route path="/admin" element={role === 'admin' ? <PageTransition><Admin /></PageTransition> : <Navigate to="/" replace />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </AnimatePresence>
                </main>
              </div>
            </div>
          </AuthTransition>
        )}
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;