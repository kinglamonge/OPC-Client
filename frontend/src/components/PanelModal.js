import React from 'react';
import { X, Zap, Activity } from 'lucide-react';

const PanelModal = ({ isOpen, onClose, title, data }) => {
  if (!isOpen) return null;

  // Helper untuk merender nilai atau 0.00 jika data belum tersedia
  const getValue = (key) => (data && data[key] !== undefined ? data[key] : '0.00');

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex justify-center items-center backdrop-blur-sm p-4">
      {/* Modal Container */}
      <div className="bg-[#1E1E1E] border border-gray-700 w-full max-w-5xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Modal Header */}
        <div className="bg-[#111111] px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-500 text-black p-1 rounded">
              <Zap size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-widest uppercase italic">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-red-600 p-1 rounded transition-colors"
          >
            <X size={28} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto hide-scrollbar grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Column 1: THD & Power Factor */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#252525] p-4 rounded border border-gray-700 shadow-inner">
              <h4 className="text-center font-bold text-gray-300 mb-3 border-b border-gray-600 pb-2 text-sm uppercase">THD Current</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-400">THD A</span><span className="font-mono text-white bg-gray-800 px-2 rounded">{getValue('thd_i_a')} %</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">THD B</span><span className="font-mono text-white bg-gray-800 px-2 rounded">{getValue('thd_i_b')} %</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">THD C</span><span className="font-mono text-white bg-gray-800 px-2 rounded">{getValue('thd_i_c')} %</span></div>
              </div>
            </div>

            <div className="bg-[#252525] p-4 rounded border border-gray-700 shadow-inner">
              <h4 className="text-center font-bold text-gray-300 mb-3 border-b border-gray-600 pb-2 text-sm uppercase">Power Factor</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-400">PF A</span><span className="font-mono text-statusGreen bg-gray-800 px-2 rounded">{getValue('pf_a')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">PF B</span><span className="font-mono text-statusGreen bg-gray-800 px-2 rounded">{getValue('pf_b')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">PF C</span><span className="font-mono text-statusGreen bg-gray-800 px-2 rounded">{getValue('pf_c')}</span></div>
              </div>
            </div>
          </div>

          {/* Column 2 & 3: Voltage & Current Grid */}
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 3 Phase Voltage */}
            <div className="bg-[#252525] p-5 rounded border border-gray-700 shadow-inner flex flex-col">
              <h4 className="text-center font-bold text-gray-300 mb-4 border-b border-gray-600 pb-2 uppercase tracking-wider">Three Phase Voltage</h4>
              <div className="flex-1 flex flex-col justify-center space-y-4">
                <div className="flex items-center justify-between bg-[#1A1A1A] p-3 rounded border border-gray-800">
                  <span className="text-gray-400 font-bold text-lg">V A-B</span>
                  <div className="font-mono text-2xl text-white">{getValue('voltage_ab')} <span className="text-gray-500 text-sm">V</span></div>
                </div>
                <div className="flex items-center justify-between bg-[#1A1A1A] p-3 rounded border border-gray-800">
                  <span className="text-gray-400 font-bold text-lg">V B-C</span>
                  <div className="font-mono text-2xl text-white">{getValue('voltage_bc')} <span className="text-gray-500 text-sm">V</span></div>
                </div>
                <div className="flex items-center justify-between bg-[#1A1A1A] p-3 rounded border border-gray-800">
                  <span className="text-gray-400 font-bold text-lg">V C-A</span>
                  <div className="font-mono text-2xl text-white">{getValue('voltage_ca')} <span className="text-gray-500 text-sm">V</span></div>
                </div>
              </div>
            </div>

            {/* Current */}
            <div className="bg-[#252525] p-5 rounded border border-gray-700 shadow-inner flex flex-col">
              <h4 className="text-center font-bold text-gray-300 mb-4 border-b border-gray-600 pb-2 uppercase tracking-wider">Phase Current</h4>
              <div className="flex-1 flex flex-col justify-center space-y-4">
                <div className="flex items-center justify-between bg-[#1A1A1A] p-3 rounded border border-gray-800">
                  <span className="text-gray-400 font-bold text-lg">Current A</span>
                  <div className="font-mono text-2xl text-yellow-500">{getValue('current_a')} <span className="text-gray-500 text-sm">A</span></div>
                </div>
                <div className="flex items-center justify-between bg-[#1A1A1A] p-3 rounded border border-gray-800">
                  <span className="text-gray-400 font-bold text-lg">Current B</span>
                  <div className="font-mono text-2xl text-yellow-500">{getValue('current_b')} <span className="text-gray-500 text-sm">A</span></div>
                </div>
                <div className="flex items-center justify-between bg-[#1A1A1A] p-3 rounded border border-gray-800">
                  <span className="text-gray-400 font-bold text-lg">Current C</span>
                  <div className="font-mono text-2xl text-yellow-500">{getValue('current_c')} <span className="text-gray-500 text-sm">A</span></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PanelModal;