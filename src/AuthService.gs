/**
 * ============================================================================
 * AUTHSERVICE.GS - Layanan Autentikasi, Hak Akses & Session
 * Aplikasi Rapor Tengah Semester SMP Al-Imam (AI IS)
 * ============================================================================
 */

const ROLES = {
  ADMIN: 'admin',
  KEPALA_SEKOLAH: 'kepala_sekolah',
  GURU: 'guru',
  WALI_MURID: 'wali_murid'
};

/**
 * Autentikasi Pengguna berdasarkan Username / NIS & Password
 */
function authenticateUser(username, password) {
  if (!username || !password) {
    return { success: false, message: 'Username/NIS dan password wajib diisi.' };
  }
  
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_USERS);
  const users = sheetToObjects(sheet);
  
  const user = users.find(u => 
    String(u.username).trim().toLowerCase() === String(username).trim().toLowerCase() &&
    String(u.password_hash) === String(password)
  );
  
  if (!user) {
    // Cek apakah login sebagai Wali Murid menggunakan NIS
    const sheetMurid = getOrCreateSheet(DB_CONFIG.SHEET_MURID);
    const muridList = sheetToObjects(sheetMurid);
    const murid = muridList.find(m => String(m.nis).trim() === String(username).trim());
    
    if (murid && String(password) === 'wali123') {
      const sessionToken = Utilities.base64Encode(
        JSON.stringify({
          id: 'WALI-' + murid.nis,
          username: murid.nis,
          nama_lengkap: 'Wali dari ' + (murid.nama_murid || murid.nama_santri),
          role: ROLES.WALI_MURID,
          nis_murid: murid.nis,
          loginAt: new Date().getTime()
        })
      );
      
      return {
        success: true,
        message: 'Login sebagai Wali Murid berhasil.',
        user: {
          id: 'WALI-' + murid.nis,
          username: murid.nis,
          nama_lengkap: 'Wali dari ' + (murid.nama_murid || murid.nama_santri),
          role: ROLES.WALI_MURID,
          nis_murid: murid.nis
        },
        token: sessionToken
      };
    }
    
    return { success: false, message: 'Username/NIS atau password tidak sesuai.' };
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
  if (userRole === ROLES.ADMIN) return true; // Admin punya akses penuh ke semua modul
  
  switch (moduleName) {
    case 'dashboard':
    case 'rapor_cetak':
      return true; // Admin, Kepala Sekolah, Guru, Wali Murid dapat melihat ringkasan & cetak
    case 'akademik':
    case 'kepemimpinan':
    case 'diniyah':
      return userRole === ROLES.ADMIN || userRole === ROLES.GURU || userRole === ROLES.KEPALA_SEKOLAH;
    case 'murid_management':
      return userRole === ROLES.ADMIN || userRole === ROLES.GURU;
    case 'cms':
    case 'users_management':
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
