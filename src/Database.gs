/**
 * ============================================================================
 * DATABASE.GS - Model & Layer Akses Data Google Sheets
 * Aplikasi Rapor Tengah Semester SMP Al-Imam (AI IS) (MVC Architecture)
 * ============================================================================
 */

const DB_CONFIG = {
  SHEET_SETTINGS: 'Settings_CMS',
  SHEET_USERS: 'Users',
  SHEET_SANTRI: 'Santri',
  SHEET_AKADEMIK: 'Nilai_Akademik',
  SHEET_KEPEMIMPINAN: 'Nilai_Kepemimpinan',
  SHEET_DINIYAH: 'Nilai_Diniyah'
};

/**
 * Mendapatkan referensi Spreadsheet aktif.
 * Jika script di-bind dengan sheet, otomatis menggunakan getActiveSpreadsheet().
 * Jika script standalone, bisa menggunakan SCRIPT_PROP atau ID sheet.
 */
function getDb() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {
    // Fallback if accessed without active sheet context
  }
  
  const prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (prop) {
    return SpreadsheetApp.openById(prop);
  }
  
  // Jika belum ada ID, buat spreadsheet baru atau throw info
  throw new Error('Spreadsheet belum terhubung. Pastikan script terikat dengan Google Sheets atau set Script Property SPREADSHEET_ID.');
}

/**
 * Mengambil atau membuat sheet jika belum tersedia
 */
function getOrCreateSheet(sheetName, headers = []) {
  const ss = getDb();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      
      // Styling header sheet
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#1e293b')
                 .setFontColor('#ffffff')
                 .setFontWeight('bold')
                 .setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * Helper: Mengubah data sheet menjadi array of object JSON
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1);
  
  return rows.map((row, rowIndex) => {
    const obj = { _rowNumber: rowIndex + 2 };
    headers.forEach((header, colIndex) => {
      let val = row[colIndex];
      // Format tanggal menjadi ISO string jika Date object
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
      }
      obj[header] = val !== undefined ? val : '';
    });
    return obj;
  });
}

/**
 * Helper: Mengambil baris berdasarkan kolom kunci
 */
function findRowByField(sheet, fieldName, fieldValue) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;
  
  const headers = data[0].map(h => String(h).trim());
  const colIndex = headers.indexOf(fieldName);
  if (colIndex === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(fieldValue)) {
      return {
        rowIndex: i + 1,
        headers: headers,
        values: data[i]
      };
    }
  }
  return null;
}

/**
 * ============================================================================
 * INISIALISASI DATABASE & SEEDING DATA OTOMATIS
 * ============================================================================
 */
