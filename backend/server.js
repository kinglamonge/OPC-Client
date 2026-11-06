const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const db = require("./db");
const { startHistorian } = require("./historian");
const startOPC = require("./opcClient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cron = require("node-cron"); // Modul untuk reset jam 06:00 pagi

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
  // Kita TIDAK LAGI melakukan looping data (spam emit) di sini agar grafik Recharts tidak macet (overload)!
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
        condition: (panelData) =>
          Number(panelData["evap_prod_step"] ?? 1) === 140,
        msg: (_label, val) =>
          `BRIX Evaporator Rendah saat Produksi (${val}%) — Batas Min 60%`,
      },
      {
        type: "HIGH",
        limit: 64,
        severity: "warning",
        ignoreZero: true,
        condition: (panelData) =>
          Number(panelData["evap_prod_step"] ?? 1) === 140,
        msg: (_label, val) =>
          `BRIX Evaporator Tinggi saat Produksi (${val}%) — Batas Max 64%`,
      },
    ],
  },
];

// 🔬 Definisi Channel WaterFlow untuk Kalkulasi Harian
const WATER_CHANNELS = [
  {
    total: "ft_opening_total",
    today: "ft_opening_today",
    yesterday: "ft_opening_yesterday",
    resetTime: "ft_opening_last_reset",
    resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH1",
  },
  {
    total: "ft_dc_total",
    today: "ft_dc_today",
    yesterday: "ft_dc_yesterday",
    resetTime: "ft_dc_last_reset",
    resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH2",
  },
  {
    total: "ft_cwc_total",
    today: "ft_cwc_today",
    yesterday: "ft_cwc_yesterday",
    resetTime: "ft_cwc_last_reset",
    resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH3",
  },
  {
    total: "ft_aseptic_total",
    today: "ft_aseptic_today",
    yesterday: "ft_aseptic_yesterday",
    resetTime: "ft_aseptic_last_reset",
    resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH4",
  },
  {
    total: "ft_afm_total",
    today: "ft_afm_today",
    yesterday: "ft_afm_yesterday",
    resetTime: "ft_afm_last_reset",
    resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH5",
  },
  {
    total: "ft_biogas_total",
    today: "ft_biogas_today",
    yesterday: "ft_biogas_yesterday",
    resetTime: "ft_biogas_last_reset",
    resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH6",
  },
  {
    total: "ft_spare1_total",
    today: "ft_spare1_today",
    yesterday: "ft_spare1_yesterday",
    resetTime: "ft_spare1_last_reset",
    resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH7",
  },
  {
    total: "ft_spare2_total",
    today: "ft_spare2_today",
    yesterday: "ft_spare2_yesterday",
    resetTime: "ft_spare2_last_reset",
    resetTrigger: "ns=2;s=Water Totalizer.Reset Button.CH8",
  },
];

// Cache state OPC UA & Memori Alarm Aktif di Server
const backendOpcState = {};
const activeAlarmsMemory = new Map();
const alarmLockSet = new Set();
const virtualTagsMemory = {};

// =======================================================
// 2. AUTO-MIGRATION, INDEXING & INISIALISASI MEMORI ALARM
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
      ALTER TABLE event_logs 
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS alarm_key VARCHAR(120),
      ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMP;
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp ON event_logs (timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_event_logs_status ON event_logs (status);
      CREATE INDEX IF NOT EXISTS idx_event_logs_source ON event_logs (source);
    `);

    const res = await db.query(`
      SELECT 
        id, 
        alarm_key, 
        source AS panel, 
        message, 
        severity, 
        status,
        TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp
      FROM event_logs 
      WHERE status IN ('ACTIVE', 'ACKNOWLEDGED') AND alarm_key IS NOT NULL
      ORDER BY timestamp DESC
    `);

    activeAlarmsMemory.clear();
    for (const row of res.rows) {
      if (!activeAlarmsMemory.has(row.alarm_key)) {
        activeAlarmsMemory.set(row.alarm_key, row);
      }
    }

    console.log(
      `[ALARM ENGINE] Skema & Index terverifikasi. ${activeAlarmsMemory.size} alarm aktif dipulihkan dari PostgreSQL.`,
    );

    await db.query(`
      CREATE TABLE IF NOT EXISTS virtual_tags (
        tag_key VARCHAR(100) PRIMARY KEY,
        tag_value VARCHAR(255),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    const vTags = await db.query(`SELECT tag_key, tag_value FROM virtual_tags`);
    vTags.rows.forEach((row) => {
      virtualTagsMemory[row.tag_key] = row.tag_value;
    });
    console.log(
      `[SYSTEM] Berhasil memuat ${vTags.rows.length} virtual tags ke memori.`,
    );
  } catch (err) {
    console.error(
      "[ALARM ENGINE] Gagal inisialisasi tabel event_logs:",
      err.message,
    );
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
    console.error(
      `[DB ERROR] Gagal menyimpan virtual tag ${key}:`,
      err.message,
    );
  }
}

