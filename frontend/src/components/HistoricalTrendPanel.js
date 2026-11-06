import React, { useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Search, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

// 🔥 ELEMEN LUAR: Didefinisikan di luar komponen utama agar bebas Memory Leak
const DetilTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#161616] border border-gray-800 p-3 shadow-2xl rounded text-xs font-mono">
        <p className="text-gray-400 mb-1">Waktu: <span className="text-white font-bold">{label}</span></p>
        <p className="text-emerald-400">
          Nilai: <span className="text-xl font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

// ==========================================================

const HistoricalTrendPanel = ({ panel = "CWC", tag = "evap_brix", title = "Tracing Historis Evaporator BRIX" }) => {
  // Mengatur default waktu: Mulai dari 24 jam lalu sampai Sekarang
  const dapatkanWaktuDefault = (selisihJam) => {
    const d = new Date();
    d.setHours(d.getHours() - selisihJam);
    return d.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:mm
  };

  const [waktuMulai, setWaktuMulai] = useState(dapatkanWaktuDefault(24));
  const [waktuSelesai, setWaktuSelesai] = useState(dapatkanWaktuDefault(0));
  const [dataGrafik, setDataGrafik] = useState([]);
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const [pesanError, setPesanError] = useState('');
  
  const isMounted = useRef(true);

  const eksekusiPencarianData = async (e) => {
    if (e) e.preventDefault();
    
    setSedangMemuat(true);
    setPesanError('');
    
    try {
      // 🔬 PERBAIKAN 1: Menggunakan window.location.hostname agar adaptif (bukan localhost)
      // Ini memastikan request tidak gagal jika aplikasi diakses dari komputer/tablet lain dalam jaringan
      const res = await axios.get(`http://${window.location.hostname}:3001/api/history/range`, {
        params: {
          panel: panel,
          tag: tag,
          start: new Date(waktuMulai).toISOString(),
          end: new Date(waktuSelesai).toISOString()
        }
      });

      if (isMounted.current) {
        if (res.data.length === 0) {
          setPesanError('Tidak ada data proses yang terekam pada rentang waktu ini.');
        } else {
          // 🔬 PERBAIKAN 2: Re-format data agar sesuai dengan Axis X di Recharts
          // Data dari API /history/range aslinya berupa objek { timestamp: '...', value: '...' }
          // Recharts butuh properti bernama "time" agar sumbu X tidak kosong!
          const formattedData = res.data.map(item => ({
            time: new Date(item.timestamp).toLocaleString("id-ID"), // Format cantik DD/MM/YYYY HH:MM
            value: Number(item.value) // Pastikan nilainya dibaca sebagai angka
          }));
          setDataGrafik(formattedData);
        }
      }
    } catch (err) {
      console.error("Gagal memuat arsip data:", err);
      if (isMounted.current) {
        setPesanError('Koneksi database terputus atau server gagal memproses query.');
      }
    } finally {
      if (isMounted.current) setSedangMemuat(false);
    }
  };

  return (
    <div className="bg-scadaPanel border border-gray-800 rounded-xl p-5 shadow-xl flex flex-col w-full min-h-[450px]">
      {/* HEADER PANEL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-4 mb-4 gap-4">
        <div>
          <h2 className="text-white text-base font-bold uppercase tracking-wider">{title}</h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5">Tag Reference: {panel}_{tag}</p>
        </div>

        {/* CONTROLLER FORM RENTANG WAKTU */}
        <form onSubmit={eksekusiPencarianData} className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center bg-[#141414] border border-gray-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition-colors">
            <span className="text-gray-500 mr-2"><Calendar size={14} /></span>
            <input 
              type="datetime-local" 
              value={waktuMulai}
              onChange={(e) => setWaktuMulai(e.target.value)}
              className="bg-transparent text-gray-300 outline-none font-mono cursor-pointer"
            />
          </div>
          
          <span className="text-gray-600 font-bold">s/d</span>

          <div className="flex items-center bg-[#141414] border border-gray-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition-colors">
            <span className="text-gray-500 mr-2"><Calendar size={14} /></span>
            <input 
              type="datetime-local" 
              value={waktuSelesai}
              onChange={(e) => setWaktuSelesai(e.target.value)}
              className="bg-transparent text-gray-300 outline-none font-mono cursor-pointer"
            />
          </div>

          <button 
            type="submit" 
            disabled={sedangMemuat}
            className="flex items-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {sedangMemuat ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Search size={14} className="mr-1.5" />}
            Cari Data
          </button>
        </form>
      </div>

      {/* AREA GRAFIK TREN */}
      <div className="flex-1 w-full flex items-center justify-center relative min-h-[280px]">
        {sedangMemuat && (
          <div className="absolute inset-0 bg-[#161616]/70 z-10 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
            <p className="font-mono animate-pulse">Menghimpun Arsip Data PostgreSQL...</p>
          </div>
        )}

        {pesanError ? (
          <div className="flex flex-col items-center justify-center text-gray-500 text-center p-4 max-w-sm">
            <AlertCircle size={36} className="text-orange-500/70 mb-2" />
            <p className="text-sm">{pesanError}</p>
          </div>
        ) : dataGrafik.length === 0 && !sedangMemuat ? (
          <div className="text-gray-600 text-sm font-medium flex flex-col items-center gap-1">
            <Calendar size={28} className="text-gray-700" />
            Tentukan rentang penanggalan di atas lalu klik tombol "Cari Data"
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataGrafik} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#444" 
                tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }}
                tickMargin={8}
                minTickGap={40}
              />
              <YAxis 
                stroke="#444" 
                tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} 
                domain={['auto', 'auto']}
              />
              <Tooltip content={<DetilTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#00E676" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 5, fill: '#00E676', stroke: '#161616', strokeWidth: 2 }}
                isAnimationActive={false} // ✅ AMAN: Animasi dimatikan total agar browser tidak crash jika data ribuan
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default React.memo(HistoricalTrendPanel);