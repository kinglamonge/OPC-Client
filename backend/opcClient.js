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

// =====================================
// OPC SERVER
// =====================================

const endpointUrl =
  "opc.tcp://172.25.192.90:49320";

// =====================================
// OPC CLIENT
// =====================================

const client = OPCUAClient.create({

  securityMode:
    MessageSecurityMode.None,

  securityPolicy:
    SecurityPolicy.None,

  endpointMustExist:false,

  keepSessionAlive:true,

  connectionStrategy:{

    initialDelay:1000,

    maxRetry:999999

  }

});

// =====================================
// START OPC
// =====================================

async function startOPC(io){

  try{

    console.log(
      "================================="
    );

    console.log(
      "Connecting OPC UA..."
    );

    // ================================
    // CONNECT
    // ================================

    await client.connect(
      endpointUrl
    );

    console.log(
      "OPC Connected"
    );

    // ================================
    // CREATE SESSION
    // ================================

    const session =
      await client.createSession({

        userName:"Administrator",

        password:"sonic125RS"

      });

    console.log(
      "OPC Session Created"
    );

    // ================================
    // CREATE SUBSCRIPTION
    // ================================

    const subscription =
      ClientSubscription.create(

        session,

        {

          requestedPublishingInterval:1000,

          requestedLifetimeCount:100,

          requestedMaxKeepAliveCount:10,

          maxNotificationsPerPublish:1000,

          publishingEnabled:true,

          priority:10

        }

      );

    subscription.on(
      "started",
      ()=>{

        console.log(
          "Subscription Started"
        );

      }
    );

    subscription.on(
      "keepalive",
      ()=>{

        console.log(
          "Subscription Keepalive"
        );

      }
    );

    subscription.on(
      "terminated",
      ()=>{

        console.log(
          "Subscription Terminated"
        );

      }
    );

    // ================================
    // LOOP PANELS
    // ================================

    for(const panelKey in config){

      const panel =
        config[panelKey];

      console.log(
        `\n========== ${panel.name} ==========`
      );

      // ==============================
      // LOOP TAGS
      // ==============================

      for(const tagKey in panel.tags){

        try{

          const nodeId =
            panel.tags[tagKey];

          // ==========================
          // SAVE VARIABLE
          // IMPORTANT
          // ==========================

          const currentPanel =
            panel.name;

          const currentTag =
            tagKey;

          console.log(

            "Monitoring:",
            currentPanel,
            currentTag

          );

          // ==========================
          // CREATE MONITORED ITEM
          // ==========================

          const monitoredItem =
            ClientMonitoredItem.create(

              subscription,

              {

                nodeId,

                attributeId:
                  AttributeIds.Value

              },

              {

                samplingInterval:1000,

                discardOldest:true,

                queueSize:10

              },

              TimestampsToReturn.Both

            );

          // ==========================
          // DATA CHANGE
          // ==========================

          monitoredItem.on(
            "changed",
            (dataValue)=>{

              try{

                let value =
                  dataValue.value.value;

                // ====================
                // SCALING
                // ====================

                if(
                  typeof value ===
                  "number"
                ){

                  // VOLTAGE
                  if(
                    currentTag.includes(
                      "voltage"
                    )
                  ){

                    value =
                      Number(
                        value.toFixed(1)
                      );

                  }

                  // CURRENT
                  else if(
                    currentTag.includes(
                      "current"
                    )
                  ){

                    value =
                      Number(
                        value.toFixed(2)
                      );

                  }

                  // PF
                  else if(
                    currentTag.includes(
                      "pf"
                    )
                  ){

                    value =
                      Number(
                        value.toFixed(2)
                      );

                  }

                  // THD
                  else if(
                    currentTag.includes(
                      "thd"
                    )
                  ){

                    value =
                      Number(
                        value.toFixed(2)
                      );

                  }

                }

                // ====================
                // SEND TO FRONTEND
                // ====================

                io.emit(

                  "opc-data",

                  {

                    panel:
                      currentPanel,

                    tag:
                      currentTag,

                    value:
                      value

                  }

                );

                // ====================
                // DEBUG LOG
                // ====================

                console.log(

                  currentPanel,
                  currentTag,
                  value

                );

              }
              catch(err){

                console.log(

                  "Changed Event Error:",

                  currentPanel,
                  currentTag,
                  err.message

                );

              }

            }

          );

          // ==========================
          // MONITOR ERROR
          // ==========================

          monitoredItem.on(
            "err",
            (err)=>{

              console.log(

                "Monitor Error:",

                currentPanel,
                currentTag,
                err.message

              );

            }

          );

        }
        catch(err){

          console.log(

            "Tag Setup Error:",

            panel.name,
            tagKey,
            err.message

          );

        }

      }

    }

    console.log(
      "\nAll OPC Tags Monitored"
    );

  }
  catch(err){

    console.log(
      "OPC ERROR:",
      err.message
    );

  }

}

// =====================================
// EXPORT
// =====================================

module.exports = startOPC;