async function recordAlarmTrigger(alarmKey, panel, message, severity) {
  if (activeAlarmsMemory.has(alarmKey) || alarmLockSet.has(alarmKey)) {
    return activeAlarmsMemory.get(alarmKey);
  }

  alarmLockSet.add(alarmKey);
  try {
    const existing = await db.query(
      `SELECT id, alarm_key, source AS panel, message, severity, status,
              TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp
       FROM event_logs 
       WHERE alarm_key = $1 AND status IN ('ACTIVE', 'ACKNOWLEDGED') 
       ORDER BY timestamp DESC LIMIT 1`,
      [alarmKey],
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      activeAlarmsMemory.set(alarmKey, row);
      return row;
    }

    const insertRes = await db.query(
      `INSERT INTO event_logs (alarm_key, source, message, severity, status, timestamp)
       VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())
       RETURNING id, alarm_key, source AS panel, message, severity, status,
                 TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp`,
      [alarmKey, panel, message, severity],
    );

    const newRow = insertRes.rows[0];
    activeAlarmsMemory.set(alarmKey, newRow);
    console.log(`[ALARM TRIGGERED] ${panel} | ${message}`);

    originalIoEmit("alarm-sync", { type: "TRIGGER", alarm: newRow });
    return newRow;
  } catch (err) {
    console.error("[ALARM ENGINE] Gagal INSERT alarm:", err.message);
    return null;
  } finally {
    alarmLockSet.delete(alarmKey);
  }
}

async function recordAlarmClear(alarmKey, clearMessage) {
  if (
    !activeAlarmsMemory.has(alarmKey) ||
    alarmLockSet.has(`clear_${alarmKey}`)
  ) {
    return;
  }

  alarmLockSet.add(`clear_${alarmKey}`);
  try {
    const activeItem = activeAlarmsMemory.get(alarmKey);
    const finalMsg = clearMessage || activeItem.message;

    await db.query(
      `UPDATE event_logs 
       SET status = 'CLEARED', cleared_at = NOW(), message = $2
       WHERE alarm_key = $1 AND status IN ('ACTIVE', 'ACKNOWLEDGED')`,
      [alarmKey, finalMsg],
    );

    activeAlarmsMemory.delete(alarmKey);
    console.log(`[ALARM CLEARED] ${alarmKey} -> NORMAL`);

    originalIoEmit("alarm-sync", { type: "CLEAR", alarm_key: alarmKey });
  } catch (err) {
    console.error("[ALARM ENGINE] Gagal UPDATE clear alarm:", err.message);
  } finally {
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
            const activeItem = activeAlarmsMemory.get(alarmKey);
            recordAlarmClear(
              alarmKey,
              `${activeItem.message} (NORMAL - Mode Non-Produksi)`,
            );
          }
          return;
        }

        let isTriggered = false;
        if (rule.type === "HIGH" && val > rule.limit) isTriggered = true;
        if (rule.type === "LOW" && val < rule.limit) isTriggered = true;

        const message = rule.msg(label, val);

        if (isTriggered) {
          if (!activeAlarmsMemory.has(alarmKey)) {
            recordAlarmTrigger(alarmKey, config.panel, message, rule.severity);
          } else {
            const current = activeAlarmsMemory.get(alarmKey);
            if (current && current.message !== message) {
              current.message = message;
              activeAlarmsMemory.set(alarmKey, current);
            }
          }
        } else if (!isTriggered && activeAlarmsMemory.has(alarmKey)) {
          const activeItem = activeAlarmsMemory.get(alarmKey);
          recordAlarmClear(alarmKey, activeItem.message);
        }
      });
    });
  });
}

