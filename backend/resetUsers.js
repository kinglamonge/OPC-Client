const bcrypt = require('bcryptjs');
const db = require('./db');

async function resetUsers() {
  try {
    console.log("[SYSTEM] Memulai sinkronisasi kredensial...");
    
    // Enkripsi kata sandi menggunakan engine lokal Ubuntu
    const hash = await bcrypt.hash('admin123', 10);
    
    const users = [
        { username: 'operator', role: 'operator' },
        { username: 'manager', role: 'viewer' }
    ];

    for (let u of users) {
        const result = await db.query("SELECT * FROM users WHERE username = $1", [u.username]);
        
        if (result.rows.length === 0) {
            // Jika akun belum masuk ke database sama sekali
            await db.query("INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)", [u.username, hash, u.role]);
            console.log(`[SUCCESS] Akun '${u.username}' berhasil DIBUAT (Password: admin123)`);
        } else {
            // Jika akun sudah ada tapi hash-nya rusak/salah
            await db.query("UPDATE users SET password_hash = $1 WHERE username = $2", [hash, u.username]);
            console.log(`[SUCCESS] Password akun '${u.username}' berhasil DIRESET ke 'admin123'`);
        }
    }
  } catch (err) {
    console.error("[ERROR] Terjadi kesalahan:", err);
  } finally {
    process.exit();
  }
}

resetUsers();