function initDatabase() {
  const ss = getDb();
  
  // 1. Skema Settings_CMS
  const sheetSettings = getOrCreateSheet(DB_CONFIG.SHEET_SETTINGS, ['key', 'value', 'category', 'description']);
  if (sheetSettings.getLastRow() <= 1) {
    const defaultSettings = [
      ['school_name', 'SMP Al-Imam Islamic School (AI IS)', 'general', 'Nama Lengkap Sekolah'],
      ['school_address', 'Jl. KH. M. Usman No. 128, Kukusan, Beji, Kota Depok, Jawa Barat', 'general', 'Alamat Lengkap Sekolah'],
      ['school_phone', '0812-3456-7890 / (021) 7788990', 'general', 'Telepon/Kontak Sekolah'],
      ['school_website', 'https://alimamischool.com', 'general', 'Situs Web Resmi'],
      ['school_logo_url', 'https://alimamischool.com/wp-content/uploads/2020/08/Al-Imam-Islamic-School-alimamischool.com-sekolah-sunnah-logo.png', 'appearance', 'URL Logo Sekolah'],
      ['theme_primary_color', '#1e3a8a', 'appearance', 'Warna Primer (Hex)'],
      ['theme_secondary_color', '#0284c7', 'appearance', 'Warna Sekunder (Hex)'],
      ['theme_accent_color', '#10b981', 'appearance', 'Warna Aksen (Hex)'],
      ['theme_sidebar_dark', 'true', 'appearance', 'Mode Gelap Sidebar (true/false)'],
      ['academic_year', '2025/2026', 'academic', 'Tahun Ajaran Aktif'],
      ['semester_active', 'Ganjil', 'academic', 'Semester Aktif (Ganjil/Genap)'],
      ['report_date', '28 September 2025', 'academic', 'Tanggal Titimangsa Rapor'],
      ['report_place', 'Depok', 'academic', 'Kota Pembagian Rapor'],
      ['headmaster_name', 'Ust. Ahmad Fauzi, M.Pd.', 'signatory', 'Nama Kepala Sekolah'],
      ['headmaster_nip', '198507152010011002', 'signatory', 'NIP/NIY Kepala Sekolah'],
      ['headmaster_signature_url', '', 'signatory', 'URL Gambar TTD Kepala Sekolah (Opsional)'],
      ['report_footer_text', 'Mencetak Generasi Berakhlak Qurani, Mandiri, dan Berjiwa Pemimpin.', 'general', 'Teks Footer Rapor']
    ];
    sheetSettings.getRange(2, 1, defaultSettings.length, 4).setValues(defaultSettings);
  }
  
  // 2. Skema Users
  const sheetUsers = getOrCreateSheet(DB_CONFIG.SHEET_USERS, ['id', 'username', 'password_hash', 'nama_lengkap', 'role', 'status', 'created_at']);
  if (sheetUsers.getLastRow() <= 1) {
    const defaultUsers = [
      ['USR-001', 'admin', 'admin123', 'Administrator Utama', 'admin', 'aktif', '2025-01-01'],
      ['USR-002', 'guru.akademik', 'guru123', 'Ust. Budi Santoso, S.Si.', 'guru_akademik', 'aktif', '2025-01-01'],
      ['USR-003', 'pembina.leadership', 'pembina123', 'Ust. Ridwan Kamil, S.Pd.I.', 'pembina_kepemimpinan', 'aktif', '2025-01-01'],
      ['USR-004', 'musyrif.diniyah', 'musyrif123', 'Ust. Muhammad Ihsan, Lc.', 'pembina_diniyah', 'aktif', '2025-01-01'],
      ['USR-005', 'santri.demo', 'santri123', 'Muhammad Zaidan Al-Fatih', 'santri', 'aktif', '2025-01-01']
    ];
    sheetUsers.getRange(2, 1, defaultUsers.length, 7).setValues(defaultUsers);
  }
  
  // 3. Skema Santri
  const sheetSantri = getOrCreateSheet(DB_CONFIG.SHEET_SANTRI, ['nis', 'nisn', 'nama_santri', 'kelas', 'jenis_kelamin', 'nama_wali', 'kontak_wali', 'status']);
  if (sheetSantri.getLastRow() <= 1) {
    const defaultSantri = [
      ['202507001', '0091234561', 'Muhammad Zaidan Al-Fatih', '7A', 'L', 'Ir. Abdullah Pratama', '081299887766', 'Aktif'],
      ['202507002', '0091234562', 'Abdullah Hanif Azzam', '7A', 'L', 'H. Bambang Soediro', '081311223344', 'Aktif'],
      ['202507003', '0091234563', 'Fatih Rayyan Al-Ghifari', '7A', 'L', 'Dr. Hendra Gunawan', '085612349876', 'Aktif'],
      ['202507004', '0091234564', 'Aisyah Humaira Azzahra', '7B', 'P', 'dr. Lukman Hakim, Sp.A', '081122334455', 'Aktif'],
      ['202507005', '0091234565', 'Khadijah Salma Nabila', '7B', 'P', 'Rahmat Hidayat, M.Kom', '081765432109', 'Aktif'],
      ['202408001', '0081234561', 'Umar Farouq Al-Khattab', '8A', 'L', 'Subhan Wijaya, S.E.', '081233445566', 'Aktif'],
      ['202408002', '0081234562', 'Fathimah Zahira Khansa', '8B', 'P', 'Agus Salim, M.Pd.', '085799881122', 'Aktif'],
      ['202309001', '0071234561', 'Ali Imran Al-Qasimi', '9A', 'L', 'Drs. Syarifuddin', '081822334455', 'Aktif'],
      ['202309002', '0071234562', 'Maryam Qurrata Ayun', '9B', 'P', 'M. Fadli, S.T.', '081900112233', 'Aktif']
    ];
    sheetSantri.getRange(2, 1, defaultSantri.length, 8).setValues(defaultSantri);
  }
  
  // 4. Skema Nilai_Akademik
  const sheetAkademik = getOrCreateSheet(DB_CONFIG.SHEET_AKADEMIK, [
    'id', 'nis', 'semester', 'tahun_ajaran', 'mata_pelajaran', 'nilai_tugas', 'nilai_uts', 'nilai_akhir', 'predikat', 'catatan_guru'
  ]);
  if (sheetAkademik.getLastRow() <= 1) {
    const defaultAkademik = [
      ['NA-001', '202507001', 'Ganjil', '2025/2026', 'Matematika', 88, 92, 90, 'A', 'Sangat baik dalam pemahaman aljabar dan logika matematika.'],
      ['NA-002', '202507001', 'Ganjil', '2025/2026', 'Ilmu Pengetahuan Alam (IPA)', 85, 87, 86, 'B', 'Aktif dalam eksperimen sains dan pemecahan masalah.'],
      ['NA-003', '202507001', 'Ganjil', '2025/2026', 'Bahasa Indonesia', 90, 94, 92, 'A', 'Kemampuan literasi, retorika, dan tata bahasa sangat menonjol.'],
      ['NA-004', '202507001', 'Ganjil', '2025/2026', 'Bahasa Inggris', 86, 90, 88, 'A', 'Percaya diri dalam percakapan lisan dan reading comprehension.'],
      ['NA-005', '202507001', 'Ganjil', '2025/2026', 'Ilmu Pengetahuan Sosial (IPS)', 84, 82, 83, 'B', 'Mampu menganalisis fenomena sosial dengan sudut pandang islami.'],
      ['NA-006', '202507001', 'Ganjil', '2025/2026', 'Informatika & Coding', 95, 96, 96, 'A', 'Sangat mahir dalam computational thinking dan pembuatan algoritma.'],
      
      ['NA-007', '202507002', 'Ganjil', '2025/2026', 'Matematika', 80, 82, 81, 'B', 'Tingkatkan latihan soal analitis bertingkat.'],
      ['NA-008', '202507002', 'Ganjil', '2025/2026', 'Ilmu Pengetahuan Alam (IPA)', 85, 85, 85, 'B', 'Konsisten dalam pemahaman materi biologi dan fisika dasar.'],
      ['NA-009', '202507002', 'Ganjil', '2025/2026', 'Bahasa Indonesia', 88, 86, 87, 'B', 'Menulis karya tulis deskriptif dengan runtut.'],
      ['NA-010', '202507002', 'Ganjil', '2025/2026', 'Bahasa Inggris', 80, 84, 82, 'B', 'Perbanyak kosakata akademik bahasa Inggris.'],
      ['NA-011', '202507002', 'Ganjil', '2025/2026', 'Ilmu Pengetahuan Sosial (IPS)', 86, 88, 87, 'B', 'Pemahaman sejarah dan geografi sangat baik.'],
      ['NA-012', '202507002', 'Ganjil', '2025/2026', 'Informatika & Coding', 88, 90, 89, 'A', 'Antusias dalam pemrograman dasar Scratch & Python.']
    ];
    sheetAkademik.getRange(2, 1, defaultAkademik.length, 10).setValues(defaultAkademik);
  }
  
  // 5. Skema Nilai_Kepemimpinan
  const sheetKepemimpinan = getOrCreateSheet(DB_CONFIG.SHEET_KEPEMIMPINAN, [
    'id', 'nis', 'semester', 'tahun_ajaran', 'kedisiplinan', 'organisasi', 'karakter_adab', 'inisiatif_kemandirian', 'catatan_pembina'
  ]);
  if (sheetKepemimpinan.getLastRow() <= 1) {
    const defaultKepemimpinan = [
      ['NK-001', '202507001', 'Ganjil', '2025/2026', 'Sangat Baik (A)', 'Sangat Aktif (A)', 'Sangat Baik (A)', 'Mandiri & Proaktif (A)', 'Menunjukkan jiwa kepemimpinan yang tangguh, disegani teman, serta selalu tepat waktu dalam kegiatan qiyamullail dan halaqah.'],
      ['NK-002', '202507002', 'Ganjil', '2025/2026', 'Baik (B)', 'Aktif (B)', 'Sangat Baik (A)', 'Mandiri (B)', 'Santri yang sopan, taat peraturan asrama, dan selalu kooperatif dalam kerja kelompok santri.']
    ];
    sheetKepemimpinan.getRange(2, 1, defaultKepemimpinan.length, 9).setValues(defaultKepemimpinan);
  }
  
  // 6. Skema Nilai_Diniyah
  const sheetDiniyah = getOrCreateSheet(DB_CONFIG.SHEET_DINIYAH, [
    'id', 'nis', 'semester', 'tahun_ajaran', 'ziyadah_juz', 'murojaah_juz', 'nilai_tahfidz', 'adab_harian', 'ibadah_harian', 'bahasa_arab', 'catatan_musyrif'
  ]);
  if (sheetDiniyah.getLastRow() <= 1) {
    const defaultDiniyah = [
      ['ND-001', '202507001', 'Ganjil', '2025/2026', 'Juz 30 & Juz 29 (Lancar)', 'Juz 30 (Mutqin)', 94, 'Mumtaz (A)', 'Mumtaz (A)', 90, 'Alhamdulillah capaian ziyadah melampaui target tengah semester. Makhraj huruf dan hukum tajwid sangat baik.'],
      ['ND-002', '202507002', 'Ganjil', '2025/2026', 'Juz 30 (15 Halaman)', 'Juz 30 (Surah An-Naba s.d At-Takwir)', 86, 'Jayyid Jiddan (B)', 'Mumtaz (A)', 84, 'Konsisten dalam halaqah tahfidz. Perlu penekanan pada kelancaran murojaah juz 30 paruh kedua.']
    ];
    sheetDiniyah.getRange(2, 1, defaultDiniyah.length, 11).setValues(defaultDiniyah);
  }
  
  return {
    status: 'success',
    message: 'Database berhasil diinisialisasi beserta skema dan data awal.'
  };
}