// 🔬 ENGINE KALKULASI HARIAN WATERFLOW (INDEPENDENT LOOP)
function startVirtualTagsEngine() {
  setInterval(() => {
    if (!backendOpcState["WaterFlow"]) backendOpcState["WaterFlow"] = {};

    WATER_CHANNELS.forEach((ch) => {
      const currentTotal =
        parseFloat(backendOpcState["WaterFlow"][ch.total]) || 0;
      const baselineKey = `${ch.total}_baseline`;
      let baselineAt6AM = parseFloat(virtualTagsMemory[baselineKey]) || 0;

      if (currentTotal < baselineAt6AM) {
        baselineAt6AM = 0;
        saveVirtualTag(baselineKey, 0);
      }

      const todayUsage = currentTotal - baselineAt6AM;
      const yesterdayVal = virtualTagsMemory[ch.yesterday] || 0;
      const resetTimeVal =
        virtualTagsMemory[ch.resetTime] || "--/--/---- --:--";

      backendOpcState["WaterFlow"][ch.today] = todayUsage;
      backendOpcState["WaterFlow"][ch.yesterday] = yesterdayVal;
      backendOpcState["WaterFlow"][ch.resetTime] = resetTimeVal;

      originalIoEmit("opc-data", {
        panel: "WaterFlow",
        tag: ch.today,
        value: todayUsage,
      });
      originalIoEmit("opc-data", {
        panel: "WaterFlow",
        tag: ch.yesterday,
        value: yesterdayVal,
      });
      originalIoEmit("opc-data", {
        panel: "WaterFlow",
        tag: ch.resetTime,
        value: resetTimeVal,
      });
    });
  }, 2000);
}

const originalIoEmit = io.emit.bind(io);
io.emit = function (event, payload, ...args) {
  if (
    event === "opc-data" &&
    payload &&
    payload.panel &&
    payload.tag !== undefined
  ) {
    if (!backendOpcState[payload.panel]) {
      backendOpcState[payload.panel] = {};
    }
    backendOpcState[payload.panel][payload.tag] = payload.value;
    evaluatePanelAlarms(payload.panel);
  }
  return originalIoEmit(event, payload, ...args);
};

// =======================================================
// 4. CRON JOB: ROLLOVER JAM 06:00 PAGI
// =======================================================
cron.schedule("0 6 * * *", async () => {
  console.log("[WATER LOG] Memulai Rollover Harian (06:00 AM)...");

  for (const ch of WATER_CHANNELS) {
    const currentTotal =
      parseFloat(backendOpcState["WaterFlow"]?.[ch.total]) || 0;
    const baselineKey = `${ch.total}_baseline`;
    const baselineAt6AM = parseFloat(virtualTagsMemory[baselineKey]) || 0;
    const yesterdayUsage = currentTotal - baselineAt6AM;

    await saveVirtualTag(ch.yesterday, yesterdayUsage);
    await saveVirtualTag(baselineKey, currentTotal);

    io.emit("opc-data", {
      panel: "WaterFlow",
      tag: ch.yesterday,
      value: yesterdayUsage,
    });
    io.emit("opc-data", { panel: "WaterFlow", tag: ch.today, value: 0 });
  }
});

