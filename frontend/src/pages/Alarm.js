import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Calendar,
  Activity,
  History,
  BellRing,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  RotateCcw,
  Database,
} from "lucide-react";

// =======================================================
// 1. KONFIGURASI ANALOG ALARM
// =======================================================
const ANALOG_ALARM_CONFIG = [
  {
    panel: "COS",
    tags: ["thd_i_a", "thd_i_b", "thd_i_c"],
    labels: ["A", "B", "C"],
    rules: [
      {
        type: "HIGH",
        limit: 5.0,
        severity: "warning",
        ignoreZero: false,
        msg: (label, val) => `Harmonik THD Phase ${label} Tinggi (${val}%)`,
      },
    ],
  },
  {
    panel: "SDPFilling",
    tags: ["thd_i_a", "thd_i_b", "thd_i_c"],
    labels: ["A", "B", "C"],
    rules: [
      {
        type: "HIGH",
        limit: 5.0,
        severity: "warning",
        ignoreZero: false,
        msg: (label, val) => `Harmonik THD Phase ${label} Tinggi (${val}%)`,
      },
    ],
  },
  {
    panel: "LVMDP1",
    tags: ["thd_i_a", "thd_i_b", "thd_i_c"],
    labels: ["A", "B", "C"],
    rules: [
      {
        type: "HIGH",
        limit: 5.0,
        severity: "warning",
        ignoreZero: false,
        msg: (label, val) => `Harmonik THD Phase ${label} Tinggi (${val}%)`,
      },
    ],
  },
  {
    panel: "COS",
    tags: ["voltage_ab", "voltage_bc", "voltage_ca"],
    labels: ["AB", "BC", "CA"],
    rules: [
      {
        type: "LOW",
        limit: 375.0,
        severity: "critical",
        ignoreZero: true,
        msg: (label, val) => `Under-Voltage Line ${label} (${val}V)`,
      },
      {
        type: "HIGH",
        limit: 410.0,
        severity: "critical",
        ignoreZero: false,
        msg: (label, val) => `Over-Voltage Line ${label} (${val}V)`,
      },
    ],
  },
  {
    panel: "SDPFilling",
    tags: ["voltage_ab", "voltage_bc", "voltage_ca"],
    labels: ["AB", "BC", "CA"],
    rules: [
      {
        type: "LOW",
        limit: 375.0,
        severity: "critical",
        ignoreZero: true,
        msg: (label, val) => `Under-Voltage Line ${label} (${val}V)`,
      },
      {
        type: "HIGH",
        limit: 410.0,
        severity: "critical",
        ignoreZero: false,
        msg: (label, val) => `Over-Voltage Line ${label} (${val}V)`,
      },
    ],
  },
  {
    panel: "LVMDP1",
    tags: ["voltage_ab", "voltage_bc", "voltage_ca"],
    labels: ["AB", "BC", "CA"],
    rules: [
      {
        type: "LOW",
        limit: 375.0,
        severity: "critical",
        ignoreZero: true,
        msg: (label, val) => `Under-Voltage Line ${label} (${val}V)`,
      },
      {
        type: "HIGH",
        limit: 410.0,
        severity: "critical",
        ignoreZero: false,
        msg: (label, val) => `Over-Voltage Line ${label} (${val}V)`,
      },
    ],
  },

  // =======================================================
  // KUALITAS PROSES — CWC EVAPORATOR
  // Alarm BRIX hanya aktif saat Evaporator mode Produksi
  // berjalan (evap_prod_step = 140). Rentang normal: 60–64%
  // =======================================================
  {
    panel: "CWC",
    tags: ["evap_brix"],
    labels: [""],
    rules: [
      {
        type: "LOW",
        limit: 60,
        severity: "warning",
        ignoreZero: true,
        condition: (panelData) => Number(panelData["evap_prod_step"] ?? 1) === 140,
        msg: (_label, val) =>
          `BRIX Evaporator Rendah saat Produksi (${val}%) — Batas Min 60%`,
      },
      {
        type: "HIGH",
        limit: 64,
        severity: "warning",
        ignoreZero: true,
        condition: (panelData) => Number(panelData["evap_prod_step"] ?? 1) === 140,
        msg: (_label, val) =>
          `BRIX Evaporator Tinggi saat Produksi (${val}%) — Batas Max 64%`,
      },
    ],
  },
];

