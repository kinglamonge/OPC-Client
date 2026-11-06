🌟 SASA MachEye - Machine Insight Platform

SASA MachEye adalah platform Web SCADA dan Machine Insight modern yang dikembangkan untuk PT Sasa Inti - I&C Division. Aplikasi ini dirancang untuk memantau performa mesin pabrik secara real-time, memvisualisasikan data historis, dan menyajikan metrik manajerial (OEE, Total Output, Utility, dll) melalui antarmuka pengguna kelas atas bergaya Liquid Glassmorphism 2.0.

🎯 Tujuan Proyek

Real-time Monitoring: Menggantikan panel fisik dan HMI konvensional dengan dashboard web terpusat yang dapat diakses dari mana saja di dalam jaringan pabrik.

Executive Summary: Menyediakan layar ringkasan tingkat manajerial (KPI, pencapaian target harian, dan tren mingguan) untuk mempercepat pengambilan keputusan operasional.

Data Historian & Analytics: Mencatat data counter dan sensor (seperti suhu, kecepatan mesin, status aktif) ke dalam database untuk keperluan audit dan optimalisasi (continuous improvement).

Modern UI/UX: Memberikan pengalaman pengguna yang mulus (fluid) dengan transisi sinematik, desain kaca tembus pandang (frosted glass), dan hierarki visual yang jelas agar mata operator tidak cepat lelah.

🛠️ Tech Stack

Frontend: React.js, Tailwind CSS, Framer Motion (Animasi), Recharts (Grafik Data), Lucide React (Ikon).

Backend: Node.js, Express.js.

Komunikasi Data: Socket.io (WebSockets untuk real-time ke Frontend).

Protokol Industri: OPC UA (menggunakan pustaka node-opcua).

Database: PostgreSQL (PgSQL) (Tangguh untuk menyimpan data Historian, Relasional, dan kalkulasi pergantian Shift).

⚙️ Persyaratan Sistem (Prerequisites)

Sebelum melakukan instalasi pada PC atau Server baru, pastikan perangkat lunak berikut telah terpasang:

Node.js (v16.x atau lebih baru) & npm.

Git (untuk version control).

OPC UA Server (Kepware KepServerEX, Matrikon, atau sejenisnya) yang aktif di jaringan pabrik.

PostgreSQL Server (v12 atau lebih baru) dan management tool seperti pgAdmin 4 atau DBeaver.

🚀 Panduan Setup & Instalasi (Step-by-Step)

Tahap 1: Setup OPC UA Server (Kepware/PLC)

Buka software OPC UA Server Anda.

Pastikan Endpoint URL untuk OPC UA telah aktif (Contoh: opc.tcp://localhost:49320 atau IP PLC opc.tcp://192.168.1.100:4840).

Konfigurasikan hak akses (Security Policies) ke None atau atur Username/Password sesuai kebijakan pabrik.

Pastikan Tag / Nodes mesin sudah terdaftar di struktur OPC.
(Contoh format NodeID MachEye: ns=2;s=Kelapa.Counter.Total, ns=2;s=Kelapa.Counter.CameraOK).

Tahap 2: Setup Database (PostgreSQL)

Buka terminal (menggunakan psql) atau aplikasi pgAdmin 4.

Buat database baru:

CREATE DATABASE sasa_macheye;


Hubungkan/Koneksikan ke database sasa_macheye.

Impor schema database yang ada di folder database/schema.sql (jika tersedia), atau jalankan query pembuatan tabel utama seperti shift_records, utility_logs, dan users.

Pastikan akun user (biasanya postgres) memiliki hak akses penuh (GRANT ALL PRIVILEGES) ke database tersebut.

Tahap 3: Clone Repository

Buka terminal/CMD di PC tujuan, lalu jalankan:

git clone https://github.com/username-anda/sasa-macheye.git
cd sasa-macheye


Tahap 4: Setup Backend (Node.js OPC Client & API)

Backend bertugas sebagai "jembatan" antara OPC UA Server dengan Web Frontend, sekaligus mencatat data ke Database PostgreSQL.

Masuk ke direktori backend:

cd backend


Instal dependensi:

npm install


Buat file .env di folder backend/ dan sesuaikan parameter berikut:

PORT=3001
OPC_ENDPOINT=opc.tcp://localhost:49320

# Konfigurasi PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=password_pgsql_anda
DB_NAME=sasa_macheye

JWT_SECRET=super_secret_key_sasa_2026


Jalankan server backend:

npm run start
# atau menggunakan PM2 untuk server produksi: pm2 start server.js --name "macheye-backend"


Jika sukses, akan muncul log: Connected to OPC UA Server, Connected to PostgreSQL Database, dan Socket.io listening on port 3001.

Tahap 5: Setup Frontend (React UI)

Buka terminal baru, kembali ke folder utama proyek, lalu masuk ke folder frontend:

cd frontend


Instal dependensi:

npm install


(Opsional) Jika backend tidak berjalan di localhost, sesuaikan URL Socket.io di file konfigurasi atau .env frontend.

Jalankan aplikasi frontend:

npm start


Buka browser dan akses http://localhost:3000.

Gunakan kredensial default Administrator untuk login pertama kali.

📂 Struktur Direktori Utama

SASA-MachEye/
│
├── backend/                # Server Node.js (OPC Client, API, PgSQL Connection)
│   ├── server.js           # Entry point backend & Socket.io
│   ├── opcClient.js        # Konfigurasi node-opcua
│   └── controllers/        # Logika database dan autentikasi
│
├── frontend/               # React User Interface
│   ├── public/             # Assets statis (Favicon, Background Images)
│   └── src/
│       ├── components/     # Reusable UI (Sidebar.js, Header.js, GlassCards)
│       ├── pages/          # Halaman Dashboard (Overview, LVMDP, Opening, dll)
│       ├── App.js          # Main Router & Global State (Framer Motion setup)
│       └── index.css       # Tailwind entry point
│
└── database/               # File cadangan schema PgSQL dan dummy data



🔐 Keamanan & Hak Akses (Role-Based Access)

Aplikasi ini memiliki sistem proteksi bawaan:

Admin/Manager: Dapat mengubah Target Harian, melakukan Reset Counter, dan mengakses manajemen pengguna.

Viewer/Operator: Hanya memiliki akses Read-Only ke dashboard dan grafik.
Aksi kritikal (seperti tombol Reset di Field View) tidak akan muncul untuk peran Viewer.

📜 Lisensi & Hak Cipta

Hak Cipta © 2026 PT Sasa Inti - I&C (Instrumentation & Control) SIM Division.
Platform ini adalah properti internal perusahaan. Dilarang mendistribusikan kode sumber tanpa izin tertulis dari departemen terkait.