// =======================================================
// MIDDLEWARE: PROTEKSI TOKEN JWT & BLACKLIST (KICK USER)
// =======================================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res
      .status(401)
      .json({ error: "Akses Ditolak. Token tidak ditemukan." });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err)
      return res
        .status(403)
        .json({ error: "Sesi tidak valid atau telah kedaluwarsa." });
        
    // 🔬 PERBAIKAN: Tolak akses jika username ada dalam daftar blacklist (di-kick Admin)
    if (blacklistedUsers.has(user.username)) {
      return res.status(401).json({ error: "Sesi Anda telah dihentikan oleh Administrator. Silakan login kembali." });
    }

    req.user = user;
    next();
  });
};

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Akses ditolak. Fitur ini hanya untuk Administrator." });
  }
  next();
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Akses ditolak. Fitur ini hanya untuk role: ${allowedRoles.join(', ')}.` 
      });
    }
    next();
  };
};

// =======================================================
// REST API ENDPOINT: AUTENTIKASI LOGIN & ADMIN
// =======================================================
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (result.rows.length === 0)
      return res.status(401).json({ error: "Username tidak terdaftar." });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword)
      return res.status(401).json({ error: "Password salah." });

    // Jika user sebelumnya di-blacklist, hapus dari blacklist saat mereka login dengan sukses
    if (blacklistedUsers.has(user.username)) {
      blacklistedUsers.delete(user.username);
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      SECRET_KEY,
      { expiresIn: "12h" },
    );

    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (ip && ip.substr(0, 7) === "::ffff:") ip = ip.substr(7);

    await db.query(
      "INSERT INTO login_history (username, ip_address, role) VALUES ($1, $2, $3)",
      [user.username, ip, user.role],
    );

    res.json({
      success: true,
      token,
      role: user.role,
      username: user.username,
    });
  } catch (err) {
    res.status(500).json({ error: "Terjadi kesalahan pada server database." });
  }
});

app.get("/api/admin/sessions", authenticateToken, async (req, res) => {
  try {
    const query =
      "SELECT * FROM login_history ORDER BY login_time DESC LIMIT 100";
    const result = await db.query(query);
    const formatted = result.rows.map((row) => ({
      ...row,
      login_time: new Date(row.login_time).toLocaleString("id-ID"),
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "Gagal menarik data sesi." });
  }
});

// =======================================================
// REST API ENDPOINT: MANAJEMEN USER (KHUSUS ADMIN)
// =======================================================

// 1. GET Semua Users
app.get(
  "/api/admin/users",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const result = await db.query(
        "SELECT id, username, role, created_at FROM users ORDER BY id ASC",
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Gagal menarik data user." });
    }
  },
);

// 2. CREATE User Baru
app.post(
  "/api/admin/users",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: "Data tidak lengkap." });
    }

    try {
      const userExist = await db.query(
        "SELECT id FROM users WHERE username = $1",
        [username],
      );
      if (userExist.rows.length > 0)
        return res.status(400).json({ error: "Username sudah digunakan." });

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)",
        [username, hashedPassword, role],
      );
      res.json({ success: true, message: "User berhasil ditambahkan." });
    } catch (err) {
      res.status(500).json({ error: "Gagal menambahkan user." });
    }
  },
);

// 3. UPDATE User (Role / Password)
app.put(
  "/api/admin/users/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { role, password } = req.body;

    try {
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
          "UPDATE users SET role = $1, password_hash = $2 WHERE id = $3",
          [role, hashedPassword, id],
        );
      } else {
        await db.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
      }
      res.json({ success: true, message: "Data user berhasil diperbarui." });
    } catch (err) {
      res.status(500).json({ error: "Gagal memperbarui user." });
    }
  },
);

// 4. DELETE User
app.delete(
  "/api/admin/users/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    const { id } = req.params;
    try {
      if (req.user.id == id) {
        return res
          .status(400)
          .json({
            error:
              "Anda tidak bisa menghapus akun Anda sendiri saat sedang login.",
          });
      }

      await db.query("DELETE FROM users WHERE id = $1", [id]);
      res.json({ success: true, message: "User berhasil dihapus." });
    } catch (err) {
      res.status(500).json({ error: "Gagal menghapus user." });
    }
  },
);

// 5. 🔥 FITUR BARU: Kick User (Force Logout)
app.post("/api/admin/users/kick", authenticateToken, authorizeAdmin, (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: "Username wajib diisi." });
  }

  // Cegah Admin menendang dirinya sendiri
  if (req.user.username === username) {
     return res.status(400).json({ error: "Anda tidak bisa menghentikan sesi Anda sendiri." });
  }

  // Masukkan username ke Blacklist agar akses REST API-nya ditolak
  blacklistedUsers.add(username);

  // Hapus dari blacklist setelah 12 jam (sesuai masa berlaku JWT token)
  setTimeout(() => {
    blacklistedUsers.delete(username);
  }, 12 * 60 * 60 * 1000);

  // Tembakkan sinyal WebSocket ke SEMUA klien agar frontend user tersebut langsung ter-logout
  io.emit("force-logout", { username });

  res.json({ success: true, message: `Sesi pengguna [${username}] berhasil dihentikan paksa.` });
});

// =======================================================
// REST API ENDPOINT: HISTORIAN DATA RECHARTS
// =======================================================
app.get("/api/history", async (req, res) => {
  const { panel, tag, limit = 60 } = req.query;

  if (!panel || !tag) {
    return res
      .status(400)
      .json({ error: "Parameter panel dan tag wajib diisi" });
  }

  try {
    const tableName = `${panel.toLowerCase()}_data`;
    const query = `
      SELECT ts AS timestamp, "${tag}" AS value
      FROM ${tableName}
      WHERE "${tag}" IS NOT NULL
      ORDER BY ts DESC 
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);

    const formattedData = result.rows.map((row) => ({
      time: new Date(row.timestamp).toLocaleTimeString("id-ID", {
        hour12: false,
      }),
      value: row.value,
    }));

    res.json(formattedData.reverse());
  } catch (err) {
    console.error("Gagal mengambil data history:", err);
    res.status(500).json({ error: "Gagal mengambil data dari database" });
  }
});

