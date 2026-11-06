import React from 'react';
import { useParams } from 'react-router-dom';
import LVMDP from './LVMDP';
import SDP from './SDP';

const PanelDetail = ({ opcData }) => {
  const { building, type, id } = useParams();

  // Konstruksi ID unik sesuai backend (Contoh: LVMDP-gedung-a-1)
  const panelKey = `${type.toUpperCase()}-${building}-${id}`;

  // Logika Pemilihan Komponen
  const renderPanel = () => {
    switch (type.toLowerCase()) {
      case 'lvmdp':
        return <LVMDP opcData={opcData} defaultKey={panelKey} />;
      case 'sdp':
        return <SDP opcData={opcData} defaultKey={panelKey} />;
      default:
        return <div className="text-white p-10">Panel type '{type}' tidak dikenal.</div>;
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {renderPanel()}
    </div>
  );
};

export default PanelDetail;