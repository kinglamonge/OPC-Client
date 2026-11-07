const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const db = require("./db");
const { startHistorian } = require("./historian");
const startOPC = require("./opcClient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cron = require("node-cron"); // Modul untuk reset terjadwal

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Secret Key untuk enkripsi Token JWT
const SECRET_KEY = "SASA_MACHEYE_SECRET_2026";

// Penyimpanan Blacklist Token untuk "Kick User"
const blacklistedUsers = new Set();

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// =======================================================
// KONEKSI SOCKET & ENDPOINT DATA AWAL (AMAN UNTUK GRAFIK)
// =======================================================
io.on("connection", (socket) => {
  console.log(`[SOCKET] Halaman Frontend Baru Terhubung: ${socket.id}`);
});

// 🔥 ENDPOINT BARU: Untuk menarik data awal secara aman tanpa WebSocket spam
app.get("/api/opc/current", (req, res) => {
  res.json(backendOpcState);
});

// =======================================================
// 1. KONFIGURASI ATURAN ALARM 24/7 DI BACKEND
// =======================================================
const ANALOG_ALARM_CONFIG = [
  {
    panel: "COS",
    tags: ["thd_i_a", "thd_i_b", "thd_i_c"],
    labels: ["A", "B", "C"],
    rules: [
      {
        type: "HIGH", limit: 5.0, severity: "warning", ignoreZero: false,
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
        type: "HIGH", limit: 5.0, severity: "warning", ignoreZero: false,
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
        type: "LOW", limit: 375.0, severity: "critical", ignoreZero: true,
        msg: (label, val) => `Under-Voltage Line ${label} (${val}V)`,
      },
      {
        type: "HIGH", limit: 410.0, severity: "critical", ignoreZero: false,
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
        type: "LOW", limit: 375.0, severity: "critical", ignoreZero: true,
        msg: (label, val) => `Under-Voltage Line ${label} (${val}V)`,
      },
      {
        type: "HIGH", limit: 410.0, severity: "critical", ignoreZero: false,
        msg: (label, val) => `Over-Voltage Line ${label} (${val}V)`,
      },
    ],
  },
  {
    panel: "CWC",
    tags: ["evap_brix"],
    labels: [""],
    rules: [
      {
        type: "LOW", limit: 60, severity: "warning", ignoreZero: true,
        condition: (panelData) => Number(panelData["evap_prod_step"] ?? 1) === 140,
        msg: (_label, val) => `BRIX Evaporator Rendah saat Produksi (${val}%) — Batas Min 60%`,
      },
      {
        type: "HIGH", limit: 64, severity: "warning", ignoreZero: true,
        condition: (panelData) => Number(panelData["evap_prod_step"] ?? 1) === 140,
        msg: (_label, val) => `BRIX Evaporator Tinggi saat Produksi (${val}%) — Batas Max 64%`,
      },
    ],
  },
];

// 🔬 Definisi Channel WaterFlow untuk Kalkulasi Harian
const WATER_CHANNELS = [
  { total: "ft_opening_total", today: "ft_opening_today", yesterday: "ft_opening_yesterday", resetTime: "ft_opening_last_reset", resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH1" },
  { total: "ft_dc_total", today: "ft_dc_today", yesterday: "ft_dc_yesterday", resetTime: "ft_dc_last_reset", resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH2" },
  { total: "ft_cwc_total", today: "ft_cwc_today", yesterday: "ft_cwc_yesterday", resetTime: "ft_cwc_last_reset", resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH3" },
  { total: "ft_aseptic_total", today: "ft_aseptic_today", yesterday: "ft_aseptic_yesterday", resetTime: "ft_aseptic_last_reset", resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH4" },
  { total: "ft_afm_total", today: "ft_afm_today", yesterday: "ft_afm_yesterday", resetTime: "ft_afm_last_reset", resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH5" },
  { total: "ft_biogas_total", today: "ft_biogas_today", yesterday: "ft_biogas_yesterday", resetTime: "ft_biogas_last_reset", resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH6" },
  { total: "ft_spare1_total", today: "ft_spare1_today", yesterday: "ft_spare1_yesterday", resetTime: "ft_spare1_last_reset", resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH7" },
  { total: "ft_spare2_total", today: "ft_spare2_today", yesterday: "ft_spare2_yesterday", resetTime: "ft_spare2_last_reset", resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH8" },
];

// Cache state OPC UA & Memori Alarm Aktif di Server
const backendOpcState = {};
const activeAlarmsMemory = new Map();
const alarmLockSet = new Set();
const virtualTagsMemory = {};

// =======================================================
// VARIABEL & ENGINE UNTUK TREND OPENING (1 SHIFT SAJA)
// =======================================================
let openingLastTotal = 0;
let liveDailyAccumulator = 0; 

// Engine pembaca delta harian
setInterval(() => {
  const currentCounter = backendOpcState["Opening-Panel"]?.["total_counter"] || backendOpcState["Opening"]?.["total_counter"];
  if (currentCounter !== undefined) {
    const delta = currentCounter - openingLastTotal;
    if (delta > 0 && delta < 5000) { 
      liveDailyAccumulator += delta;
    }
    openingLastTotal = currentCounter;
  }
}, 1000);

// =======================================================
// 2. AUTO-MIGRATION, INDEXING & INISIALISASI DATABASE
// =======================================================
async function initAlarmSystem() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        source VARCHAR(100),
        message TEXT,
        severity VARCHAR(50),
        status VARCHAR(30) DEFAULT 'ACTIVE',
        alarm_key VARCHAR(120),
        cleared_at TIMESTAMP
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp ON event_logs (timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_event_logs_status ON event_logs (status);
      CREATE INDEX IF NOT EXISTS idx_event_logs_source ON event_logs (source);
    `);

    // TABEL BARU: Opening Trends
    await db.query(`
      CREATE TABLE IF NOT EXISTS opening_trends (
        record_date DATE PRIMARY KEY,
        total_daily INT DEFAULT 0
      );
    `);
    
    await db.query(`INSERT INTO opening_trends (record_date) VALUES (CURRENT_DATE) ON CONFLICT DO NOTHING`);

    // TABEL BARU: CWC Trends (Ini yang sempat tertinggal)
    await db.query(`
      CREATE TABLE IF NOT EXISTS cwc_trends (
          record_date DATE PRIMARY KEY,
          input_total NUMERIC NOT NULL DEFAULT 0,
          output_total NUMERIC NOT NULL DEFAULT 0
      );
    `);

    await db.query(`INSERT INTO cwc_trends (record_date) VALUES (CURRENT_DATE) ON CONFLICT DO NOTHING`);

    const res = await db.query(`
      SELECT id, alarm_key, source AS panel, message, severity, status, TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp
      FROM event_logs WHERE status IN ('ACTIVE', 'ACKNOWLEDGED') AND alarm_key IS NOT NULL ORDER BY timestamp DESC
    `);

    activeAlarmsMemory.clear();
    for (const row of res.rows) {
      if (!activeAlarmsMemory.has(row.alarm_key)) activeAlarmsMemory.set(row.alarm_key, row);
    }
    console.log(`[ALARM ENGINE] Skema & Index terverifikasi. ${activeAlarmsMemory.size} alarm aktif dipulihkan.`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS virtual_tags (
        tag_key VARCHAR(100) PRIMARY KEY, tag_value VARCHAR(255), updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    const vTags = await db.query(`SELECT tag_key, tag_value FROM virtual_tags`);
    vTags.rows.forEach((row) => virtualTagsMemory[row.tag_key] = row.tag_value);
    console.log(`[SYSTEM] Berhasil memuat ${vTags.rows.length} virtual tags ke memori.`);
  } catch (err) {
    console.error("[ALARM ENGINE] Gagal inisialisasi tabel event_logs:", err.message);
  }
}

async function saveVirtualTag(key, value) {
  virtualTagsMemory[key] = value;
  try {
    await db.query(
      `INSERT INTO virtual_tags (tag_key, tag_value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (tag_key) DO UPDATE SET tag_value = EXCLUDED.tag_value, updated_at = NOW()`,
      [key, String(value)],
    );
  } catch (err) {
    console.error(`[DB ERROR] Gagal menyimpan virtual tag ${key}:`, err.message);
  }
}

async function recordAlarmTrigger(alarmKey, panel, message, severity) {
  if (activeAlarmsMemory.has(alarmKey) || alarmLockSet.has(alarmKey)) return activeAlarmsMemory.get(alarmKey);
  alarmLockSet.add(alarmKey);
  try {
    const existing = await db.query(
      `SELECT id, alarm_key, source AS panel, message, severity, status, TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp
       FROM event_logs WHERE alarm_key = $1 AND status IN ('ACTIVE', 'ACKNOWLEDGED') ORDER BY timestamp DESC LIMIT 1`, [alarmKey]
    );

    if (existing.rows.length > 0) {
      activeAlarmsMemory.set(alarmKey, existing.rows[0]);
      return existing.rows[0];
    }

    const insertRes = await db.query(
      `INSERT INTO event_logs (alarm_key, source, message, severity, status, timestamp) VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())
       RETURNING id, alarm_key, source AS panel, message, severity, status, TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp`,
      [alarmKey, panel, message, severity]
    );

    activeAlarmsMemory.set(alarmKey, insertRes.rows[0]);
    console.log(`[ALARM TRIGGERED] ${panel} | ${message}`);
    originalIoEmit("alarm-sync", { type: "TRIGGER", alarm: insertRes.rows[0] });
    return insertRes.rows[0];
  } catch (err) {
    return null;
  } finally {
    alarmLockSet.delete(alarmKey);
  }
}

async function recordAlarmClear(alarmKey, clearMessage) {
  if (!activeAlarmsMemory.has(alarmKey) || alarmLockSet.has(`clear_${alarmKey}`)) return;
  alarmLockSet.add(`clear_${alarmKey}`);
  try {
    const activeItem = activeAlarmsMemory.get(alarmKey);
    await db.query(
      `UPDATE event_logs SET status = 'CLEARED', cleared_at = NOW(), message = $2 WHERE alarm_key = $1 AND status IN ('ACTIVE', 'ACKNOWLEDGED')`,
      [alarmKey, clearMessage || activeItem.message]
    );
    activeAlarmsMemory.delete(alarmKey);
    console.log(`[ALARM CLEARED] ${alarmKey} -> NORMAL`);
    originalIoEmit("alarm-sync", { type: "CLEAR", alarm_key: alarmKey });
  } catch (err) { } finally {
    alarmLockSet.delete(`clear_${alarmKey}`);
  }
}

// =======================================================
// 3. ENGINE EVALUASI ALARM REAL-TIME 24/7 DI BACKEND
// =======================================================
function evaluatePanelAlarms(panelName) {
  const panelData = backendOpcState[panelName];
  if (!panelData) return;

  const configs = ANALOG_ALARM_CONFIG.filter((c) => c.panel === panelName);
  if (configs.length === 0) return;

  configs.forEach((config) => {
    config.tags.forEach((tag, idx) => {
      if (panelData[tag] === undefined) return;
      const val = Number(panelData[tag]);
      if (Number.isNaN(val)) return;

      const label = config.labels ? config.labels[idx] : "";

      config.rules.forEach((rule) => {
        const alarmKey = `alm_${config.panel}_${tag}_${rule.type}`;
        if (rule.ignoreZero && val === 0) return;

        if (rule.condition && !rule.condition(panelData)) {
          if (activeAlarmsMemory.has(alarmKey)) {
            recordAlarmClear(alarmKey, `${activeAlarmsMemory.get(alarmKey).message} (NORMAL - Mode Non-Produksi)`);
          }
          return;
        }

        let isTriggered = false;
        if (rule.type === "HIGH" && val > rule.limit) isTriggered = true;
        if (rule.type === "LOW" && val < rule.limit) isTriggered = true;

        const message = rule.msg(label, val);

        if (isTriggered) {
          if (!activeAlarmsMemory.has(alarmKey)) recordAlarmTrigger(alarmKey, config.panel, message, rule.severity);
          else {
            const current = activeAlarmsMemory.get(alarmKey);
            if (current && current.message !== message) {
              current.message = message;
              activeAlarmsMemory.set(alarmKey, current);
            }
          }
        } else if (!isTriggered && activeAlarmsMemory.has(alarmKey)) {
          recordAlarmClear(alarmKey, activeAlarmsMemory.get(alarmKey).message);
        }
      });
    });
  });
}

function startVirtualTagsEngine() {
  setInterval(() => {
    if (!backendOpcState["WaterFlow"]) backendOpcState["WaterFlow"] = {};
    WATER_CHANNELS.forEach((ch) => {
      const currentTotal = parseFloat(backendOpcState["WaterFlow"][ch.total]) || 0;
      const baselineKey = `${ch.total}_baseline`;
      let baselineAt6AM = parseFloat(virtualTagsMemory[baselineKey]) || 0;

      if (currentTotal < baselineAt6AM) {
        baselineAt6AM = 0;
        saveVirtualTag(baselineKey, 0);
      }

      const todayUsage = currentTotal - baselineAt6AM;
      const yesterdayVal = virtualTagsMemory[ch.yesterday] || 0;
      const resetTimeVal = virtualTagsMemory[ch.resetTime] || "--/--/---- --:--";

      backendOpcState["WaterFlow"][ch.today] = todayUsage;
      backendOpcState["WaterFlow"][ch.yesterday] = yesterdayVal;
      backendOpcState["WaterFlow"][ch.resetTime] = resetTimeVal;

      originalIoEmit("opc-data", { panel: "WaterFlow", tag: ch.today, value: todayUsage });
      originalIoEmit("opc-data", { panel: "WaterFlow", tag: ch.yesterday, value: yesterdayVal });
      originalIoEmit("opc-data", { panel: "WaterFlow", tag: ch.resetTime, value: resetTimeVal });
    });
  }, 2000);
}

const originalIoEmit = io.emit.bind(io);
io.emit = function (event, payload, ...args) {
  if (event === "opc-data" && payload && payload.panel && payload.tag !== undefined) {
    if (!backendOpcState[payload.panel]) backendOpcState[payload.panel] = {};
    backendOpcState[payload.panel][payload.tag] = payload.value;
    evaluatePanelAlarms(payload.panel);
  }
  return originalIoEmit(event, payload, ...args);
};

// =======================================================
// 4. CRON JOBS SYSTEM
// =======================================================

// A. WATERFLOW ROLLOVER JAM 06:00 PAGI
cron.schedule("0 6 * * *", async () => {
  console.log("[WATER LOG] Memulai Rollover Harian (06:00 AM)...");
  for (const ch of WATER_CHANNELS) {
    const currentTotal = parseFloat(backendOpcState["WaterFlow"]?.[ch.total]) || 0;
    const baselineKey = `${ch.total}_baseline`;
    const baselineAt6AM = parseFloat(virtualTagsMemory[baselineKey]) || 0;
    const yesterdayUsage = currentTotal - baselineAt6AM;

    await saveVirtualTag(ch.yesterday, yesterdayUsage);
    await saveVirtualTag(baselineKey, currentTotal);
    io.emit("opc-data", { panel: "WaterFlow", tag: ch.yesterday, value: yesterdayUsage });
    io.emit("opc-data", { panel: "WaterFlow", tag: ch.today, value: 0 });
  }
});

// B. OPENING: REKAM TOTAL & AUTO RESET PLC (Pukul 17:00)
cron.schedule("0 17 * * *", async () => {
  console.log("[OPENING] Merekam Akhir Shift & Auto-Reset Harian (17:00)...");
  try {
    const currentTotal = backendOpcState["Opening-Panel"]?.["total_counter"] || backendOpcState["Opening"]?.["total_counter"] || 0;
    const finalTotal = Math.max(liveDailyAccumulator, currentTotal);

    await db.query(`
      INSERT INTO opening_trends (record_date, total_daily) 
      VALUES (CURRENT_DATE, $1) ON CONFLICT (record_date) DO UPDATE SET total_daily = $1
    `, [finalTotal]);
    liveDailyAccumulator = 0;

    const opcModule = require("./opcClient");
    if (typeof opcModule.writeNode === "function") {
      await opcModule.writeNode("ns=2;s=Kelapa.Counter.Reset", true, "Boolean");
      setTimeout(() => opcModule.writeNode("ns=2;s=Kelapa.Counter.Reset", false, "Boolean"), 2000);
    }
  } catch (err) {}
});

// C. CWC: REKAM TOTALIZER HARIAN (Pukul 23:00)
cron.schedule("0 23 * * *", async () => {
  console.log("[CRON] Menjalankan rekap harian CWC (Akhir Shift 23:00)...");
  try {
    const waterData = backendOpcState['WaterFlow'] || {};
    // Menggunakan penamaan tag flowmeter CWC yang umum
    const inputTotal = Number(waterData['ft_cwc_today']) || 0;
    const outputTotal = Number(waterData['ft_cwc_output_today']) || 0;

    await db.query(`
      INSERT INTO cwc_trends (record_date, input_total, output_total)
      VALUES (CURRENT_DATE, $1, $2)
      ON CONFLICT (record_date)
      DO UPDATE SET input_total = EXCLUDED.input_total, output_total = EXCLUDED.output_total;
    `, [inputTotal, outputTotal]);
    console.log(`[CRON SUCCESS] Data CWC terekam: Input=${inputTotal} L, Output=${outputTotal} L`);
  } catch (error) {
    console.error("[CRON ERROR] Gagal merekam data harian CWC:", error);
  }
});

// D. INISIALISASI HARI BARU DI DATABASE (Pukul 00:01)
cron.schedule("1 0 * * *", async () => {
  try {
    await db.query(`INSERT INTO opening_trends (record_date) VALUES (CURRENT_DATE) ON CONFLICT DO NOTHING`);
    await db.query(`INSERT INTO cwc_trends (record_date) VALUES (CURRENT_DATE) ON CONFLICT DO NOTHING`);
  } catch(err) {}
});

// =======================================================
// MIDDLEWARE: PROTEKSI TOKEN JWT & BLACKLIST (KICK USER)
// =======================================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Akses Ditolak. Token tidak ditemukan." });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Sesi tidak valid atau telah kedaluwarsa." });
    if (blacklistedUsers.has(user.username)) return res.status(401).json({ error: "Sesi Anda telah dihentikan oleh Administrator." });
    req.user = user;
    next();
  });
};

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Akses ditolak." });
  next();
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Akses ditolak.` });
    }
    next();
  };
};

// =======================================================
// REST API ENDPOINT: OPENING STATION TRENDS
// =======================================================
app.get("/api/opening/trends", authenticateToken, async (req, res) => {
  try {
    const weeklyResult = await db.query(`
      WITH dates AS (
        SELECT generate_series(date_trunc('week', CURRENT_DATE), date_trunc('week', CURRENT_DATE) + '6 days'::interval, '1 day'::interval)::date AS d
      )
      SELECT EXTRACT(ISODOW FROM d.d) AS day_index, COALESCE(t.total_daily, 0) AS total
      FROM dates d LEFT JOIN opening_trends t ON d.d = t.record_date ORDER BY d.d ASC;
    `);

    const daysMap = { 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab', 7: 'Min' };
    const weekly = weeklyResult.rows.map(r => ({ day: daysMap[r.day_index] || '?', total: Number(r.total) }));
    res.json({ weekly });
  } catch (err) {
    res.status(500).json({ error: "Gagal menarik data trend" });
  }
});

// =======================================================
// REST API ENDPOINT: CWC STATION TRENDS
// =======================================================
app.get("/api/cwc/trends", authenticateToken, async (req, res) => {
  try {
    const weeklyResult = await db.query(`
      SELECT 
        EXTRACT(ISODOW FROM d.date)::int AS day_index,
        COALESCE(t.input_total, 0) AS input_total,
        COALESCE(t.output_total, 0) AS output_total
      FROM (
        SELECT (date_trunc('week', CURRENT_DATE) + (i || ' days')::interval)::date AS date
        FROM generate_series(0, 6) i
      ) d
      LEFT JOIN cwc_trends t ON d.date = t.record_date::date
      ORDER BY d.date ASC;
    `);

    const daysMap = { 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab', 7: 'Min' };
    const inputTrend = [];
    const outputTrend = [];

    weeklyResult.rows.forEach(r => {
      const dayName = daysMap[r.day_index] || '?';
      inputTrend.push({ day: dayName, total: Number(r.input_total) });
      outputTrend.push({ day: dayName, total: Number(r.output_total) });
    });

    res.json({ input: inputTrend, output: outputTrend });
  } catch (err) {
    console.error("[API ERROR] Gagal menarik data trend CWC:", err);
    res.status(500).json({ error: "Gagal menarik data trend CWC" });
  }
});

// =======================================================
// REST API ENDPOINT: AUTENTIKASI LOGIN & ADMIN
// =======================================================
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Username tidak terdaftar." });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: "Password salah." });

    if (blacklistedUsers.has(user.username)) blacklistedUsers.delete(user.username);

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: "12h" });
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (ip && ip.substr(0, 7) === "::ffff:") ip = ip.substr(7);

    await db.query("INSERT INTO login_history (username, ip_address, role) VALUES ($1, $2, $3)", [user.username, ip, user.role]);
    res.json({ success: true, token, role: user.role, username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

app.get("/api/admin/sessions", authenticateToken, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM login_history ORDER BY login_time DESC LIMIT 100");
    const formatted = result.rows.map((row) => ({
      ...row, login_time: new Date(row.login_time).toLocaleString("id-ID"),
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "Gagal menarik data sesi." });
  }
});

// =======================================================
// REST API ENDPOINT: MANAJEMEN USER
// =======================================================
app.get("/api/admin/users", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT id, username, role, created_at FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Gagal menarik data user." }); }
});

app.post("/api/admin/users", authenticateToken, authorizeAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: "Data tidak lengkap." });
  try {
    const userExist = await db.query("SELECT id FROM users WHERE username = $1", [username]);
    if (userExist.rows.length > 0) return res.status(400).json({ error: "Username sudah digunakan." });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)", [username, hashedPassword, role]);
    res.json({ success: true, message: "User berhasil ditambahkan." });
  } catch (err) { res.status(500).json({ error: "Gagal menambahkan user." }); }
});

app.put("/api/admin/users/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params; const { role, password } = req.body;
  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query("UPDATE users SET role = $1, password_hash = $2 WHERE id = $3", [role, hashedPassword, id]);
    } else {
      await db.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
    }
    res.json({ success: true, message: "Data user berhasil diperbarui." });
  } catch (err) { res.status(500).json({ error: "Gagal memperbarui user." }); }
});

