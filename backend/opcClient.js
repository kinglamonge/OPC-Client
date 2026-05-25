const {
  OPCUAClient,
  AttributeIds,
  TimestampsToReturn,
  MessageSecurityMode,
  SecurityPolicy,
  ClientMonitoredItem,
  ClientSubscription,
} = require("node-opcua");

const config = require("./panelConfig.json");

// Impor fungsi buffer historian database
const { updateHistorianBuffer } = require('./historian');

// =====================================
// OPC SERVER CONFIGURATION
// =====================================
const endpointUrl = "opc.tcp://172.25.192.90:49320";

const client = OPCUAClient.create({
  securityMode: MessageSecurityMode.None,
  securityPolicy: SecurityPolicy.None,
  endpointMustExist: false,
  keepSessionAlive: true,
  connectionStrategy: {
    initialDelay: 1000,
    maxRetry: 999999
  }
});

// =====================================
// START OPC ROUTINE
// =====================================
async function startOPC(io) {
  try {
    console.log("=================================");
    console.log("Connecting OPC UA...");

    await client.connect(endpointUrl);
    console.log("OPC Connected");

    const session = await client.createSession({
      userName: "Administrator",
      password: "sonic125RS"
    });
    console.log("OPC Session Created");

    const subscription = ClientSubscription.create(
      session,
      {
        requestedPublishingInterval: 1000,
        requestedLifetimeCount: 100,
        requestedMaxKeepAliveCount: 10,
        maxNotificationsPerPublish: 1000,
        publishingEnabled: true,
        priority: 10
      }
    );

    subscription.on("started", () => console.log("Subscription Started"));
    subscription.on("keepalive", () => console.log("Subscription Keepalive"));
    subscription.on("terminated", () => console.log("Subscription Terminated"));

    // ================================
    // LOOP PANELS & TAGS
    // ================================
    for (const panelKey in config) {
      const panel = config[panelKey];
      console.log(`\n========== ${panel.name} ==========`);

      for (const tagKey in panel.tags) {
        try {
          const nodeId = panel.tags[tagKey];

          // Variabel mapping yang fix (menghindari Mismatch Frontend)
          const currentPanel = panelKey;
          const currentTag = tagKey;

          console.log("Monitoring:", currentPanel, currentTag);

          const monitoredItem = ClientMonitoredItem.create(
            subscription,
            { nodeId, attributeId: AttributeIds.Value },
            { samplingInterval: 1000, discardOldest: true, queueSize: 10 },
            TimestampsToReturn.Both
          );

          // ==========================
          // DATA CHANGE LISTENER
          // ==========================
          monitoredItem.on("changed", (dataValue) => {
            try {
              let value = dataValue.value.value;

              // Scaling Logic
              if (typeof value === "number") {
                if (currentTag.includes("voltage")) {
                  value = Number(value.toFixed(1));
                } else if (currentTag.includes("current") || currentTag.includes("pf") || currentTag.includes("thd")) {
                  value = Number(value.toFixed(2));
                }
              }

              // 1. Emit data ke Frontend UI (Real-time)
              io.emit("opc-data", {
                panel: currentPanel,
                tag: currentTag,
                value: value
              });

              // 2. Push data ke PostgreSQL Historian Buffer (Background)
              updateHistorianBuffer(currentPanel, currentTag, value);

              // 3. Debugging Terminal
              console.log(currentPanel, currentTag, value);

            } catch (err) {
              console.log("Changed Event Error:", currentPanel, currentTag, err.message);
            }
          });

          monitoredItem.on("err", (err) => {
            console.log("Monitor Error:", currentPanel, currentTag, err.message);
          });

        } catch (err) {
          console.log("Tag Setup Error:", panel.name, tagKey, err.message);
        }
      }
    }
    console.log("\nAll OPC Tags Monitored");

  } catch (err) {
    console.log("OPC ERROR:", err.message);
  }
}

module.exports = startOPC;