// 🔬 PERBAIKAN: Endpoint History Range dengan Casting Timezone dan Limit 3000
app.get("/api/history/range", async (req, res) => {
  const { panel, tag, start, end } = req.query;
  
  if (!panel || !tag || !start || !end) {
    return res.status(400).json({ error: "Parameter wajib diisi" });
  }
  
  try {
    const tableName = `${panel.toLowerCase()}_data`;
    
    const query = `
      SELECT 
        ts AS timestamp, 
        "${tag}" AS value
      FROM ${tableName} 
      WHERE ts >= $1::timestamptz AND ts <= $2::timestamptz 
        AND "${tag}" IS NOT NULL
      ORDER BY ts ASC
      LIMIT 3000
    `;
    
    const result = await db.query(query, [start, end]);
    console.log(`[HISTORY QUERY] ${tableName} | Tag: ${tag} | Ditemukan: ${result.rows.length} baris.`);
    
    res.json(result.rows);
  } catch (err) {
    console.error(`[DB ERROR] Gagal query history range (${panel}_${tag}):`, err.message);
    res.status(500).json({ error: "Gagal mengambil data historis dari database." });
  }
});

// =======================================================
// REST API ENDPOINT: ALARM LIFECYCLE, STATS & PAGINATION
// =======================================================
app.get("/api/events", async (req, res) => {
  try {
    const query = "SELECT * FROM event_logs ORDER BY timestamp DESC LIMIT 100";
    const result = await db.query(query);
    const formattedLogs = result.rows.map((row) => ({
      id: row.id,
      time: new Date(row.timestamp).toLocaleTimeString("id-ID", {
        hour12: false,
      }),
      severity: row.severity,
      source: row.source,
      message: row.message,
    }));
    res.json(formattedLogs);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil log dari database" });
  }
});