app.delete("/api/admin/users/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.id == id) return res.status(400).json({ error: "Anda tidak bisa menghapus akun Anda sendiri." });
    await db.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ success: true, message: "User berhasil dihapus." });
  } catch (err) { res.status(500).json({ error: "Gagal menghapus user." }); }
});

app.post("/api/admin/users/kick", authenticateToken, authorizeAdmin, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username wajib diisi." });
  if (req.user.username === username) return res.status(400).json({ error: "Anda tidak bisa menghentikan sesi Anda sendiri." });

  blacklistedUsers.add(username);
  setTimeout(() => blacklistedUsers.delete(username), 12 * 60 * 60 * 1000);
  io.emit("force-logout", { username });
  res.json({ success: true, message: `Sesi pengguna [${username}] dihentikan paksa.` });
});

// =======================================================
// REST API ENDPOINT: HISTORIAN & ALARMS
// =======================================================
app.get("/api/history", async (req, res) => {
  const { panel, tag, limit = 60 } = req.query;
  if (!panel || !tag) return res.status(400).json({ error: "Parameter panel dan tag wajib diisi" });
  try {
    const tableName = `${panel.toLowerCase()}_data`;
    const result = await db.query(`SELECT ts AS timestamp, "${tag}" AS value FROM ${tableName} WHERE "${tag}" IS NOT NULL ORDER BY ts DESC LIMIT $1`, [limit]);
    const formattedData = result.rows.map((row) => ({
      time: new Date(row.timestamp).toLocaleTimeString("id-ID", { hour12: false }), value: row.value,
    }));
    res.json(formattedData.reverse());
  } catch (err) { res.status(500).json({ error: "Gagal mengambil data history" }); }
});

