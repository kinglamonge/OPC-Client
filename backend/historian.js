const db = require("./db");
const cron = require("node-cron");

// Alokasi memori buffer lokal untuk efisiensi I/O disk database
const fastBuffer = new Map();
const shiftBuffer = new Map();
const dailyBuffer = new Map();

const FAST_INTERVAL_MS = 1000; // Resolusi perekaman analitik (2 Detik)

// ==========================================
// DAFTAR PERNYATAAN INTEGRITAS TAG MINORITAS
// ==========================================
// Tulis nama tag PERSIS seperti key di panelConfig.json
const dailyTags = ["kwh_delivered", "kvarh_delivered", "kvah_delivered"];
const shiftTags = ["input_totalizer"];

// ==========================================================
// UNIVERSAL DATA VALIDATOR & ROUTING ENGINE
// ==========================================================
function updateHistorianBuffer(panel, tag, value) {
  const isInvalid =
    value === null ||
    value === undefined ||
    value === "" ||
    Number.isNaN(parseFloat(value)) ||
    value === "NaN" ||
    value === "NULL";

  if (isInvalid) {
    // Mesin sedang mati atau sensor terputus. Kita abaikan saja secara silent.
    return;
  }

  // Jika data lolos filter (bernilai angka valid), lanjut ke routing engine
  const key = `${panel}_${tag}`;

  const isDailyData = dailyTags.includes(tag);
  const isShiftData = shiftTags.includes(tag);

  if (isShiftData) {
    shiftBuffer.set(key, { panel, tag, value: parseFloat(value) });
  } else if (isDailyData) {
    dailyBuffer.set(key, { panel, tag, value: parseFloat(value) });
  } else {
    fastBuffer.set(key, { panel, tag, value: parseFloat(value) });
  }
}

// ==========================================
// TRANSACTION CORE (FLUSH MEMORY TO HORIZONTAL POSTGRES)
// ==========================================
async function flushBufferToDatabase(bufferToFlush, bufferName) {
  if (bufferToFlush.size === 0) return;

  // 1. Ambil data saat ini, lalu segera KOSONGKAN buffer RAM.
  // Ini mencegah logging nilai usang secara berulang jika PLC tiba-tiba terputus.
  const entries = Array.from(bufferToFlush.values());
  bufferToFlush.clear(); 

  const timestamp = new Date();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // 2. Kelompokkan data memori berdasarkan Panel
    // Output: { "plc1": { "lt4200": 99.79, "lt4300": 90.04 }, "cwc": { ... } }
    const groupedData = {};
    for (const data of entries) {
      if (!groupedData[data.panel]) {
        groupedData[data.panel] = {};
      }
      groupedData[data.panel][data.tag] = data.value;
    }

    // 3. Loop setiap panel dan rakit Query dinamis format Horizontal
    for (const panel in groupedData) {
      const tagsData = groupedData[panel];
      const tagNames = Object.keys(tagsData);
      const tagValues = Object.values(tagsData);

      // Membuat nama tabel otomatis (contoh panel "PLC1" menjadi "plc1_data")
      const tableName = `${panel.toLowerCase()}_data`;

      // Sanitasi nama kolom dengan double quotes agar aman di PostgreSQL
      const columnsQuery = tagNames.map(tag => `"${tag}"`).join(", ");
      
      // $1 selalu digunakan untuk 'ts' (timestamp), parameter value dimulai dari $2
      const placeholders = tagNames.map((_, index) => `$${index + 2}`).join(", ");

      const insertQuery = `
        INSERT INTO ${tableName} (ts, ${columnsQuery})
        VALUES ($1, ${placeholders})
      `;

      // Gabungkan timestamp sebagai parameter pertama, diikuti nilai-nilai tag
      const queryParams = [timestamp, ...tagValues];
      
      await client.query(insertQuery, queryParams);
    }

    await client.query("COMMIT");
    console.log(`[Historian - ${bufferName}] Berhasil commit data ke ${Object.keys(groupedData).length} tabel panel pada ${timestamp.toLocaleTimeString()}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`[Historian - ${bufferName}] Database error, rollback dilakukan:`, error);
  } finally {
    client.release();
  }
}

// ==========================================
// CRON TIME SCHEDULER MANAGER
// ==========================================
function startHistorian() {
  console.log(`[Historian] Service SCADA Logging Engine initialized.`);
  console.log(` ├─ FAST TIER  : Setiap ${FAST_INTERVAL_MS}ms (Analitik, Waveform, & Status Digital)`);
  console.log(` ├─ SHIFT TIER : Pukul 08:00, 16:00, 00:00 (Data Akumulasi Shift)`);
  console.log(` └─ DAILY TIER : Pukul 23:59 (Totalizer Energi & Utilitas)`);

  // A. Pemicu Fast Logging (Set Interval RAM)
  setInterval(() => {
    flushBufferToDatabase(fastBuffer, "FAST");
  }, FAST_INTERVAL_MS);

  // B. Pemicu Shift Logging (Cron Job)
  cron.schedule("0 0,8,16 * * *", () => {
    console.log("[Historian] Mengunci data snapshot pergantian Shift...");
    flushBufferToDatabase(shiftBuffer, "SHIFT");
  });

  // C. Pemicu Daily Logging (Cron Job)
  cron.schedule("08 09 * * *", () => {
    console.log("[Historian] Mengunci data snapshot rekapitulasi harian...");
    flushBufferToDatabase(dailyBuffer, "DAILY");
  });
}

module.exports = {
  updateHistorianBuffer,
  startHistorian,
};