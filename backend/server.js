const { startHistorian } = require("./historian");
const db = require("./db");

const express = require("express");

const http = require("http");

const socketIo = require("socket.io");

const cors = require("cors");

const startOPC = require("./opcClient");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", () => {
  console.log("Dashboard Connected");
});

startOPC(io);

// Tes koneksi database sebelum memulai server
db.query('SELECT NOW()')
  .then(() => {
    console.log('PostgreSQL Connected');
    // Memulai service pencatatan data background
    startHistorian();
    
    // Start HTTP/Socket server
    server.listen(3001, () => {
      console.log('Backend server running on port 3001');
    });
  })
  .catch(err => {
    console.error('Failed to connect to PostgreSQL:', err);
    process.exit(1);
  });
