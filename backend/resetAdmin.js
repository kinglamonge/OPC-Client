const bcrypt = require('bcryptjs');
const db = require('./db');

async function resetAdmin() {
  try {
    console.log("[SYSTEM] Memulai proses enkripsi password...");
    
    // Mengenkripsi kata sandi 'admin123' secara native menggunakan mesin Ubuntu Anda
    const hash = await bcrypt.hash('admin123', 10);
    
    // Mengecek apakah akun admin sudah pernah dibuat di pgAdmin sebelumnya
    const result = await db.query("SELECT * FROM users WHERE username = 'admin'");
    
    if (result.rows.length === 0) {
      // Jika kosong, sistem akan membuatkan akun baru
      await db.query("INSERT INTO users (username, password_hash, role) VALUES ('admin', $1, 'admin')", [hash]);
      console.log("[SUCCESS] Akun 'admin' baru berhasil dibuat dengan password 'admin123'");
    } else {
      // Jika sudah ada tapi hash-nya rusak/salah, sistem akan menimpanya
      await db.query("UPDATE users SET password_hash = $1 WHERE username = 'admin'", [hash]);
      console.log("[SUCCESS] Password akun 'admin' eksisting berhasil direset ke 'admin123'");
    }
  } catch (err) {
    console.error("[ERROR] Terjadi kesalahan database:", err);
  } finally {
    process.exit();
  }
}

resetAdmin();