app.get("/api/history/range", async (req, res) => {
  const { panel, tag, start, end } = req.query;
  if (!panel || !tag || !start || !end) return res.status(400).json({ error: "Parameter wajib diisi" });
  try {
    const tableName = `${panel.toLowerCase()}_data`;
    const result = await db.query(`SELECT ts AS timestamp, "${tag}" AS value FROM ${tableName} WHERE ts >= $1::timestamptz AND ts <= $2::timestamptz AND "${tag}" IS NOT NULL ORDER BY ts ASC LIMIT 3000`, [start, end]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Gagal mengambil data historis." }); }
});

app.get("/api/events", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM event_logs ORDER BY timestamp DESC LIMIT 100");
    const formattedLogs = result.rows.map((row) => ({
      id: row.id, time: new Date(row.timestamp).toLocaleTimeString("id-ID", { hour12: false }),
      severity: row.severity, source: row.source, message: row.message,
    }));
    res.json(formattedLogs);
  } catch (err) { res.status(500).json({ error: "Gagal mengambil log" }); }
});

app.post("/api/events", async (req, res) => {
  const { severity, source, message } = req.body;
  try {
    await db.query("INSERT INTO event_logs (severity, source, message, status, timestamp) VALUES ($1, $2, $3, 'ACTIVE', NOW())", [severity, source, message]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Gagal menyimpan log" }); }
});

app.post("/api/alarms/trigger", async (req, res) => {
  const { alarm_key, panel, message, severity } = req.body;
  if (!alarm_key || !panel) return res.status(400).json({ error: "alarm_key dan panel wajib diisi" });
  try {
    const row = await recordAlarmTrigger(alarm_key, panel, message, severity || "warning");
    res.json({ success: true, id: row?.id, alarm: row });
  } catch (err) { res.status(500).json({ error: "Gagal menyimpan alarm" }); }
});

app.post("/api/alarms/clear", async (req, res) => {
  const { alarm_key, message } = req.body;
  if (!alarm_key) return res.status(400).json({ error: "alarm_key wajib diisi" });
  try {
    await recordAlarmClear(alarm_key, message);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Gagal mengupdate CLEARED" }); }
});

app.get("/api/alarms/stats", async (req, res) => {
  try {
    const statsQuery = `
      SELECT COUNT(*)::int AS total_events, COUNT(*) FILTER (WHERE timestamp >= CURRENT_DATE)::int AS today_events,
             COUNT(*) FILTER (WHERE COALESCE(status, 'CLEARED') = 'CLEARED')::int AS cleared_total,
             COUNT(*) FILTER (WHERE COALESCE(status, 'CLEARED') = 'CLEARED' AND timestamp >= CURRENT_DATE)::int AS cleared_today,
             COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'ACKNOWLEDGED'))::int AS active_db_count
      FROM event_logs
    `;
    const activeQuery = `SELECT id, alarm_key, TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp, source AS panel, message, severity, status FROM event_logs WHERE status IN ('ACTIVE', 'ACKNOWLEDGED') ORDER BY timestamp DESC`;
    const [statsRes, activeRes] = await Promise.all([db.query(statsQuery), db.query(activeQuery)]);
    res.json({ ...statsRes.rows[0], active_alarms: activeRes.rows });
  } catch (err) { res.status(500).json({ error: "Gagal mengambil statistik" }); }
});

app.get("/api/alarms/history", async (req, res) => {
  const { start, end, panel, status, page = 1, limit = 50, paginated, exportAll } = req.query;
  try {
    const conditions = []; const params = [];
    if (status && status !== "ALL") { params.push(status); conditions.push(`COALESCE(status, 'CLEARED') = $${params.length}`); }
    if (panel && panel !== "ALL") { params.push(panel); conditions.push(`source = $${params.length}`); }
    if (start && end) { params.push(`${start} 00:00:00`); params.push(`${end} 23:59:59`); conditions.push(`timestamp >= $${params.length - 1}::timestamp AND timestamp <= $${params.length}::timestamp`); }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    if (paginated === "true") {
      const pageNum = Math.max(1, parseInt(page, 10) || 1); const pageSize = Math.min(200, Math.max(10, parseInt(limit, 10) || 50));
      const [countRes, dataRes] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS total FROM event_logs ${whereClause}`, params),
        db.query(`SELECT id, alarm_key, TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp, TO_CHAR(cleared_at, 'YYYY-MM-DD HH24:MI:SS') AS cleared_at, source AS panel, message, severity, COALESCE(status, 'CLEARED') AS status FROM event_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, pageSize, (pageNum - 1) * pageSize]),
      ]);
      return res.json({ data: dataRes.rows, pagination: { totalRecords: countRes.rows[0]?.total || 0, totalPages: Math.max(1, Math.ceil((countRes.rows[0]?.total || 0) / pageSize)), currentPage: pageNum, pageSize } });
    }
    const result = await db.query(`SELECT id, alarm_key, TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp, TO_CHAR(cleared_at, 'YYYY-MM-DD HH24:MI:SS') AS cleared_at, source AS panel, message, severity, COALESCE(status, 'CLEARED') AS status FROM event_logs ${whereClause} ORDER BY timestamp DESC LIMIT 1000`, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Gagal mengambil log" }); }
});

// =======================================================
// TERKUNCI: KENDALI SCADA & ALARM ACK
// =======================================================
app.post("/api/control/write", authenticateToken, authorizeRoles('admin', 'operator', 'supervisor', 'engineer'), async (req, res) => {
  const { nodeId, value, type } = req.body;
  if (!nodeId || value === undefined || !type) return res.status(400).json({ error: "Parameter tidak lengkap!" });
  try {
    const opcModule = require("./opcClient");
    if (value === true) {
      const targetChannel = WATER_CHANNELS.find((c) => c.resetTrigger === nodeId);
      if (targetChannel) {
        const now = new Date(); const ts = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        await saveVirtualTag(targetChannel.resetTime, ts); io.emit("opc-data", { panel: "WaterFlow", tag: targetChannel.resetTime, value: ts }); await saveVirtualTag(`${targetChannel.total}_baseline`, 0);
      }
    }
    if (typeof opcModule.writeNode !== "function") return res.json({ success: true, isSimulated: true, message: "Simulasi berhasil ditulis!" });
    await opcModule.writeNode(nodeId, value, type);
    res.json({ success: true, message: "Instruksi dikirim ke PLC." });
  } catch (err) { res.status(500).json({ error: "Gagal kendali." }); }
});

app.post("/api/alarms/ack", authenticateToken, async (req, res) => {
  const { id, alarm_key } = req.body;
  try {
    if (alarm_key) {
      await db.query(`UPDATE event_logs SET status = 'ACKNOWLEDGED' WHERE alarm_key = $1 AND status = 'ACTIVE'`, [alarm_key]);
      if (activeAlarmsMemory.has(alarm_key)) activeAlarmsMemory.get(alarm_key).status = "ACKNOWLEDGED";
    } else if (id !== undefined) await db.query(`UPDATE event_logs SET status = 'ACKNOWLEDGED' WHERE id = $1`, [Number(id)]);
    originalIoEmit("alarm-sync", { type: "ACK", id, alarm_key });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Gagal Acknowledge" }); }
});

// =======================================================
// INSISIALISASI SERVER
// =======================================================
startOPC(io);
db.query("SELECT NOW()").then(async () => {
  console.log("[SYSTEM] PostgreSQL Database Connected.");
  await initAlarmSystem();
  startHistorian();
  startVirtualTagsEngine();
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, "0.0.0.0", () => { console.log(`[SERVER] API & WebSocket berjalan di port ${PORT}`); });
}).catch((err) => { console.error("[SYSTEM] Gagal connect DB", err); });