/**
 * ============================================================================
 * MODEL: CMS & PENGATURAN TAMPILAN
 * ============================================================================
 */
function getSettings() {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SETTINGS);
  const data = sheetToObjects(sheet);
  const settingsObj = {};
  data.forEach(item => {
    settingsObj[item.key] = item.value;
  });
  return settingsObj;
}

function updateSettings(settingsMap) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SETTINGS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { status: 'error', message: 'Sheet settings kosong' };
  
  const headers = rows[0].map(h => String(h).trim());
  const keyIdx = headers.indexOf('key');
  const valIdx = headers.indexOf('value');
  
  if (keyIdx === -1 || valIdx === -1) return { status: 'error', message: 'Struktur header salah' };
  
  const updatedKeys = Object.keys(settingsMap);
  for (let i = 1; i < rows.length; i++) {
    const rowKey = String(rows[i][keyIdx]);
    if (updatedKeys.includes(rowKey)) {
      sheet.getRange(i + 1, valIdx + 1).setValue(settingsMap[rowKey]);
    }
  }
  
  return { status: 'success', message: 'Pengaturan CMS berhasil disimpan.' };
}

/**
 * ============================================================================
 * MODEL: PENGGUNA (USERS)
 * ============================================================================
 */
function getAllUsers() {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_USERS);
  return sheetToObjects(sheet).map(u => ({
    id: u.id,
    username: u.username,
    nama_lengkap: u.nama_lengkap,
    role: u.role,
    status: u.status,
    created_at: u.created_at
  }));
}

