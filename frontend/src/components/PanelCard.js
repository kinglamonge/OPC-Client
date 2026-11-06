import React, { useState } from 'react';
import { Info, Activity } from 'lucide-react';
import PanelModal from './PanelModal';

const PanelCard = ({ title, data }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Kalkulasi sederhana untuk tampilan Overview (Mencegah NaN jika data kosong)
  const v_ab = parseFloat(data?.voltage_ab || 0);
  const v_bc = parseFloat(data?.voltage_bc || 0);
  const v_ca = parseFloat(data?.voltage_ca || 0);
  const avgVoltage = v_ab ? ((v_ab + v_bc + v_ca) / 3).toFixed(1) : '0.0';
  
  const i_a = parseFloat(data?.current_a || 0);
  const currentOverview = i_a ? i_a.toFixed(1) : '0.0';

  // Indikator status sederhana berdasarkan keberadaan tegangan
  const isRunning = v_ab > 100; 

  return (
    <>
      <div className="bg-gradient-to-b from-[#252525] to-[#1A1A1A] rounded-lg border border-gray-700 p-5 flex flex-col h-full shadow-lg relative group transition-transform hover:-translate-y-1">
        
        {/* Header Kartu */}
        <div className="bg-[#111] -mx-5 -mt-5 px-5 py-3 mb-5 border-b border-gray-800 flex justify-between items-center rounded-t-lg">
          <h3 className="font-bold text-white tracking-widest uppercase italic">{title}</h3>
          {/* Indikator Status */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-gray-500 uppercase">{isRunning ? 'Running' : 'Standby'}</span>
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-statusGreen shadow-[0_0_8px_#00E676]' : 'bg-gray-500'}`}></div>
          </div>
        </div>

        {/* Metrik Overview */}
        <div className="flex-1 space-y-4 mb-6">
          <div className="flex justify-between items-center bg-[#222] px-3 py-2 rounded border border-gray-800">
            <span className="text-xs text-gray-400 uppercase font-semibold">Avg Voltage</span>
            <span className="font-mono text-lg text-scadaAccent">{avgVoltage} V</span>
          </div>
          <div className="flex justify-between items-center bg-[#222] px-3 py-2 rounded border border-gray-800">
            <span className="text-xs text-gray-400 uppercase font-semibold">Current (L1)</span>
            <span className="font-mono text-lg text-yellow-500">{currentOverview} A</span>
          </div>
        </div>

        {/* Tombol Interaktif Detail */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute bottom-4 right-4 w-9 h-9 bg-gray-700 hover:bg-scadaAccent rounded-full flex items-center justify-center transition-colors shadow-lg group-hover:scale-110"
          title="Lihat Detail Parameter"
        >
          <Info size={18} className="text-white" />
        </button>
      </div>

      {/* Komponen Popup Detail */}
      <PanelModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={title} 
        data={data} 
      />
    </>
  );
};

export default PanelCard;