// Helper format waktu YYYY-MM-DD HH:mm:ss
const formatTimestamp = (dateObj = new Date()) => {
  return (
    dateObj.getFullYear() +
    "-" +
    String(dateObj.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(dateObj.getDate()).padStart(2, "0") +
    " " +
    String(dateObj.getHours()).padStart(2, "0") +
    ":" +
    String(dateObj.getMinutes()).padStart(2, "0") +
    ":" +
    String(dateObj.getSeconds()).padStart(2, "0")
  );
};

// Helper parser tanggal lokal yang aman dari bug UTC
const parseSafeDate = (dateStr) => {
  if (!dateStr || dateStr === "-") return null;
  const cleanStr = String(dateStr).trim().replace(" ", "T");
  const parsed = new Date(cleanStr);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(dateStr);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

// Helper hitung durasi antara waktu aktif dan waktu clear
const calculateDuration = (startStr, endStr) => {
  const start = parseSafeDate(startStr);
  const end = parseSafeDate(endStr);
  if (!start || !end) return "-";

  const diffSec = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;

  if (hrs > 0) return `${hrs}j ${mins}m ${secs}d`;
  if (mins > 0) return `${mins}m ${secs}d`;
  return `${secs} detik`;
};

const PAGE_SIZE = 50;

const Alarm = ({ opcData }) => {
  // State Tabel 1: Alarm yang sedang aktif saat ini
  const [activeAlarms, setActiveAlarms] = useState({});
  // State Tabel 2: Riwayat Cleared Alarms (Paginated 50 baris per halaman)
  const [clearedLogs, setClearedLogs] = useState([]);

  // State Statistik Real Database (Tanpa Limit 1000)
  const [dbStats, setDbStats] = useState({
    total_events: 0,
    today_events: 0,
    cleared_total: 0,
    cleared_today: 0,
  });

  // State Server-Side Pagination & Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: PAGE_SIZE,
  });
  const [selectedPanel, setSelectedPanel] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Ref pengaman Stale Closure & duplikasi trigger
  const activeAlarmsRef = useRef({});
  const sentTriggerRef = useRef(new Set());

  // Otentikasi JWT & Role RBAC
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") || "viewer";
  const API_BASE = `http://${window.location.hostname}:3001`;

  // =======================================================
  // 1. FETCH STATISTIK DATABASE ASLI & ACTIVE ALARMS
  // =======================================================
  const fetchAlarmStatsAndActive = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alarms/stats`);
      if (!res.ok) return;
      const data = await res.json();

      setDbStats({
        total_events: data.total_events || 0,
        today_events: data.today_events || 0,
        cleared_total: data.cleared_total || 0,
        cleared_today: data.cleared_today || 0,
      });

      // Sinkronkan daftar alarm aktif dari database dengan nilai live di memori
      if (Array.isArray(data.active_alarms)) {
        const syncedActive = { ...activeAlarmsRef.current };
        data.active_alarms.forEach((log) => {
          const key = log.alarm_key || `db_alm_${log.id}`;
          syncedActive[key] = {
            ...syncedActive[key],
            id: log.id,
            alarmKey: key,
            timestamp: log.timestamp,
            panel: log.panel,
            message: syncedActive[key]?.message || log.message,
            severity: log.severity,
            status: log.status,
          };
        });
        activeAlarmsRef.current = syncedActive;
        setActiveAlarms({ ...syncedActive });
      }
    } catch (error) {
      console.error("Gagal menarik statistik alarm dari Database:", error);
    }
  }, [API_BASE]);

  // =======================================================
  // 2. FETCH TABEL 2 (CLEARED LOGS) DENGAN PAGINATION 50 BARIS
  // =======================================================
  const fetchPaginatedClearedLogs = useCallback(
    async (pageToLoad = currentPage) => {
      setIsLoadingTable(true);
      try {
        const params = new URLSearchParams({
          paginated: "true",
          status: "CLEARED",
          page: String(pageToLoad),
          limit: String(PAGE_SIZE),
          panel: selectedPanel,
        });

        if (startDate && endDate) {
          params.append("start", startDate);
          params.append("end", endDate);
        }

        const response = await fetch(
          `${API_BASE}/api/alarms/history?${params.toString()}`
        );
        if (!response.ok) return;

        const result = await response.json();
        if (result && Array.isArray(result.data)) {
          setClearedLogs(result.data);
          setPaginationMeta(
            result.pagination || {
              totalRecords: result.data.length,
              totalPages: 1,
              currentPage: pageToLoad,
              pageSize: PAGE_SIZE,
            }
          );
        } else if (Array.isArray(result)) {
          // Fallback jika backend belum di-restart
          const clearedOnly = result.filter((r) => r.status === "CLEARED");
          setClearedLogs(clearedOnly.slice(0, PAGE_SIZE));
          setPaginationMeta({
            totalRecords: clearedOnly.length,
            totalPages: Math.max(1, Math.ceil(clearedOnly.length / PAGE_SIZE)),
            currentPage: 1,
            pageSize: PAGE_SIZE,
          });
        }
      } catch (error) {
        console.error("Gagal menarik data riwayat alarm:", error);
      } finally {
        setIsLoadingTable(false);
      }
    },
    [API_BASE, currentPage, selectedPanel, startDate, endDate]
  );

  // Reset ke halaman 1 setiap kali filter Panel atau Tanggal berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPanel, startDate, endDate]);

  // Muat data saat halaman atau filter berubah, dan dengarkan event WebSocket 'alarm-sync'
  useEffect(() => {
    fetchAlarmStatsAndActive();
    fetchPaginatedClearedLogs(currentPage);

    const socket = io(API_BASE);
    socket.on("alarm-sync", () => {
      fetchAlarmStatsAndActive();
      fetchPaginatedClearedLogs(currentPage);
    });

    const interval = setInterval(() => {
      fetchAlarmStatsAndActive();
    }, 5000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [API_BASE, currentPage, fetchAlarmStatsAndActive, fetchPaginatedClearedLogs]);

  // =======================================================
  // 3. FUNGSI KIRIM TRIGGER & CLEAR KE BACKEND (IDEMPOTENT)
  // =======================================================
  const triggerAlarmToDB = useCallback(
    async (alarmObj) => {
      if (sentTriggerRef.current.has(alarmObj.alarmKey)) return;
      sentTriggerRef.current.add(alarmObj.alarmKey);

      try {
        const res = await fetch(`${API_BASE}/api/alarms/trigger`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alarm_key: alarmObj.alarmKey,
            panel: alarmObj.panel,
            message: alarmObj.message,
            severity: alarmObj.severity,
          }),
        });
        if (res.ok) {
          const saved = await res.json();
          if (saved.id && activeAlarmsRef.current[alarmObj.alarmKey]) {
            activeAlarmsRef.current[alarmObj.alarmKey].id = saved.id;
            if (saved.alarm?.timestamp) {
              activeAlarmsRef.current[alarmObj.alarmKey].timestamp =
                saved.alarm.timestamp;
            }
            setActiveAlarms({ ...activeAlarmsRef.current });
          }
          fetchAlarmStatsAndActive();
        }
      } catch (err) {
        console.error("Gagal mencatat alarm aktif ke database:", err);
      } finally {
        sentTriggerRef.current.delete(alarmObj.alarmKey);
      }
    },
    [API_BASE, fetchAlarmStatsAndActive]
  );

  const clearAlarmInDB = useCallback(
    async (alarmKey, clearMessage) => {
      try {
        await fetch(`${API_BASE}/api/alarms/clear`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alarm_key: alarmKey,
            message: clearMessage,
          }),
        });
        fetchAlarmStatsAndActive();
        fetchPaginatedClearedLogs(1);
      } catch (err) {
        console.error("Gagal mengupdate status CLEARED ke database:", err);
      }
    },
    [API_BASE, fetchAlarmStatsAndActive, fetchPaginatedClearedLogs]
  );

  // =======================================================
  // 4. FUNGSI ACKNOWLEDGE ALARM (Khusus Admin + Token JWT)
  // =======================================================
  const handleAcknowledge = async (alarmItem) => {
    const targetKey = alarmItem.alarmKey;

    if (activeAlarmsRef.current[targetKey]) {
      activeAlarmsRef.current[targetKey] = {
        ...activeAlarmsRef.current[targetKey],
        status: "ACKNOWLEDGED",
      };
      setActiveAlarms({ ...activeAlarmsRef.current });
    }

    try {
      await fetch(`${API_BASE}/api/alarms/ack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: alarmItem.id,
          alarm_key: targetKey,
        }),
      });
      fetchAlarmStatsAndActive();
    } catch (err) {
      console.error("Gagal update ACK ke database", err);
    }
  };

  // =======================================================
  // 5. ENGINE SCANNER LIVE VALUE (SINKRON DENGAN OPC DATA)
  // =======================================================
  useEffect(() => {
    if (!opcData) return;

    const currentActive = { ...activeAlarmsRef.current };
    let stateChanged = false;

    ANALOG_ALARM_CONFIG.forEach((config) => {
      const panelData = opcData[config.panel] || {};
      if (Object.keys(panelData).length === 0) return;

      config.tags.forEach((tag, idx) => {
        if (panelData[tag] === undefined) return;
        const val = Number(panelData[tag]);
        if (Number.isNaN(val)) return;

        const label = config.labels ? config.labels[idx] : "";

        config.rules.forEach((rule) => {
          const alarmKey = `alm_${config.panel}_${tag}_${rule.type}`;

          if (rule.ignoreZero && val === 0) return;

          if (rule.condition && !rule.condition(panelData)) {
            if (currentActive[alarmKey]) {
              const clearedAlarm = currentActive[alarmKey];
              const clearMsg = `${clearedAlarm.message} (NORMAL - Mode Non-Produksi)`;
              delete currentActive[alarmKey];
              stateChanged = true;
              clearAlarmInDB(alarmKey, clearMsg);
            }
            return;
          }

          let isTriggered = false;
          if (rule.type === "HIGH" && val > rule.limit) isTriggered = true;
          if (rule.type === "LOW" && val < rule.limit) isTriggered = true;

          const message = rule.msg(label, val);
          const nowStr = formatTimestamp();

          if (isTriggered) {
            if (!currentActive[alarmKey]) {
              const newAlarmObj = {
                id: null,
                alarmKey,
                timestamp: nowStr,
                cleared_at: null,
                panel: config.panel,
                message,
                currentValue: val,
                severity: rule.severity,
                status: "ACTIVE",
              };
              currentActive[alarmKey] = newAlarmObj;
              stateChanged = true;
              triggerAlarmToDB(newAlarmObj);
            } else if (currentActive[alarmKey].message !== message) {
              currentActive[alarmKey] = {
                ...currentActive[alarmKey],
                currentValue: val,
                message,
              };
              stateChanged = true;
            }
          } else if (!isTriggered && currentActive[alarmKey]) {
            const prevAlarm = currentActive[alarmKey];
            delete currentActive[alarmKey];
            stateChanged = true;
            clearAlarmInDB(alarmKey, prevAlarm.message);
          }
        });
      });
    });

    if (stateChanged) {
      activeAlarmsRef.current = currentActive;
      setActiveAlarms({ ...currentActive });
    }
  }, [opcData, triggerAlarmToDB, clearAlarmInDB]);

  const activeAlarmList = Object.values(activeAlarms);
  const unackCount = activeAlarmList.filter((a) => a.status === "ACTIVE").length;

  // =======================================================
  // 6. FUNGSI: EXPORT CSV LANGSUNG DARI POSTGRESQL (UNLIMITED)
  // =======================================================
  const handleExportCSV = async () => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      alert(
        "Mohon isi kedua tanggal (Start Date dan End Date) untuk memfilter rentang waktu!"
      );
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        exportAll: "true",
        panel: selectedPanel,
      });

      if (startDate && endDate) {
        params.append("start", startDate);
        params.append("end", endDate);
      }

      const res = await fetch(
        `${API_BASE}/api/alarms/history?${params.toString()}`
      );
      if (!res.ok) throw new Error("Gagal mengambil data ekspor dari server");

      const dataToExport = await res.json();

      if (!Array.isArray(dataToExport) || dataToExport.length === 0) {
        alert(
          "Tidak ada data alarm yang tercatat pada filter/rentang tanggal tersebut."
        );
        return;
      }

      const headers = [
        "Waktu Aktif (Triggered)",
        "Waktu Selesai (Cleared)",
        "Durasi",
        "Panel/Gedung",
        "Pesan Alarm",
        "Severity",
        "Status Akhir",
      ];
      const csvRows = [headers.join(";")];

      dataToExport.forEach((log) => {
        const clearedTime = log.cleared_at || "-";
        const duration =
          log.status === "CLEARED"
            ? calculateDuration(log.timestamp, clearedTime)
            : "Masih Aktif";

        const rowData = [
          log.timestamp || "-",
          clearedTime,
          duration,
          log.panel || "-",
          String(log.message || "").replace(/;/g, " "),
          String(log.severity || "info").toUpperCase(),
          log.status || "CLEARED",
        ];
        csvRows.push(rowData.join(";"));
      });

      const csvContent = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const panelSuffix = selectedPanel !== "ALL" ? `_${selectedPanel}` : "";
      const fileNameDate =
        startDate && endDate
          ? `${startDate}_to_${endDate}${panelSuffix}`
          : `All_${formatTimestamp().split(" ")[0]}${panelSuffix}`;

      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SASA_Alarm_Log_${fileNameDate}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengekspor CSV:", err);
      alert("Terjadi kesalahan saat mengekspor data log alarm.");
    } finally {
      setIsExporting(false);
    }
  };

  // Helper Reset Filter
  const handleResetFilter = () => {
    setSelectedPanel("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Hitung nomor urut baris yang sedang ditampilkan pada halaman aktif
  const startRowIndex =
    paginationMeta.totalRecords === 0
      ? 0
      : (paginationMeta.currentPage - 1) * paginationMeta.pageSize + 1;
  const endRowIndex = Math.min(
    paginationMeta.currentPage * paginationMeta.pageSize,
    paginationMeta.totalRecords
  );

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
      {/* ORNAMEN KOSMIK LATAR BELAKANG */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-rose-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-emerald-900/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ======================================================= */}
      {/* HEADER & FILTER/EXPORT TOOLBAR (GLASSMORPHISM)          */}
      {/* ======================================================= */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col xl:flex-row xl:items-center justify-between gap-4 relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-rose-200 tracking-wide uppercase">
              Alarm & System Event Log
            </h1>
            {/* <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
              24/7 Backend Fault Logger & Unlimited PostgreSQL Archive
            </p> */}
          </div>
        </div>

        {/* TOOLBAR FILTER PANEL, TANGGAL & EXPORT CSV */}
        <div className="flex flex-wrap items-center gap-2.5 bg-black/30 backdrop-blur-md p-2.5 rounded-2xl border border-white/10">
          {/* Filter Panel */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
            <Filter size={14} className="text-blue-400" />
            <select
              value={selectedPanel}
              onChange={(e) => setSelectedPanel(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#121215] text-white">
                SEMUA PANEL
              </option>
              <option value="LVMDP1" className="bg-[#121215] text-white">
                PANEL: LVMDP1
              </option>
              <option value="COS" className="bg-[#121215] text-white">
                PANEL: COS
              </option>
              <option value="CWC" className="bg-[#121215] text-white">
                PANEL: CWC
              </option>
            </select>
          </div>

          {/* Filter Kalender Tanggal */}
          <div className="flex items-center space-x-2 px-1">
            <Calendar size={15} className="text-rose-400 hidden sm:block" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => e.target.showPicker && e.target.showPicker()}
              className="bg-white/5 text-xs font-mono text-white px-2.5 py-2 rounded-xl border border-white/10 focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer w-[130px] transition-all"
              style={{ colorScheme: "dark" }}
            />
            <span className="text-gray-500 text-[10px] font-bold font-mono">
              TO
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => e.target.showPicker && e.target.showPicker()}
              className="bg-white/5 text-xs font-mono text-white px-2.5 py-2 rounded-xl border border-white/10 focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer w-[130px] transition-all"
              style={{ colorScheme: "dark" }}
            />
          </div>

          {/* Tombol Reset Filter (Hanya muncul jika filter sedang aktif) */}
          {(selectedPanel !== "ALL" || startDate || endDate) && (
            <button
              onClick={handleResetFilter}
              title="Reset Semua Filter"
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs font-mono border border-white/10 transition-all"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          {/* Tombol Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/30 disabled:opacity-50"
          >
            <FileSpreadsheet size={15} />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* STATISTIK RINGKAS (3 KARTU DUAL-METRIC REAL DB COUNT)   */}
      {/* ======================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        {/* Card 1: Active Alarms */}
        <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-rose-500/30 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full blur-2xl group-hover:from-rose-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">
              Total Active Alarms (Real-Time)
            </p>
            <p className="text-4xl font-mono text-rose-500 font-black animate-pulse drop-shadow-md">
              {activeAlarmList.length}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-300">
              <span>Unacknowledged: {unackCount}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 relative z-10">
            <BellRing size={30} />
          </div>
        </div>

        {/* Card 2: Cleared Alarms (All-Time DB Count + Hari Ini) */}
        <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-emerald-500/30 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl group-hover:from-emerald-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">
              Resolved / Cleared (All-Time DB)
            </p>
            <p className="text-4xl font-mono text-emerald-400 font-black drop-shadow-md">
              {dbStats.cleared_total.toLocaleString("id-ID")}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-300">
              <span>Hari Ini: +{dbStats.cleared_today.toLocaleString("id-ID")} Selesai</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 relative z-10">
            <CheckCircle2 size={30} />
          </div>
        </div>

        {/* Card 3: Total Logged Events (All-Time DB Count + Hari Ini) */}
        <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:border-blue-500/30 transition-all duration-500 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 opacity-80"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl group-hover:from-blue-500/20 transition-all pointer-events-none"></div>
          <div className="pl-3 relative z-10">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">
              Total Logged Events (PostgreSQL)
            </p>
            <p className="text-4xl font-mono text-blue-400 font-black drop-shadow-md">
              {dbStats.total_events.toLocaleString("id-ID")}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-300">
              <Database size={11} />
              <span>Hari Ini: +{dbStats.today_events.toLocaleString("id-ID")} Event</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 relative z-10">
            <ShieldAlert size={30} />
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* TABEL 1: ACTIVE ALARMS (SEDANG AKTIF SAAT INI)          */}
      {/* ======================================================= */}
      <div className="mb-8 relative z-10">
        <div className="flex items-center justify-between px-2 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              {activeAlarmList.length > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  activeAlarmList.length > 0 ? "bg-rose-500" : "bg-emerald-500"
                }`}
              ></span>
            </span>
            <h2 className="text-xs font-bold text-white uppercase tracking-widest drop-shadow-md">
              Active Alarms (Real-Time Faults)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
            {activeAlarmList.length} Active Fault(s)
          </span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:border-rose-500/30 transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent"></div>
          <div className="overflow-x-auto max-h-[340px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-[#0A0A0C]/95 backdrop-blur-xl border-b border-white/10">
                <tr className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                  <th className="p-4 pl-6">Waktu Aktif (Triggered At)</th>
                  <th className="p-4">Panel / Area</th>
                  <th className="p-4">Pesan Gangguan (Live Value)</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4 pr-6">Status & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-300 font-mono">
                {activeAlarmList.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-10 text-center text-gray-400 font-sans"
                    >
                      <CheckCircle2
                        size={36}
                        className="mx-auto mb-2 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      />
                      <p className="text-sm font-semibold text-emerald-400">
                        Sistem Berjalan Normal (Zero Active Faults)
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Seluruh parameter tegangan, harmonik THD, dan kualitas proses berada dalam batas aman.
                      </p>
                    </td>
                  </tr>
                ) : (
                  activeAlarmList.map((alarm) => (
                    <tr
                      key={alarm.alarmKey}
                      className="bg-rose-950/10 hover:bg-rose-900/20 transition-colors"
                    >
                      <td className="p-4 pl-6 flex items-center space-x-2 text-rose-300 whitespace-nowrap">
                        <Clock
                          size={14}
                          className="text-rose-400 animate-spin"
                          style={{ animationDuration: "6s" }}
                        />
                        <span>{alarm.timestamp}</span>
                      </td>
                      <td className="p-4 font-sans font-bold text-white whitespace-nowrap">
                        {alarm.panel}
                      </td>
                      <td className="p-4 font-sans font-medium text-white">
                        {alarm.message}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                            alarm.severity === "critical"
                              ? "bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                              : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                          }`}
                        >
                          {alarm.severity}
                        </span>
                      </td>
                      <td className="p-4 pr-6">
                        <div className="flex items-center space-x-3">
                          {/* PROTEKSI RBAC: Tombol eksekusi ACK hanya muncul untuk role admin */}
                          {alarm.status === "ACTIVE" && role === "admin" && (
                            <button
                              onClick={() => handleAcknowledge(alarm)}
                              className="bg-blue-600/80 hover:bg-blue-500 border border-blue-400/40 text-white text-[10px] px-3 py-1 rounded-lg font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                            >
                              ACK
                            </button>
                          )}
                          <span
                            className={`flex items-center space-x-1.5 font-sans font-bold text-xs whitespace-nowrap ${
                              alarm.status === "ACTIVE"
                                ? "text-rose-500 animate-pulse"
                                : "text-orange-400"
                            }`}
                          >
                            {alarm.status === "ACTIVE" ? (
                              <AlertTriangle size={14} />
                            ) : (
                              <ShieldAlert size={14} />
                            )}
                            <span>{alarm.status}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* TABEL 2: CLEARED ALARMS & HISTORICAL LOG (PAGINATED)    */}
      {/* ======================================================= */}
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 mb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <History size={16} className="text-emerald-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-widest drop-shadow-md">
              Cleared & Historical Alarm Archive
            </h2>
          </div>

          {/* Info Transparan agar User Tidak Salah Asumsi */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Menampilkan {startRowIndex}–{endRowIndex} dari{" "}
              {paginationMeta.totalRecords.toLocaleString("id-ID")} Record
              {selectedPanel !== "ALL" ? ` (${selectedPanel})` : ""}
            </span>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:border-white/20 transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-[#0A0A0C]/95 backdrop-blur-xl border-b border-white/10">
                <tr className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                  <th className="p-4 pl-6">Waktu Aktif (Triggered)</th>
                  <th className="p-4">Waktu Selesai (Cleared)</th>
                  <th className="p-4">Durasi</th>
                  <th className="p-4">Panel</th>
                  <th className="p-4">Pesan Gangguan</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4 pr-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-300 font-mono">
                {isLoadingTable ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-12 text-center text-gray-400 font-mono text-xs animate-pulse"
                    >
                      Memuat halaman {currentPage} dari arsip PostgreSQL...
                    </td>
                  </tr>
                ) : clearedLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-12 text-center text-gray-500 font-sans"
                    >
                      <Activity
                        size={32}
                        className="mx-auto mb-2 text-gray-600"
                      />
                      Tidak ada riwayat alarm CLEARED yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                ) : (
                  clearedLogs.map((log, index) => (
                    <tr
                      key={log.id || index}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 pl-6 text-gray-300 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Clock size={13} className="text-rose-400/70" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>
                      <td className="p-4 text-emerald-400 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span>{log.cleared_at || "-"}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-cyan-400 whitespace-nowrap">
                        {calculateDuration(log.timestamp, log.cleared_at)}
                      </td>
                      <td className="p-4 font-sans font-bold text-white whitespace-nowrap">
                        {log.panel}
                      </td>
                      <td className="p-4 font-sans text-gray-300">
                        {log.message}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                            log.severity === "critical"
                              ? "bg-red-500/15 text-red-400 border border-red-500/30"
                              : log.severity === "warning"
                              ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="p-4 pr-6">
                        <span className="inline-flex items-center space-x-1.5 font-sans font-bold text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg whitespace-nowrap">
                          <CheckCircle2 size={13} />
                          <span>CLEARED</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ======================================================= */}
          {/* FOOTER NAVIGASI PAGINATION (RINGAN & MUDAH DI-TRACE)     */}
          {/* ======================================================= */}
          <div className="bg-black/40 border-t border-white/10 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] font-mono text-gray-400">
              Menampilkan max{" "}
              <span className="text-white font-bold">{PAGE_SIZE}</span> baris per
              halaman.
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1 || isLoadingTable}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={15} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoadingTable}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-300">
                Hal {paginationMeta.currentPage} / {paginationMeta.totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(paginationMeta.totalPages, p + 1)
                  )
                }
                disabled={
                  currentPage >= paginationMeta.totalPages || isLoadingTable
                }
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(paginationMeta.totalPages)}
                disabled={
                  currentPage >= paginationMeta.totalPages || isLoadingTable
                }
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alarm;