function saveUser(userData) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_USERS);
  const isNew = !userData.id;
  const id = isNew ? 'USR-' + Utilities.getUuid().substring(0, 6).toUpperCase() : userData.id;
  
  const existing = findRowByField(sheet, 'id', id);
  if (existing) {
    // Update
    const rowIdx = existing.rowIndex;
    const headers = existing.headers;
    headers.forEach((h, colIdx) => {
      if (userData[h] !== undefined && (h !== 'password_hash' || userData[h] !== '')) {
        sheet.getRange(rowIdx, colIdx + 1).setValue(userData[h]);
      }
    });
  } else {
    // Insert
    const today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    sheet.appendRow([
      id,
      userData.username || '',
      userData.password_hash || userData.password || '123456',
      userData.nama_lengkap || '',
      userData.role || 'guru_akademik',
      userData.status || 'aktif',
      today
    ]);
  }
  return { status: 'success', message: 'User berhasil disimpan', id: id };
}

function deleteUser(userId) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_USERS);
  const match = findRowByField(sheet, 'id', userId);
  if (match) {
    sheet.deleteRow(match.rowIndex);
    return { status: 'success', message: 'User berhasil dihapus' };
  }
  return { status: 'error', message: 'User tidak ditemukan' };
}

/**
 * ============================================================================
 * MODEL: SANTRI
 * ============================================================================
 */