app.post("/api/events", async (req, res) => {
  const { severity, source, message } = req.body;
  try {
    const query =
      "INSERT INTO event_logs (severity, source, message, status, timestamp) VALUES ($1, $2, $3, 'ACTIVE', NOW())";
    await db.query(query, [severity, source, message]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal menyimpan log ke database" });
  }
});

app.post("/api/alarms/trigger", async (req, res) => {
  const { alarm_key, panel, message, severity } = req.body;
  if (!alarm_key || !panel) {
    return res.status(400).json({ error: "alarm_key dan panel wajib diisi" });
  }
  try {
    const row = await recordAlarmTrigger(
      alarm_key,
      panel,
      message,
      severity || "warning",
    );
    res.json({ success: true, id: row?.id, alarm: row });
  } catch (err) {
    res.status(500).json({ error: "Gagal menyimpan alarm aktif" });
  }
});

app.post("/api/alarms/clear", async (req, res) => {
  const { alarm_key, message } = req.body;
  if (!alarm_key) {
    return res.status(400).json({ error: "alarm_key wajib diisi" });
  }
  try {
    await recordAlarmClear(alarm_key, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengupdate status CLEARED" });
  }
});

app.get("/api/alarms/stats", async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*)::int AS total_events,
        COUNT(*) FILTER (WHERE timestamp >= CURRENT_DATE)::int AS today_events,
        COUNT(*) FILTER (WHERE COALESCE(status, 'CLEARED') = 'CLEARED')::int AS cleared_total,
        COUNT(*) FILTER (WHERE COALESCE(status, 'CLEARED') = 'CLEARED' AND timestamp >= CURRENT_DATE)::int AS cleared_today,
        COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'ACKNOWLEDGED'))::int AS active_db_count
      FROM event_logs
    `;

    const activeQuery = `
      SELECT 
        id, 
        alarm_key,
        TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp, 
        source AS panel, 
        message, 
        severity, 
        status 
      FROM event_logs
      WHERE status IN ('ACTIVE', 'ACKNOWLEDGED')
      ORDER BY timestamp DESC
    `;

    const [statsRes, activeRes] = await Promise.all([
      db.query(statsQuery),
      db.query(activeQuery),
    ]);

    const summary = statsRes.rows[0] || {
      total_events: 0,
      today_events: 0,
      cleared_total: 0,
      cleared_today: 0,
      active_db_count: 0,
    };

    res.json({
      ...summary,
      active_alarms: activeRes.rows,
    });
  } catch (err) {
    console.error("Gagal mengambil statistik alarm:", err);
    res
      .status(500)
      .json({ error: "Gagal mengambil statistik alarm dari database" });
  }
});

app.get("/api/alarms/history", async (req, res) => {
  const {
    start,
    end,
    panel,
    status,
    page = 1,
    limit = 50,
    paginated,
    exportAll,
  } = req.query;

  try {
    const conditions = [];
    const params = [];

    if (status && status !== "ALL") {
      params.push(status);
      conditions.push(`COALESCE(status, 'CLEARED') = $${params.length}`);
    }

    if (panel && panel !== "ALL") {
      params.push(panel);
      conditions.push(`source = $${params.length}`);
    }

    if (start && end) {
      params.push(`${start} 00:00:00`);
      const startIdx = params.length;
      params.push(`${end} 23:59:59`);
      const endIdx = params.length;
      conditions.push(
        `timestamp >= $${startIdx}::timestamp AND timestamp <= $${endIdx}::timestamp`,
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    if (exportAll === "true") {
      const exportQuery = `
        SELECT 
          id, 
          alarm_key,
          TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp, 
          TO_CHAR(cleared_at, 'YYYY-MM-DD HH24:MI:SS') AS cleared_at,
          source AS panel, 
          message, 
          severity, 
          COALESCE(status, 'CLEARED') AS status 
        FROM event_logs
        ${whereClause}
        ORDER BY timestamp DESC
      `;
      const result = await db.query(exportQuery, params);
      return res.json(result.rows);
    }

    if (paginated === "true") {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.min(200, Math.max(10, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * pageSize;

      const countQuery = `SELECT COUNT(*)::int AS total FROM event_logs ${whereClause}`;
      const dataQuery = `
        SELECT 
          id, 
          alarm_key,
          TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp, 
          TO_CHAR(cleared_at, 'YYYY-MM-DD HH24:MI:SS') AS cleared_at,
          source AS panel, 
          message, 
          severity, 
          COALESCE(status, 'CLEARED') AS status 
        FROM event_logs
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      const [countRes, dataRes] = await Promise.all([
        db.query(countQuery, params),
        db.query(dataQuery, [...params, pageSize, offset]),
      ]);

      const totalRecords = countRes.rows[0]?.total || 0;
      const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

      return res.json({
        data: dataRes.rows,
        pagination: {
          totalRecords,
          totalPages,
          currentPage: pageNum,
          pageSize,
        },
      });
    }

    const fallbackQuery = `
      SELECT 
        id, 
        alarm_key,
        TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp, 
        TO_CHAR(cleared_at, 'YYYY-MM-DD HH24:MI:SS') AS cleared_at,
        source AS panel, 
        message, 
        severity, 
        COALESCE(status, 'CLEARED') AS status 
      FROM event_logs
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT 1000
    `;
    const result = await db.query(fallbackQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Gagal mengambil log alarm:", err);
    res.status(500).json({ error: "Gagal mengambil log alarm" });
  }
});

