const db = require('./db');

const currentBuffer = new Map();
const LOGGING_INTERVAL_MS = 2000; // Interval 2 detik

function updateHistorianBuffer(panel, tag, value) {
  const key = `${panel}_${tag}`;
  currentBuffer.set(key, { panel, tag, value });
}

async function flushBufferToDatabase() {
  if (currentBuffer.size === 0) return;

  const entries = Array.from(currentBuffer.values());
  const timestamp = new Date();
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    
    const insertQuery = `
      INSERT INTO energy_historian (timestamp, panel_id, tag_name, tag_value)
      VALUES ($1, $2, $3, $4)
    `;

    for (const data of entries) {
      await client.query(insertQuery, [timestamp, data.panel, data.tag, data.value]);
    }

    await client.query('COMMIT');
    console.log(`[Historian] Logged ${entries.length} tags at ${timestamp.toLocaleTimeString()}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Historian] Database insert failed:', error);
  } finally {
    client.release();
  }
}

function startHistorian() {
  console.log(`[Historian] Service started. Interval: ${LOGGING_INTERVAL_MS}ms.`);
  setInterval(flushBufferToDatabase, LOGGING_INTERVAL_MS);
}

module.exports = {
  updateHistorianBuffer,
  startHistorian
};