function getAllSantri(filterClass = '') {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SANTRI);
  let list = sheetToObjects(sheet);
  if (filterClass && filterClass !== 'Semua') {
    list = list.filter(s => String(s.kelas).toUpperCase() === String(filterClass).toUpperCase());
  }
  return list;
}

function getSantriByNis(nis) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SANTRI);
  const match = findRowByField(sheet, 'nis', nis);
  if (!match) return null;
  
  const obj = {};
  match.headers.forEach((h, idx) => {
    obj[h] = match.values[idx];
  });
  return obj;
}

function saveSantri(santriData) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SANTRI);
  const existing = findRowByField(sheet, 'nis', santriData.nis);
  
  if (existing) {
    const rowIdx = existing.rowIndex;
    const headers = existing.headers;
    headers.forEach((h, colIdx) => {
      if (santriData[h] !== undefined) {
        sheet.getRange(rowIdx, colIdx + 1).setValue(santriData[h]);
      }
    });
  } else {
    sheet.appendRow([
      santriData.nis,
      santriData.nisn || '',
      santriData.nama_santri || '',
      santriData.kelas || '7A',
      santriData.jenis_kelamin || 'L',
      santriData.nama_wali || '',
      santriData.kontak_wali || '',
      santriData.status || 'Aktif'
    ]);
  }
  return { status: 'success', message: 'Data santri berhasil disimpan' };
}

function deleteSantri(nis) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SANTRI);
  const match = findRowByField(sheet, 'nis', nis);
  if (match) {
    sheet.deleteRow(match.rowIndex);
    return { status: 'success', message: 'Data santri berhasil dihapus' };
  }
  return { status: 'error', message: 'Santri tidak ditemukan' };
}

/**
 * ============================================================================
 * MODEL: NILAI AKADEMIK
 * ============================================================================
 */
