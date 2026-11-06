const {
  OPCUAClient, AttributeIds, TimestampsToReturn, DataType,
  MessageSecurityMode, SecurityPolicy, 
  ClientMonitoredItem, ClientSubscription
} = require("node-opcua");

const config = require("./panelConfig.json");
const { updateHistorianBuffer } = require('./historian');

const endpointUrl = "opc.tcp://172.25.192.90:49320";

const client = OPCUAClient.create({
  securityMode: MessageSecurityMode.None,
  securityPolicy: SecurityPolicy.None,
  endpointMustExist: false,
  keepSessionAlive: true,
  connectionStrategy: { initialDelay: 1000, maxRetry: 999999 }
});

// 💡 PENTING: session OPC UA disimpan di level MODUL (bukan lokal di startOPC)
// agar bisa dipakai bersama oleh startOPC (Read/Subscribe) dan writeNode (Write ke PLC)
let opcSession = null;

// =======================================================
// CACHE UNTUK INITIAL STATE (SOLUSI UI STANDBY)
// =======================================================
const latestOpcState = {};

function formatOPCValue(tag, rawValue) {
  if (typeof rawValue === "boolean") return rawValue ? 1 : 0;
  if (typeof rawValue !== "number") return rawValue;

  const tagLower = tag.toLowerCase();
  if (tagLower.includes("totalizer") || tagLower.includes("hours")) return Math.round(rawValue);
  if (tagLower.includes("voltage") || tagLower.includes("temp") || tagLower.includes("brix")) return Number(rawValue.toFixed(1));
  return Number(rawValue.toFixed(2));
}

async function startOPC(io) {
  try {
    // 1. TANGKAP KONEKSI BROWSER BARU
    // Saat operator membuka/me-refresh web, langsung kirimkan snapshot terakhir
    io.on("connection", (socket) => {
      console.log("[WebSocket] HMI Client Terhubung. Mengirim Sinkronisasi Awal...");
      socket.emit("opc-init", latestOpcState);
    });

    console.log("[OPC UA] Menghubungkan ke Kepware Server...");
    await client.connect(endpointUrl);
    console.log("[OPC UA] Koneksi Sukses.");

    opcSession = await client.createSession({ userName: "Administrator", password: "sonic125RS" });
    console.log("[OPC UA] ✅ Session Komunikasi Aktif (Read & Write).");

    const subscription = ClientSubscription.create(opcSession, {
      requestedPublishingInterval: 1000, requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10, maxNotificationsPerPublish: 1000,
      publishingEnabled: true, priority: 10
    });

    for (const panelKey in config) {
      const panel = config[panelKey];
      latestOpcState[panelKey] = {}; // Inisialisasi struktur cache

      for (const tagKey in panel.tags) {
        try {
          const nodeId = panel.tags[tagKey];
          const currentPanel = panelKey; 
          const currentTag = tagKey;

          const monitoredItem = ClientMonitoredItem.create(
            subscription,
            { nodeId, attributeId: AttributeIds.Value },
            { samplingInterval: 1000, discardOldest: true, queueSize: 10 },
            TimestampsToReturn.Both
          );

          monitoredItem.on("changed", (dataValue) => {
            try {
              const rawValue = dataValue.value.value;
              const finalValue = formatOPCValue(currentTag, rawValue);

              // 2. SIMPAN KE CACHE GLOBAL
              latestOpcState[currentPanel][currentTag] = finalValue; 

              // 3. KIRIM DATA REAL-TIME
              io.emit("opc-data", { panel: currentPanel, tag: currentTag, value: finalValue });
              updateHistorianBuffer(currentPanel, currentTag, finalValue);
              
            } catch (err) {}
          });
        } catch (err) {
          console.log(`[OPC UA] Gagal Subskripsi: ${panelKey}.${tagKey}`);
        }
      }
    }
  } catch (err) {
    console.log(`[OPC UA] ERROR KONEKSI: ${err.message}`);
  }
}

/**
 * FUNGSI BARU: Eksekutor Penulisan Data (Write) ke PLC
 * Dipanggil dari route/handler saat operator menekan tombol di HMI
 * (start/stop, set point, dsb).
 */
async function writeNode(nodeId, value, type) {
  // Proteksi jika request masuk sebelum koneksi OPC UA siap
  if (!opcSession) {
    throw new Error("Koneksi OPC UA Session belum siap atau terputus!");
  }

  let dataType;
  let preparedValue = value;

  // Pemetaan tipe data node-opcua untuk register PLC Siemens S7
  if (type === "Boolean") {
    dataType = DataType.Boolean;
    preparedValue = !!value; // Pastikan murni true/false
  } else if (type === "Float" || type === "Real") {
    dataType = DataType.Float; // REAL Siemens = Float 32-bit
    preparedValue = parseFloat(value);
  } else if (type === "Int" || type === "Int16") {
    dataType = DataType.Int16;
    preparedValue = parseInt(value);
  } else {
    dataType = DataType.Float;
    preparedValue = parseFloat(value);
  }

  const nodeToWrite = {
    nodeId: nodeId,
    attributeId: AttributeIds.Value,
    value: {
      value: {
        dataType: dataType,
        value: preparedValue
      }
    }
  };

  console.log(`[OPC UA WRITE] Membidik NodeID: ${nodeId} | Nilai: ${preparedValue} (${type})`);

  const statusCode = await opcSession.write(nodeToWrite);

  // Validasi balik dari PLC
  if (statusCode.isNotGood()) {
    throw new Error(`PLC Menolak Penulisan Data! Status: ${statusCode.toString()}`);
  }
  return statusCode;
}

// =======================================================
// 🛠️ STRATEGI EXPORT DUAL-MODE
// startOPC tetap dipanggil sebagai fungsi seperti biasa di server.js,
// namun kini juga membawa sub-fungsi .writeNode untuk menulis ke PLC.
//   const startOPC = require('./opcClient');
//   startOPC(io);                         // jalankan seperti biasa
//   startOPC.writeNode(nodeId, val, type); // panggil untuk menulis ke PLC
// =======================================================
startOPC.writeNode = writeNode;

module.exports = startOPC;