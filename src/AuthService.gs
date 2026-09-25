/**
 * ============================================================================
 * AUTHSERVICE.GS - Layanan Autentikasi, Hak Akses & Session
 * Aplikasi Rapor Tengah Semester MBU
 * ============================================================================
 */

const ROLES = {
  ADMIN: 'admin',
  GURU_AKADEMIK: 'guru_akademik',
  PEMBINA_KEPEMIMPINAN: 'pembina_kepemimpinan',
  PEMBINA_DINIYAH: 'pembina_diniyah',
  SANTRI: 'santri'
};

/**
 * Autentikasi Pengguna berdasarkan Username & Password
 */
function authenticateUser(username, password) {
  if (!username || !password) {
    return { success: false, message: 'Username dan password wajib diisi.' };
  }
  
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_USERS);
  const users = sheetToObjects(sheet);
  
  const user = users.find(u => 
    String(u.username).trim().toLowerCase() === String(username).trim().toLowerCase() &&
    String(u.password_hash) === String(password)
  );
  
  if (!user) {
    return { success: false, message: 'Username atau password tidak sesuai.' };
  }
  
  if (user.status !== 'aktif') {
    return { success: false, message: 'Akun Anda sedang dinonaktifkan. Hubungi Administrator.' };
  }
  
  // Buat payload session sederhana
  const sessionToken = Utilities.base64Encode(
    JSON.stringify({
      id: user.id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      role: user.role,
      loginAt: new Date().getTime()
    })
  );
  
  return {
    success: true,
    message: 'Login berhasil.',
    user: {
      id: user.id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      role: user.role
    },
    token: sessionToken
  };
}

/**
 * Validasi Hak Akses Role terhadap modul tertentu
 */
function hasPermission(userRole, moduleName) {
  if (!userRole) return false;
  if (userRole === ROLES.ADMIN) return true; // Admin punya akses penuh
  
  switch (moduleName) {
    case 'dashboard':
    case 'rapor_cetak':
      return true; // Semua role dapat melihat ringkasan dan cetak rapor
    case 'akademik':
      return userRole === ROLES.GURU_AKADEMIK;
    case 'kepemimpinan':
      return userRole === ROLES.PEMBINA_KEPEMIMPINAN;
    case 'diniyah':
      return userRole === ROLES.PEMBINA_DINIYAH;
    case 'santri_management':
    case 'cms':
      return userRole === ROLES.ADMIN;
    default:
      return false;
  }
}

/**
 * Ubah Kata Sandi Pengguna
 */
function changeUserPassword(userId, oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 5) {
    return { success: false, message: 'Kata sandi baru minimal 5 karakter.' };
  }
  
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_USERS);
  const match = findRowByField(sheet, 'id', userId);
  
  if (!match) {
    return { success: false, message: 'Pengguna tidak ditemukan.' };
  }
  
  const headers = match.headers;
  const passIdx = headers.indexOf('password_hash');
  
  if (passIdx === -1) {
    return { success: false, message: 'Kolom password tidak ditemukan.' };
  }
  
  // Validasi password lama jika bukan reset oleh admin
  const currentPass = match.values[passIdx];
  if (oldPassword && String(currentPass) !== String(oldPassword)) {
    return { success: false, message: 'Kata sandi lama tidak tepat.' };
  }
  
  sheet.getRange(match.rowIndex, passIdx + 1).setValue(newPassword);
  return { success: true, message: 'Kata sandi berhasil diperbarui.' };
}