function getNilaiAkademikList(filters = {}) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_AKADEMIK);
  let list = sheetToObjects(sheet);
  
  // Join dengan data santri untuk mendapatkan nama santri dan kelas
  const santriList = getAllSantri();
  const santriMap = {};
  santriList.forEach(s => { santriMap[s.nis] = s; });
  
  list = list.map(item => {
    const s = santriMap[item.nis] || {};
    return {
      ...item,
      nama_santri: s.nama_santri || 'Tidak Diketahui',
      kelas: s.kelas || '-'
    };
  });
  
  if (filters.nis) list = list.filter(item => String(item.nis) === String(filters.nis));
  if (filters.kelas && filters.kelas !== 'Semua') list = list.filter(item => String(item.kelas) === String(filters.kelas));
  if (filters.mata_pelajaran && filters.mata_pelajaran !== 'Semua') {
    list = list.filter(item => String(item.mata_pelajaran).toLowerCase() === String(filters.mata_pelajaran).toLowerCase());
  }
  
  return list;
}

function saveNilaiAkademik(data) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_AKADEMIK);
  const isNew = !data.id;
  const id = isNew ? 'NA-' + Utilities.getUuid().substring(0, 6).toUpperCase() : data.id;
  
  // Hitung Nilai Akhir & Predikat Otomatis jika tidak disediakan
  const tugas = Number(data.nilai_tugas) || 0;
  const uts = Number(data.nilai_uts) || 0;
  const akhir = data.nilai_akhir !== undefined && data.nilai_akhir !== '' ? Number(data.nilai_akhir) : Math.round((tugas * 0.4) + (uts * 0.6));
  
  let predikat = data.predikat;
  if (!predikat) {
    if (akhir >= 90) predikat = 'A';
    else if (akhir >= 80) predikat = 'B';
    else if (akhir >= 70) predikat = 'C';
    else predikat = 'D';
  }
  
  const existing = findRowByField(sheet, 'id', id);
  if (existing) {
    const rowIdx = existing.rowIndex;
    const headers = existing.headers;
    const payload = {
      ...data,
      id: id,
      nilai_tugas: tugas,
      nilai_uts: uts,
      nilai_akhir: akhir,
      predikat: predikat
    };
    headers.forEach((h, colIdx) => {
      if (payload[h] !== undefined) {
        sheet.getRange(rowIdx, colIdx + 1).setValue(payload[h]);
      }
    });
  } else {
    sheet.appendRow([
      id,
      data.nis,
      data.semester || 'Ganjil',
      data.tahun_ajaran || '2025/2026',
      data.mata_pelajaran || '',
      tugas,
      uts,
      akhir,
      predikat,
      data.catatan_guru || ''
    ]);
  }
  return { status: 'success', message: 'Nilai akademik berhasil disimpan', id: id };
}

function deleteNilaiAkademik(id) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_AKADEMIK);
  const match = findRowByField(sheet, 'id', id);
  if (match) {
    sheet.deleteRow(match.rowIndex);
    return { status: 'success', message: 'Nilai akademik berhasil dihapus' };
  }
  return { status: 'error', message: 'Data nilai tidak ditemukan' };
}

/**
 * ============================================================================
 * MODEL: NILAI KEPEMIMPINAN
 * ============================================================================
 */
function getNilaiKepemimpinanList(filters = {}) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_KEPEMIMPINAN);
  let list = sheetToObjects(sheet);
  
  const santriList = getAllSantri();
  const santriMap = {};
  santriList.forEach(s => { santriMap[s.nis] = s; });
  
  list = list.map(item => {
    const s = santriMap[item.nis] || {};
    return {
      ...item,
      nama_santri: s.nama_santri || 'Tidak Diketahui',
      kelas: s.kelas || '-'
    };
  });
  
  if (filters.nis) list = list.filter(item => String(item.nis) === String(filters.nis));
  if (filters.kelas && filters.kelas !== 'Semua') list = list.filter(item => String(item.kelas) === String(filters.kelas));
  
  return list;
}

