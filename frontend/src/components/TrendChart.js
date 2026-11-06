import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// FIX #1 — PALING KRITIS: CustomTooltip dipindah ke LUAR komponen TrendChart.
//
// MASALAH SEBELUMNYA:
//   CustomTooltip didefinisikan di dalam body TrendChart. Setiap kali
//   TrendChart re-render (setiap 2 detik karena setData), React membuat
//   FUNGSI BARU dengan referensi berbeda untuk CustomTooltip. Recharts
//   mendeteksi "tipe komponen berubah" → unmount tooltip lama → mount tooltip
//   baru. Komponen lama tidak di-GC karena Recharts masih memegang referensinya
//   secara internal. Dengan 2 chart × tiap 2 detik × berjam-jam = ratusan
//   tooltip zombie di memori → "Aw, Snap! Out of Memory".
//
// SOLUSI: Definisikan di luar → referensi stabil, tidak pernah unmount/remount.
// ─────────────────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, color }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1A1A] border border-gray-700 p-2 shadow-lg rounded">
        <p className="text-gray-300 text-xs mb-1">{label}</p>
        <p className="font-mono font-bold" style={{ color }}>
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

// FIX #4 — React.memo mencegah re-render tidak perlu dari parent component.
// TrendChart hanya re-render jika prop panel/tag/title/color benar-benar berubah.
const TrendChart = memo(({ panel, tag, title, color = "#00E676" }) => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  const isMounted  = useRef(true);

  // FIX #2 — Simpan timeoutId di useRef, bukan variabel let biasa.
  // MASALAH SEBELUMNYA: `let timeoutId` adalah variabel lokal di closure.
  // Jika cleanup() berjalan saat request masih in-flight, timeoutId belum
  // diset → clearTimeout(undefined) tidak melakukan apa-apa → setTimeout
  // yang dijadwalkan setelah async selesai tidak pernah di-clear → polling
  // terus berjalan meski komponen sudah unmount.
  // SOLUSI: useRef selalu menunjuk ke nilai terbaru, aman diakses dari mana saja.
  const timeoutRef = useRef(null);

  // Helper untuk membersihkan timer dengan aman
  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    const controller  = new AbortController();

    const fetchHistory = async () => {
      // FIX #3 — Page Visibility API: hentikan polling saat tab tidak aktif.
      // Browser tidak membuang data DOM saat tab hidden, tapi setiap setData()
      // tetap memicu React reconciliation + Recharts re-draw di background.
      // Dengan 2 chart → 60 render per menit → ~86.400 render per hari sia-sia.
      if (document.visibilityState === 'hidden') {
        timeoutRef.current = setTimeout(fetchHistory, 15_000); // cek lagi 15 detik
        return;
      }

      try {
        const res = await axios.get(
          `http://localhost:3001/api/history?panel=${panel}&tag=${tag}&limit=60`,
          { signal: controller.signal }
        );

        if (isMounted.current) {
          setData(res.data);
          setLoading(false);
          // Interval 5 detik (dari 2 detik) — data tren 1 menit tidak perlu
          // diperbarui lebih cepat dari ini. Mengurangi render 60%.
          timeoutRef.current = setTimeout(fetchHistory, 5_000);
        }
      } catch (err) {
        if (!axios.isCancel(err) && isMounted.current) {
          console.error(`[TrendChart] Gagal fetch ${panel}/${tag}:`, err);
          timeoutRef.current = setTimeout(fetchHistory, 10_000); // retry lebih lambat
        }
      }
    };

    // Resume polling segera saat tab kembali aktif (setelah sempat di-pause)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted.current) {
        clearTimer();
        fetchHistory();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    fetchHistory(); // fetch pertama

    return () => {
      isMounted.current = false;
      clearTimer();
      controller.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [panel, tag, clearTimer]);

  // FIX #1 (lanjutan) — useCallback memastikan referensi renderer stabil.
  // Hanya dibuat ulang jika `color` benar-benar berubah (jarang terjadi).
  const tooltipRenderer = useCallback(
    (props) => <CustomTooltip {...props} color={color} />,
    [color]
  );

  return (
    <div className="bg-scadaPanel border border-gray-800 rounded-lg p-4 h-64 flex flex-col">
      <h3 className="text-gray-400 text-sm font-semibold uppercase mb-2">{title}</h3>

      <div className="flex-1 w-full h-full">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm animate-pulse">
            Memuat Data Historis...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#666"
                tick={{ fill: '#888', fontSize: 10 }}
                tickMargin={10}
                minTickGap={20}
              />
              <YAxis
                stroke="#666"
                tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }}
                domain={['auto', 'auto']}
              />
              <Tooltip content={tooltipRenderer} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: color, stroke: '#252525', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';

export default TrendChart;