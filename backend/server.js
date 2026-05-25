const express = require("express");

const http = require("http");

const socketIo = require("socket.io");

const cors = require("cors");

const startOPC =
  require("./opcClient");

const app = express();

app.use(cors());

const server =
  http.createServer(app);

const io = socketIo(server, {

  cors:{
    origin:"*"
  }

});

io.on("connection", ()=>{

  console.log(
    "Dashboard Connected"
  );

});

startOPC(io);

server.listen(3001, "0.0.0.0", ()=>{

  console.log(
    "Realtime Server Running"
  );

});