function saveNilaiKepemimpinan(data) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_KEPEMIMPINAN);
  const isNew = !data.id;
  const id = isNew ? 'NK-' + Utilities.getUuid().substring(0, 6).toUpperCase() : data.id;
  
  const existing = findRowByField(sheet, 'id', id);
  if (existing) {
    const rowIdx = existing.rowIndex;
    const headers = existing.headers;
    headers.forEach((h, colIdx) => {
      if (data[h] !== undefined) {
        sheet.getRange(rowIdx, colIdx + 1).setValue(data[h]);
      }
    });
  } else {
    sheet.appendRow([
      id,
      data.nis,
      data.semester || 'Ganjil',
      data.tahun_ajaran || '2025/2026',
      data.kedisiplinan || 'Baik (B)',
      data.organisasi || 'Aktif (B)',
      data.karakter_adab || 'Baik (B)',
      data.inisiatif_kemandirian || 'Mandiri (B)',
      data.catatan_pembina || ''
    ]);
  }
  return { status: 'success', message: 'Nilai kepemimpinan berhasil disimpan', id: id };
}

function deleteNilaiKepemimpinan(id) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_KEPEMIMPINAN);
  const match = findRowByField(sheet, 'id', id);
  if (match) {
    sheet.deleteRow(match.rowIndex);
    return { status: 'success', message: 'Nilai kepemimpinan berhasil dihapus' };
  }
  return { status: 'error', message: 'Data tidak ditemukan' };
}

/**
 * ============================================================================
 * MODEL: NILAI DINIYAH
 * ============================================================================
 */
function getNilaiDiniyahList(filters = {}) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_DINIYAH);
  let list = sheetToObjects(sheet);
  
  const santriList = getAllSantri();
  const santriMap = {};
  santriList.forEach(s => { santriMap[s.nis] = s; });
  
  list = list.map(item => {
    const s = santriMap[item.nis] || {};
    return {
      ...item,
      nama_santri: s.nama_santri || 'Tidak Diketahui',
      kelas: s.kelas || '-'
    };
  });
  
  if (filters.nis) list = list.filter(item => String(item.nis) === String(filters.nis));
  if (filters.kelas && filters.kelas !== 'Semua') list = list.filter(item => String(item.kelas) === String(filters.kelas));
  
  return list;
}

function saveNilaiDiniyah(data) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_DINIYAH);
  const isNew = !data.id;
  const id = isNew ? 'ND-' + Utilities.getUuid().substring(0, 6).toUpperCase() : data.id;
  
  const existing = findRowByField(sheet, 'id', id);
  if (existing) {
    const rowIdx = existing.rowIndex;
    const headers = existing.headers;
    headers.forEach((h, colIdx) => {
      if (data[h] !== undefined) {
        sheet.getRange(rowIdx, colIdx + 1).setValue(data[h]);
      }
    });
  } else {
    sheet.appendRow([
      id,
      data.nis,
      data.semester || 'Ganjil',
      data.tahun_ajaran || '2025/2026',
      data.ziyadah_juz || '',
      data.murojaah_juz || '',
      Number(data.nilai_tahfidz) || 0,
      data.adab_harian || 'Mumtaz (A)',
      data.ibadah_harian || 'Mumtaz (A)',
      Number(data.bahasa_arab) || 0,
      data.catatan_musyrif || ''
    ]);
  }
  return { status: 'success', message: 'Nilai Diniyah berhasil disimpan', id: id };
}

function deleteNilaiDiniyah(id) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_DINIYAH);
  const match = findRowByField(sheet, 'id', id);
  if (match) {
    sheet.deleteRow(match.rowIndex);
    return { status: 'success', message: 'Nilai Diniyah berhasil dihapus' };
  }
  return { status: 'error', message: 'Data tidak ditemukan' };
}