// =======================================================
// TERKUNCI (BUTUH TOKEN): KENDALI SCADA & ALARM ACK
// =======================================================
// 🔬 PERBAIKAN: Tambahkan authorizeRoles('admin', 'operator') pada endpoint write
app.post("/api/control/write", authenticateToken, authorizeRoles('admin', 'operator', 'supervisor', 'engineer'), async (req, res) => {
  const { nodeId, value, type } = req.body;

  if (!nodeId || value === undefined || !type) {
    return res.status(400).json({ error: "Parameter tidak lengkap!" });
  }
  try {
    const opcModule = require("./opcClient");

    if (value === true) {
      const targetChannel = WATER_CHANNELS.find(
        (c) => c.resetTrigger === nodeId,
      );
      if (targetChannel) {
        const now = new Date();
        const timestampFormat = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        await saveVirtualTag(targetChannel.resetTime, timestampFormat);
        io.emit("opc-data", {
          panel: "WaterFlow",
          tag: targetChannel.resetTime,
          value: timestampFormat,
        });
        await saveVirtualTag(`${targetChannel.total}_baseline`, 0);
        console.log(
          `[WATER LOG] Totalizer ${targetChannel.total} di-reset oleh ${req.user.username} pada ${timestampFormat}`,
        );
      }
    }

    if (typeof opcModule.writeNode !== "function") {
      console.log(
        `[SIMULASI WRITE] User: ${req.user.username} | Node: ${nodeId} | Val: ${value}`,
      );
      return res.json({
        success: true,
        isSimulated: true,
        message: "Koneksi simulasi berhasil ditulis!",
      });
    }
    await opcModule.writeNode(nodeId, value, type);
    console.log(
      `[SCADA CONTROL] ${req.user.username} menulis ke PLC -> NodeID: ${nodeId}, Val: ${value}`,
    );
    res.json({ success: true, message: "Instruksi berhasil dikirim ke PLC." });
  } catch (err) {
    console.error("[SCADA ERROR]", err);
    res.status(500).json({ error: "Gagal memproses instruksi kendali." });
  }
});

app.post("/api/alarms/ack", authenticateToken, async (req, res) => {
  const { id, alarm_key } = req.body;
  try {
    if (alarm_key) {
      await db.query(
        `UPDATE event_logs SET status = 'ACKNOWLEDGED' WHERE alarm_key = $1 AND status = 'ACTIVE'`,
        [alarm_key],
      );
      if (activeAlarmsMemory.has(alarm_key)) {
        const memItem = activeAlarmsMemory.get(alarm_key);
        memItem.status = "ACKNOWLEDGED";
        activeAlarmsMemory.set(alarm_key, memItem);
      }
    } else if (id !== undefined && !Number.isNaN(Number(id))) {
      await db.query(
        `UPDATE event_logs SET status = 'ACKNOWLEDGED' WHERE id = $1`,
        [Number(id)],
      );
    }

    originalIoEmit("alarm-sync", { type: "ACK", id, alarm_key });
    res.json({
      success: true,
      message: `Alarm di-acknowledge oleh ${req.user.username}.`,
    });
  } catch (err) {
    console.error("Gagal update status Acknowledge:", err);
    res.status(500).json({ error: "Gagal update status Acknowledge" });
  }
});

// =======================================================
// INSISIALISASI SERVER
// =======================================================
startOPC(io);

db.query("SELECT NOW()")
  .then(async () => {
    console.log("[SYSTEM] PostgreSQL Database Connected Successfully.");
    await initAlarmSystem();
    startHistorian();
    startVirtualTagsEngine();

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] API & WebSocket berjalan di port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[SYSTEM] Gagal connect ke PostgreSQL Database", err);
  });