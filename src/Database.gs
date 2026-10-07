/**
 * ============================================================================
 * DATABASE.GS - Model & Layer Akses Data Google Sheets
 * Aplikasi Rapor Tengah Semester SMP Al-Imam Islamic School (AI IS)
 * Sistem Portofolio Penilaian Holistik Mengadopsi Format Excel Resmi
 * ============================================================================
 */

const DB_CONFIG = {
  SHEET_SETTINGS: 'Settings_CMS',
  SHEET_USERS: 'Users',
  SHEET_MURID: 'Murid',
  SHEET_SANTRI_LEGACY: 'Santri',
  SHEET_AKADEMIK: 'Nilai_Akademik',
  SHEET_KEPEMIMPINAN: 'Nilai_Kepemimpinan',
  SHEET_SKL_KEPEMIMPINAN: 'Nilai_SKL_Kepemimpinan',
  SHEET_DINIYAH: 'Nilai_Diniyah',
  SHEET_TP: 'Tujuan_Pembelajaran',
  SHEET_LOGS: 'Log_Aktivitas'
};

const DEFAULT_SPREADSHEET_ID = '1EwOvL7qrFnHU9IC30sIV4ie73XiqExCpy1EuWZw7vsM';

/**
 * Trigger menu otomatis saat Google Spreadsheet dibuka oleh pengguna
 */
function onOpen(e) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🚀 App Rapor AI IS')
      .addItem('⚡ Sinkronkan Seluruh Data Baru ke Spreadsheet', 'forceSyncDatabaseToSpreadsheet')
      .addItem('🔄 Inisialisasi Database', 'initDatabase')
      .addToUi();
  } catch (err) {}
}

/**
 * Mendapatkan referensi Spreadsheet aktif.
 */
function getDb() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {
    // Fallback if accessed without active sheet context
  }
  
  try {
    const prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (prop) {
      return SpreadsheetApp.openById(prop);
    }
  } catch (e2) {}
  
  if (DEFAULT_SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
    } catch (e3) {
      console.warn('Gagal openById:', e3);
    }
  }
  
  throw new Error('Spreadsheet belum terhubung. ID: ' + DEFAULT_SPREADSHEET_ID);
}

/**
 * Mengambil atau membuat sheet jika belum tersedia
 */
function getOrCreateSheet(sheetName, headers = []) {
  const ss = getDb();
  let sheet = ss.getSheetByName(sheetName);
  
  // Backward compatibility check for Murid / Santri
  if (!sheet && sheetName === DB_CONFIG.SHEET_MURID) {
    sheet = ss.getSheetByName(DB_CONFIG.SHEET_SANTRI_LEGACY);
  }
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#1e293b')
                 .setFontColor('#ffffff')
                 .setFontWeight('bold')
                 .setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }
  } else if (headers && headers.length > 0) {
    ensureSheetHeaders(sheet, headers);
  }
  return sheet;
}

/**
 * Self-healing Schema: Memastikan seluruh kolom wajib ada di header baris 1 tanpa merusak data
 */
function ensureSheetHeaders(sheet, expectedHeaders) {
  if (!expectedHeaders || expectedHeaders.length === 0) return [];
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.getRange(1, 1, 1, expectedHeaders.length)
      .setBackground('#1e293b')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    return expectedHeaders;
  }
  
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const missingHeaders = [];
  expectedHeaders.forEach(eh => {
    const exists = currentHeaders.some(ch => ch.toLowerCase() === eh.toLowerCase());
    if (!exists) {
      missingHeaders.push(eh);
    }
  });
  
  if (missingHeaders.length > 0) {
    const startCol = lastCol + 1;
    const addRange = sheet.getRange(1, startCol, 1, missingHeaders.length);
    addRange.setValues([missingHeaders]);
    addRange.setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    return currentHeaders.concat(missingHeaders);
  }
  return currentHeaders;
}

/**
 * Helper Normalisasi Semester (Mendukung Ganjil, I, 1, Tengah Semester 1, dll)
 */
function normalizeSemester(sem) {
  if (!sem) return '1';
  const s = String(sem).toLowerCase().trim();
  if (s.includes('1') || s.includes('ganjil') || s.includes('satu') || s === 'i') return '1';
  if (s.includes('2') || s.includes('genap') || s.includes('dua') || s === 'ii') return '2';
  return s;
}

/**
 * Helper Normalisasi Tahun Ajaran (Mendukung 2026/2027, 2026-2027, dll)
 */
function normalizeYear(year) {
  if (!year) return '';
  return String(year).replace(/[^0-9]/g, '');
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
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
      }
      obj[header] = val !== undefined ? val : '';
    });
    // Normalisasi nama_murid jika nama kolom bervariasi
    if (!obj.nama_murid) {
      obj.nama_murid = obj.nama_santri || obj.nama || obj.nama_lengkap || obj['Nama Siswa'] || obj['Nama Murid'] || '';
    }
    if (obj.nama_murid && typeof obj.nama_murid === 'string') {
      obj.nama_murid = obj.nama_murid.toUpperCase();
      obj.nama_santri = obj.nama_murid;
    }
    if (!obj.nis && obj.NIS) obj.nis = obj.NIS;
    if (!obj.nisn && obj.NISN) obj.nisn = obj.NISN;
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
  const normField = fieldName.toLowerCase().trim();
  let colIndex = headers.findIndex(h => h.toLowerCase().trim() === normField);
  
  // Fallback field check
  if (colIndex === -1 && normField === 'nama_murid') {
    colIndex = headers.findIndex(h => h.toLowerCase().trim() === 'nama_santri');
  }
  if (colIndex === -1) return null;
  
  const expectedStr = String(fieldValue).trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    const actualStr = String(data[i][colIndex]).trim().toLowerCase();
    if (actualStr === expectedStr) {
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
 * Helper: Mengambil baris berdasarkan kombinasi beberapa kriteria (Composite Key)
 */
function findRowByCompositeKey(sheet, criteria) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;
  
  const headers = data[0].map(h => String(h).trim());
  const colMap = {};
  for (const k in criteria) {
    const normK = k.toLowerCase().trim();
    let idx = headers.findIndex(h => h.toLowerCase().trim() === normK);
    if (idx === -1 && normK === 'nama_murid') idx = headers.findIndex(h => h.toLowerCase().trim() === 'nama_santri');
    if (idx !== -1) colMap[normK] = { colIdx: idx, origKey: k };
  }
  
  for (let i = 1; i < data.length; i++) {
    let match = true;
    for (const normK in colMap) {
      const colIdx = colMap[normK].colIdx;
      const origKey = colMap[normK].origKey;
      const valExpected = criteria[origKey] !== undefined ? String(criteria[origKey]).trim() : '';
      const valActual = data[i][colIdx] !== undefined ? String(data[i][colIdx]).trim() : '';
      
      if (!valExpected) continue;

      if (normK === 'semester') {
        if (normalizeSemester(valActual) !== normalizeSemester(valExpected)) {
          match = false;
          break;
        }
      } else if (normK === 'tahun_ajaran' || normK === 'academic_year') {
        if (normalizeYear(valActual) !== normalizeYear(valExpected)) {
          match = false;
          break;
        }
      } else if (normK === 'nis' || normK === 'id') {
        if (valActual.toLowerCase() !== valExpected.toLowerCase()) {
          match = false;
          break;
        }
      } else {
        if (valActual.toLowerCase() !== valExpected.toLowerCase()) {
          match = false;
          break;
        }
      }
    }
    if (match) {
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
 * INISIALISASI DATABASE & SEEDING DATA OTOMATIS (FORMAT EXCEL SMP AL-IMAM)
 * ============================================================================
 */
function initDatabase() {
  const ss = getDb();
  
  // 1. Skema Settings_CMS
  const sheetSettings = getOrCreateSheet(DB_CONFIG.SHEET_SETTINGS, ['key', 'value', 'category', 'description']);
  if (sheetSettings.getLastRow() <= 1) {
    const defaultSettings = [
      ['school_name', 'SMP Al-Imam Islamic School (AI IS)', 'general', 'Nama Lengkap Sekolah'],
      ['school_address', 'Jl. Harjamukti No. 12, Cimanggis, Kota Depok, Jawa Barat', 'general', 'Alamat Lengkap Sekolah'],
      ['school_phone', '(021) 8775-4321 / 0812-9876-5432', 'general', 'Telepon/Kontak Sekolah'],
      ['school_website', 'https://alimamischool.com', 'general', 'Situs Web Resmi'],
      ['school_logo_url', 'https://alimamischool.com/wp-content/uploads/2020/08/Al-Imam-Islamic-School-alimamischool.com-sekolah-sunnah-logo.png', 'appearance', 'URL Logo Sekolah'],
      ['theme_primary_color', '#1e3a8a', 'appearance', 'Warna Primer (Hex)'],
      ['theme_secondary_color', '#0284c7', 'appearance', 'Warna Sekunder (Hex)'],
      ['theme_accent_color', '#10b981', 'appearance', 'Warna Aksen (Hex)'],
      ['theme_sidebar_dark', 'true', 'appearance', 'Mode Gelap Sidebar (true/false)'],
      ['academic_year', '2026/2027', 'academic', 'Tahun Ajaran Aktif'],
      ['academic_years_list', '2026/2027,2027/2028,2028/2029,2025/2026,2024/2025', 'academic', 'Daftar Pilihan Tahun Ajaran'],
      ['semester_active', 'Tengah Semester 1', 'academic', 'Semester Aktif (Tengah Semester 1 / Akhir Semester 1 / Tengah Semester 2 / Akhir Semester 2)'],
      ['report_date', '17 Oktober 2026', 'academic', 'Tanggal Titimangsa Rapor'],
      ['report_place', 'Bogor', 'academic', 'Kota Pembagian Rapor'],
      ['wali_kelas_default', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'academic', 'Wali Kelas Default'],
      ['headmaster_name', 'Arif Rohman, S.Sos., M.Pd.', 'signatory', 'Nama Kepala Sekolah'],
      ['headmaster_nip', '', 'signatory', 'NIP/NIY Kepala Sekolah'],
      ['headmaster_signature_url', '', 'signatory', 'URL Gambar TTD Kepala Sekolah (Opsional)'],
      ['report_footer_text', 'RAPOR TENGAH SEMESTER PROGRAM PORTOFOLIO SMP AL IMAM ISLAMIC SCHOOL', 'general', 'Teks Footer Rapor']
    ];
    sheetSettings.getRange(2, 1, defaultSettings.length, 4).setValues(defaultSettings);
  }
  
  // 2. Skema Users (Admin, Kepala Sekolah, 12 Guru Mapel, Wali Murid)
  const sheetUsers = getOrCreateSheet(DB_CONFIG.SHEET_USERS, ['id', 'username', 'password_hash', 'nama_lengkap', 'role', 'status', 'created_at', 'nis', 'mapel']);
  if (sheetUsers.getLastRow() <= 1) {
    const defaultUsers = [
      ['USR-001', 'arifrohman', 'arif123', 'Gr. Arif Rohman, S.Sos., M.Pd.', 'admin', 'aktif', '2026-07-01', '', 'Fikih, Semua Mapel'],
      ['USR-002', 'dewi', 'dewi123', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'admin', 'aktif', '2026-07-01', '', 'Bahasa Indonesia, Semua Mapel'],
      ['USR-003', 'zamzam', 'zamzam123', 'Zam-zam Nasrullah, S.Pd.', 'guru', 'aktif', '2026-07-01', '', 'Akhlak, Hadits'],
      ['USR-004', 'asril', 'asril123', 'Asril Ardiansyah, S.H., Gr.', 'guru', 'aktif', '2026-07-01', '', 'SKI, Bahasa Arab'],
      ['USR-005', 'aning', 'aning123', 'Aning Nurhayati, S.T., Gr.', 'guru', 'aktif', '2026-07-01', '', 'Informatika, Prakarya, SBDP'],
      ['USR-006', 'trinuryani', 'tri123', 'Tri Nuryani, S.S., Gr.', 'guru', 'aktif', '2026-07-01', '', 'Bahasa Inggris'],
      ['USR-007', 'sumiati', 'sumi123', 'Sumiati, S.Pd., Gr.', 'guru', 'aktif', '2026-07-01', '', 'Ilmu Pengetahuan Sosial, BK'],
      ['USR-008', 'triyuli', 'triyuli123', 'Tri Yuli Aryani, S.Pd., Gr.', 'guru', 'aktif', '2026-07-01', '', 'Matematika'],
      ['USR-009', 'eliumiyati', 'eli123', 'Eli Umiyati, S.Pd., Gr.', 'guru', 'aktif', '2026-07-01', '', 'Ilmu Pengetahuan Alam'],
      ['USR-010', 'kahlilgibran', 'kahlil123', 'Kahlil Gibran, S.Pd., Gr.', 'guru', 'aktif', '2026-07-01', '', 'Pendidikan Pancasila, Bahasa Arab'],
      ['USR-011', 'guntur', 'guntur123', 'Guntur Ageng Auliawan, S.Pd.', 'guru', 'aktif', '2026-07-01', '', 'Pendidikan Jasmani, Olahraga, dan Kesehatan, Bahasa Sunda'],
      ['USR-012', 'nunung', 'nunung123', 'Nunung Lastika Adiansyah, S.Pd.', 'guru', 'aktif', '2026-07-01', '', 'Akidah, Fikih'],
      ['USR-013', 'admin', 'admin123', 'Administrator Utama', 'admin', 'aktif', '2026-07-01', '', 'Semua Mapel'],
      ['USR-014', 'walimurid', 'wali123', 'Bpk. Nanang Fajar', 'wali_murid', 'aktif', '2026-07-01', '242507001', '-']
    ];
    sheetUsers.getRange(2, 1, defaultUsers.length, 9).setValues(defaultUsers);
  }
  
  // 3. Skema Murid (DATA SISWA SESUAI EXCEL AL-IMAM)
  const sheetMurid = getOrCreateSheet(DB_CONFIG.SHEET_MURID, [
    'nis', 'nisn', 'nama_murid', 'kelas', 'jenis_kelamin', 'nama_wali', 'kontak_wali', 'status', 'kehadiran_s', 'kehadiran_i', 'kehadiran_a', 'ekskul_1', 'ekskul_1_nilai', 'ekskul_2', 'ekskul_2_nilai', 'ekskul_3', 'ekskul_3_nilai', 'wali_kelas'
  ]);
  if (sheetMurid.getLastRow() <= 1) {
    const defaultMurid = [
      // 1. VII UTSMAN (25 Murid Ikhwan - Sesuai File Excel SISWA FIX LENGKAP SMP 2026-2027)
      ['262707001', '0134897969', 'AEZAR EL KHAZINDAR WALIDAIN', 'VII UTSMAN', 'L', 'ANGGER KERTI WASIAT', '081234567101', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707025', '0135865814', 'AGATHA PRATAMA', 'VII UTSMAN', 'L', 'EDWIN', '081234567102', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707002', '3136539952', 'AHSAN FADILAH', 'VII UTSMAN', 'L', 'BADRUN', '081234567103', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707004', '3143349022', 'AL FARIZI MAULANA', 'VII UTSMAN', 'L', 'ADE MULYANA', '081234567104', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707005', '0134438685', 'AL ZIDAN ALAIR PERMANA', 'VII UTSMAN', 'L', 'DEMA PERMANA', '081234567105', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707007', '3137629982', 'AZRIEL PUTRA NATAFA', 'VII UTSMAN', 'L', 'MUSTAFA', '081234567106', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707008', '3139505292', 'BASTIAN ARIF ABDILLAH', 'VII UTSMAN', 'L', 'KHOLID RIDWAN', '081234567107', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707009', '0132557813', 'FATHAN ATHARSYAH ATTHALLA', 'VII UTSMAN', 'L', 'RICKY MOCHAMAD YULIANSYAH', '081234567108', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707010', '3140036034', 'GIBRAN HARUNSYAKA UBAIDILLAH', 'VII UTSMAN', 'L', 'GUNARDI', '081234567109', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707011', '0141620854', 'HAFIZH KURNIA STYAWAN', 'VII UTSMAN', 'L', 'BONI STYAWAN', '081234567110', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707012', '3148386262', 'IBRAHIM AL AQSA SHALEH', 'VII UTSMAN', 'L', 'SALMAN', '081234567111', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707024', '0136381212', 'KEANO AQUILLA SAKHA RESPATI', 'VII UTSMAN', 'L', 'GAMA RIZQI RESPATI', '081234567112', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707013', '0141917161', 'LEVI RAZAN PUTRA PERMADI', 'VII UTSMAN', 'L', 'ARIF PERMADI', '081234567113', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707020', '0143323437', 'M. ZHAFRAN YUDHA ALFARIDZI', 'VII UTSMAN', 'L', 'M. ARISANDI M.', '081234567114', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707016', '3143918538', 'MUCHAMAD WILDAN MAULANA', 'VII UTSMAN', 'L', 'HERRY', '081234567115', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707017', '0137530870', 'MUFTI ANWAR FALAH', 'VII UTSMAN', 'L', 'ASEP ACHMAD M.', '081234567116', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707003', '3141265150', 'MUHAMMAD AHZA HABIBI', 'VII UTSMAN', 'L', 'RADEN INDRA AGUSTIAN', '081234567117', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707018', '3144440868', 'MUHAMMAD ARKHAN AL RAZIQ', 'VII UTSMAN', 'L', 'MOCH NOORISMAN SHIDIEQ', '081234567118', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707019', '0148538797', 'MUHAMMAD AZKA KAMIL HERMAWAN', 'VII UTSMAN', 'L', 'AWAN HERMAWAN', '081234567119', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707014', '0138549364', 'MUHAMMAD DANIEL ATHARIZZ CALIEF ARDAN', 'VII UTSMAN', 'L', 'NGAVIF ARDANI', '081234567120', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707015', '3142076446', 'MUHAMMAD YUSRIL AL-FATIH', 'VII UTSMAN', 'L', 'WASIKIN', '081234567121', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707021', '0141998804', 'NOUFAL KHAIRIL HANIF', 'VII UTSMAN', 'L', 'AGUNG SAPUTRO', '081234567122', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707022', '3129336612', 'RAFIAZKA IHSAN ABDULLAH', 'VII UTSMAN', 'L', 'IWAN PRIHANTORO', '081234567123', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707023', '0139108114', 'ZAFRAN ALI YUDITYO RAMADHAN', 'VII UTSMAN', 'L', 'DIDIT RIZKY NAHARI', '081234567124', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Eli Umiyati, S.Pd., Gr.'],
      ['262707052', '0142345678', 'FATIH ABDILLAH KURNIYAWAN', 'VII UTSMAN', 'L', 'KURNIYAWAN', '081234567125', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Eli Umiyati, S.Pd., Gr.'],

      // 2. VII AISYAH (26 Murid Akhwat - Sesuai File Excel SISWA FIX LENGKAP SMP 2026-2027)
      ['262707026', '3140178025', 'AKIFA NAILA KARIM', 'VII AISYAH', 'P', 'AZDNI KARIM', '081234567201', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707027', '0133341826', 'ALIYA HASNA SAFIRA', 'VII AISYAH', 'P', 'AGUNG BURHANUDIN', '081234567202', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707028', '3147599490', 'ARINKA NATHANIA MUNARDJO', 'VII AISYAH', 'P', 'FABIAN MUNARDJO', '081234567203', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707006', '3142946202', 'ASKANA SAKHI HENDRI', 'VII AISYAH', 'P', 'HENDRI', '081234567204', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707029', '0144710814', 'CAMILIA LARISSA ZAHWA', 'VII AISYAH', 'P', 'MUHAMADA BAIHAKI', '081234567205', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707030', '0138179797', 'CHYLLA KHANSA AZALIA NASUTION', 'VII AISYAH', 'P', 'HARRY ASHARY', '081234567206', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707031', '3134535113', 'DAFINA AULIA AINI', 'VII AISYAH', 'P', 'KHOIRUL MASHUDA', '081234567207', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707032', '3148049578', 'DELIESHA ADZKIA PUTRI', 'VII AISYAH', 'P', 'FUADI DARMONO', '081234567208', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707033', '0141496610', 'GHADHIRA AURYN GIOVANNI', 'VII AISYAH', 'P', 'RHESA GIOVANNI NASUTION', '081234567209', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707034', '0148183902', 'GHASSANI ZAHILA', 'VII AISYAH', 'P', 'GIBRAN ZEHAR', '081234567210', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707035', '3131085819', 'IFTINAN NATHIFA DEFI', 'VII AISYAH', 'P', 'MARJUKI', '081234567211', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707036', '0139642647', 'KANAYA SYAHLA ADHITYA', 'VII AISYAH', 'P', 'CHANDRA ADHITYA', '081234567212', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707037', '3149176808', 'KHALILA NADIA RAHMADANI', 'VII AISYAH', 'P', 'ADITYO JULIANTO', '081234567213', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707038', '3149568312', 'MAHIRA AZZAHRA SATRIA', 'VII AISYAH', 'P', 'SATRIA NUGRAHA WIJANARKO', '081234567214', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707039', '3145113125', 'MAULIDIA MAHYANI MAUDY', 'VII AISYAH', 'P', 'ABDUL JIHAD INDERAWAN', '081234567215', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707040', '3131075120', 'NADYA MELODY PUTRI', 'VII AISYAH', 'P', 'FREDY ARI WIBOWO', '081234567216', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707041', '3134388881', 'NAJWA KHAIRA WILDA', 'VII AISYAH', 'P', 'ARTHA RIZKA', '081234567217', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707042', '3133233937', 'PURI AZ ZAHRA HAYFA', 'VII AISYAH', 'P', 'DENNY FARIAL PRATAMA', '081234567218', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707043', '3148090337', 'QUEEN NADHIRA RAISYA QISTHI', 'VII AISYAH', 'P', 'HERRY SUSANTO', '081234567219', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707044', '3144966437', 'RAISHA KANAYA PUTRI', 'VII AISYAH', 'P', 'TRI HASTAMI YUNIARDI', '081234567220', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707045', '3133962019', 'RAISYAH AMALIA', 'VII AISYAH', 'P', 'MUHAMAD ARUDIN', '081234567221', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707047', '3138336584', 'SAKHIA TSABITA AL KANZA', 'VII AISYAH', 'P', 'PANJI KESUMA AULIA JUNIOR', '081234567223', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707048', '3148988833', 'SHARLYNN TANZEELA AUDREANA', 'VII AISYAH', 'P', 'NUR SAMSIAH BATUBARA', '081234567224', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707049', '3136013691', 'SYAQILA APRILIA PUTRI', 'VII AISYAH', 'P', 'FITRAH EKA SARI', '081234567225', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707050', '0132633693', 'TRICEL ANGELIA INDRADI', 'VII AISYAH', 'P', 'DEDI MULYADI', '081234567226', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Tri Yuli Aryani, S.Pd., Gr.'],
      ['262707051', '3134176899', 'YUMNA LAILA FAIZAH', 'VII AISYAH', 'P', 'BAYU SASMITA', '081234567227', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Yuli Aryani, S.Pd., Gr.'],

      // 3. VII MBU (12 Murid - Sesuai File Excel SISWA FIX LENGKAP SMP 2026-2027)
      ['MBU20268', '3134502259', 'ABDULLAH ZAIN', 'VII MBU', 'L', 'LAILATUNINGSIH', '081234567301', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Ust. Abdullah Syafi\'i, S.Pd.'],
      ['MBU20269', '3139122420', 'CEPRILLIA DWIDAN AISYAH', 'VII MBU', 'P', 'SUBANDI', '081234567302', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Ust. Abdullah Syafi\'i, S.Pd.'],
      ['MBU20261', '3144072185', 'EMEERANIA PRANANDI', 'VII MBU', 'P', 'RIZKY SUKMA PRANANDI', '081234567303', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Ust. Abdullah Syafi\'i, S.Pd.'],
      ['MBU20265', '0132065415', 'FARRIS AL KEVA', 'VII MBU', 'L', 'TUROH', '081234567304', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Ust. Abdullah Syafi\'i, S.Pd.'],
      ['MBU202612', '3136360854', 'HANI ZILFIANI MEIDIANA', 'VII MBU', 'P', 'USDIANSYAH', '081234567305', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Ust. Abdullah Syafi\'i, S.Pd.'],
      ['MBU20266', '3143825565', 'HUSSEIN EZIE YOSE', 'VII MBU', 'L', 'QOHHAAR MAULANA YOSE', '081234567306', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Ust. Abdullah Syafi\'i, S.Pd.'],
      ['MBU20262', '0155769361', 'MOCHAMAD RIZAL ARIF SETIAWAN', 'VII MBU', 'L', 'JONI SUGIANTO', '081234567307', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Ust. Abdullah Syafi\'i, S.Pd.'],
      ['MBU202610', '0137478475', 'MUHAMMAD FAIRUZ AL FAJRI', 'VII MBU', 'L', 'ARIE SARYANTO', '081234567308', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Ust. Abdullah Syafi\'i, S.Pd.'],
      ['MBU20267', '0159739188', 'MUMTAZ KHAIRUNISYAH', 'VII MBU', 'P', 'ANANG', '081234567309', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Ust. Abdullah Syafi\'i, S.Pd.'],
      ['MBU20263', '3142780762', 'NISRINA NURUNNASYWA', 'VII MBU', 'P', 'RIKA HENDRAWATI', '081234567310', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Ust. Abdullah Syafi\'i, S.Pd.'],
      ['MBU202611', '3145133446', 'RAHAF ZAKY BAWAZIER', 'VII MBU', 'P', 'ZAKY UMAR BAWAZIER', '081234567311', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Ust. Abdullah Syafi\'i, S.Pd.'],
      ['MBU20264', '0136181804', 'SHERYL ALFATH MAULANI', 'VII MBU', 'P', 'IRWAN MAULANA', '081234567312', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Ust. Abdullah Syafi\'i, S.Pd.'],

      // 4. VIII UMAR (19 Murid Ikhwan - Sesuai File Excel SISWA FIX LENGKAP SMP 2026-2027)
      ['252607038', '0135559636', 'ACHMED SYATHIR ELHAYBA', 'VIII UMAR', 'L', 'AKHMAD ASYARI', '081234567401', 'Aktif', '1', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Aning Nurhayati, S.T., Gr.'],
      ['252607022', '0122543534', 'ALI ZATRIO IKHWANTORO', 'VIII UMAR', 'L', 'C. ONEI HEROUANTORO', '081234567402', 'Aktif', '2', '-', '-', 'Pramuka', 'Wushu', 'Desain grafis', 'Aning Nurhayati, S.T., Gr.'],
      ['252607023', '3122299878', 'ARSA ARDHANI PUTRA PERMADI', 'VIII UMAR', 'L', 'ARIF PERMADI', '081234567403', 'Aktif', '4', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Aning Nurhayati, S.T., Gr.'],
      ['252607024', '3121661913', 'FRANANDA ADJI SAEFUDIN', 'VIII UMAR', 'L', 'MUHAMAD SAEFUDIN', '081234567404', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Aning Nurhayati, S.T., Gr.'],
      ['252607025', '3125545030', 'GERALD LAZZARO NGGEBU', 'VIII UMAR', 'L', 'HAPPY YURALDO NGGEB', '081234567405', 'Aktif', '5', '1', '-', 'Pramuka', 'Wushu', 'English Club', 'Aning Nurhayati, S.T., Gr.'],
      ['252607026', '3131067683', 'HASAN MUZAKKI', 'VIII UMAR', 'L', 'SUPODO', '081234567406', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Aning Nurhayati, S.T., Gr.'],
      ['252607027', '3123913434', 'IBRAHIM FADHILAH SYUJA TAMBUNAN', 'VIII UMAR', 'L', 'ARIF SUTANSYAH TAMBUNAR', '081234567407', 'Aktif', '4', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Aning Nurhayati, S.T., Gr.'],
      ['252607012', '3134462062', 'KANAKA ARKHAN GAIZAN', 'VIII UMAR', 'L', 'WAHYU EKA PURNAMA', '081234567408', 'Aktif', '4', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Aning Nurhayati, S.T., Gr.'],
      ['252607028', '3135642963', 'MUHAMAD FATHAN GUNAWAN', 'VIII UMAR', 'L', 'MUHAMAD INDRA GUNAWA', '081234567409', 'Aktif', '1', '-', '-', 'Pramuka', 'Wushu', 'Desain grafis', 'Aning Nurhayati, S.T., Gr.'],
      ['252607044', '3139230246', 'MUHAMMAD AFIQ IKHSAN', 'VIII UMAR', 'L', 'IMAN SULAEMAN', '081234567410', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Aning Nurhayati, S.T., Gr.'],
      ['252607029', '0122555954', 'MUHAMMAD AYDIN ARKANANTA', 'VIII UMAR', 'L', 'ANSHARULLOH', '081234567411', 'Aktif', '1', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Aning Nurhayati, S.T., Gr.'],
      ['252607030', '3134356099', 'MUHAMMAD BILAL AMILUSA', 'VIII UMAR', 'L', 'LUCKY WIRIAWAN AMILUSA', '081234567412', 'Aktif', '4', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Aning Nurhayati, S.T., Gr.'],
      ['252607031', '3136252133', 'NAUVAL AGHA IRAWAN', 'VIII UMAR', 'L', 'ADE IRWAN', '081234567413', 'Aktif', '1', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Aning Nurhayati, S.T., Gr.'],
      ['252607015', '0127813645', 'NAWAF SYIHABUDDIN YAFIQ', 'VIII UMAR', 'L', 'TEGUH HUTOMO KASNAWI', '081234567414', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Aning Nurhayati, S.T., Gr.'],
      ['252607032', '3121228938', 'RAFKANTARA ARIFIANTO', 'VIII UMAR', 'L', 'TAUFIK ARIFIANTO', '081234567415', 'Aktif', '3', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Aning Nurhayati, S.T., Gr.'],
      ['252607033', '0137000097', 'RYAN ADITYA HERLAMBANG SUGEM', 'VIII UMAR', 'L', 'ARIS SUGEMA, SP.SH, MI', '081234567416', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Aning Nurhayati, S.T., Gr.'],
      ['252607034', '3135297913', 'TEUKU MUHAMMAD ZULKARNAIN', 'VIII UMAR', 'L', 'T.M HARIS', '081234567417', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Aning Nurhayati, S.T., Gr.'],
      ['252607035', '3135460818', 'UKASYAH ABDULLAH QASIM', 'VIII UMAR', 'L', 'ABDULLAH NANI', '081234567418', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Aning Nurhayati, S.T., Gr.'],
      ['252607036', '3125394046', 'ZAMZAM ALIF', 'VIII UMAR', 'L', 'BUDIWAN', '081234567419', 'Aktif', '5', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Aning Nurhayati, S.T., Gr.'],

      // 5. VIII KHODIJAH (27 Murid Akhwat - Sesuai File Excel SISWA FIX LENGKAP SMP 2026-2027)
      ['252607001', '3136621187', 'AINA TALITA BALQIS', 'VIII KHODIJAH', 'P', 'DWI ARIYADI', '081234567501', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607002', '0138027960', 'AJENG PUTRI KIRANA', 'VIII KHODIJAH', 'P', 'YOGA PRIAMBADA', '081234567502', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607003', '3124658329', 'ALLYSHA QIANA ZETTA', 'VIII KHODIJAH', 'P', 'MANHAL', '081234567503', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Nuryani, S.S., Gr.'],
      ['252607004', '3124676739', 'ALZENA AILA VARISHA', 'VIII KHODIJAH', 'P', 'ADJI FADJRIAWANDA N', '081234567504', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Tri Nuryani, S.S., Gr.'],
      ['252607005', '0134034277', 'ANDIRA KHAIRA LARASATI', 'VIII KHODIJAH', 'P', 'ENDARTO', '081234567505', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607006', '3128139667', 'ANNISA SHAZIA ATHIFAH', 'VIII KHODIJAH', 'P', 'MUCH. BUDI HARTANT', '081234567506', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Nuryani, S.S., Gr.'],
      ['252607007', '3133343263', 'DEAN SECTIO RIANYA ARIYADI', 'VIII KHODIJAH', 'P', 'AKHMAD ARIYADI', '081234567507', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Tri Nuryani, S.S., Gr.'],
      ['252607008', '3121871205', 'EVELYN KENIVAEL', 'VIII KHODIJAH', 'P', 'NOVAN HANDRI LAKSO', '081234567508', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607045', '0139289257', 'GARJITA GALUH GUNAWAN', 'VIII KHODIJAH', 'P', 'FERY GUNAWAN', '081234567509', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Nuryani, S.S., Gr.'],
      ['252607009', '0134935321', 'GRISELDIS RADHIYA NUR HAZRINA', 'VIII KHODIJAH', 'P', 'NUR SAMSIAH BATUBARA', '081234567510', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607010', '3137691972', 'GYZELL PRI ANATASYA PUTRI', 'VIII KHODIJAH', 'P', 'ENDY PRIDEDI ARTANTO', '081234567511', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607011', '3138973504', 'KAMILA PUTRI BUDIMAN', 'VIII KHODIJAH', 'P', 'IMAN BUDIMAN', '081234567512', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Nuryani, S.S., Gr.'],
      ['252607042', '3126190351', 'KHALIFAH FITRIA HENDAR', 'VIII KHODIJAH', 'P', 'ERNA FITRIA', '081234567513', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Tri Nuryani, S.S., Gr.'],
      ['252607013', '3128354313', 'MALIKA ANINDYA ADEEVA', 'VIII KHODIJAH', 'P', 'SYAIFUDIN ALI', '081234567514', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607014', '0121220909', 'NABILA SYAHIRAH SYIFA\'A', 'VIII KHODIJAH', 'P', 'SHOLEH KURNIAWAN', '081234567515', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Nuryani, S.S., Gr.'],
      ['252607016', '3135906759', 'NAYLANA KHAYRA DZAHIN', 'VIII KHODIJAH', 'P', 'YENDI SEPTIFIYANDI', '081234567516', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607037', '3121518771', 'NURUN NAJZMI AZZAHRO', 'VIII KHODIJAH', 'P', 'HENDRI SUSANTO', '081234567517', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Nuryani, S.S., Gr.'],
      ['252607017', '3134727051', 'RHEVA AGNEZIA PUTRI', 'VIII KHODIJAH', 'P', 'HENGKY RAHARDJA', '081234567518', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607018', '3131583386', 'SARAH SALSABILA', 'VIII KHODIJAH', 'P', 'SLAMET WIDODO', '081234567519', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Tri Nuryani, S.S., Gr.'],
      ['252607019', '3129132388', 'SAYYIDAH AZZAHRAH', 'VIII KHODIJAH', 'P', 'ARIEP AFRIANTO', '081234567520', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Nuryani, S.S., Gr.'],
      ['252607039', '3133165032', 'SHAZIA KEIZALUNA HUMAIRA', 'VIII KHODIJAH', 'P', 'ELSEN ADHYTIA', '081234567521', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607070', '3135376579', 'SUMAYYAH AMATULLAH AZIZAH HUTAPEA', 'VIII KHODIJAH', 'P', 'PARLINDUNGAN HUTAPEA', '081234567522', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Tri Nuryani, S.S., Gr.'],
      ['252607043', '3136022469', 'SYAFIKAH GHALIN ALZENA', 'VIII KHODIJAH', 'P', 'REZA ACHMAD', '081234567523', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607020', '3121914004', 'TALITA LUBNA HUMAIRA RENLEUW', 'VIII KHODIJAH', 'P', 'BURHAN RENLEUW', '081234567524', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Nuryani, S.S., Gr.'],
      ['252607021', '0122579211', 'UTIN HYORIN LORDESSHA', 'VIII KHODIJAH', 'P', 'GUSTI ZEIN ANGGARA', '081234567525', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607040', '0136813875', 'ZAHIRA SARIFAH SALSABILA', 'VIII KHODIJAH', 'P', 'UCU RUKMANA', '081234567526', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Tri Nuryani, S.S., Gr.'],
      ['252607041', '3131857790', 'ZAHRA SYAFIAH MUZFIROH', 'VIII KHODIJAH', 'P', 'IIN RASINAMOMI HASR', '081234567527', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Tri Nuryani, S.S., Gr.'],

      // 6. IX ABU BAKAR (24 Murid Resmi Format Excel)
      ['242507001', '0117324850', 'ABDILLAH ZULQARNAIN ARRAZI', 'IX ABU BAKAR', 'L', 'NANANG FAJAR', '081234567801', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507002', '0126742730', 'AL-FATTAH IBNU SYAM', 'IX ABU BAKAR', 'L', 'NURYAMSI', '081234567802', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507003', '0121730361', 'ALDENTA DWIKA PRADIPTA', 'IX ABU BAKAR', 'L', 'SUGIYANTO', '081234567803', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507055', '0088162383', 'AMMAR YASIR MUHAMMAD BALASWAD', 'IX ABU BAKAR', 'L', 'YASIR ARAFAT', '081234567804', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['252607053', '3124124773', 'ASHIM MUHAMMAD AL-HILALY', 'IX ABU BAKAR', 'L', 'RISDAH KAHAR', '081234567805', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507005', '0121614652', 'AZKA WAFI ATHAYA', 'IX ABU BAKAR', 'L', 'ARI KURNIATI', '081234567806', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507006', '0128786069', 'BIMASENA NARARYA MALIKUL', 'IX ABU BAKAR', 'L', 'DEDE MALIKUL SALEH', '081234567807', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507007', '0128967426', 'DAFFA RAHMAT AZAMI', 'IX ABU BAKAR', 'L', 'BASYIR', '081234567808', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507008', '0128176044', 'GHAISAN ARFA RAVELLIO', 'IX ABU BAKAR', 'L', 'AGUS SUBARI', '081234567809', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507009', '0118047347', 'ISA RAFIF NAILU', 'IX ABU BAKAR', 'L', 'TAUFIK CAHYADI', '081234567810', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507070', '3113834464', 'ISMAIL TAUFIK KELEIB', 'IX ABU BAKAR', 'L', 'TAUFIK SAID', '081234567811', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507013', '0127073029', 'LIEVE LUTHFI', 'IX ABU BAKAR', 'L', 'MAULANA', '081234567812', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507010', '0124856298', 'LIONEL NAGAZKHA IRAWAN TOBING', 'IX ABU BAKAR', 'L', 'CHANDRA VIA IRAWAN TOBING', '081234567813', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507014', '0116379795', 'MARIQ ATHALLA MUNIARTO', 'IX ABU BAKAR', 'L', 'DENNY MUNIARTO', '081234567814', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507012', '0127661656', 'MUHAMMAD AL BAIS SAHID ROKHIM', 'IX ABU BAKAR', 'L', 'RUMANTO', '081234567815', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507017', '0126570857', 'MUHAMMAD AZKA NAUFAL SAPUTRA', 'IX ABU BAKAR', 'L', 'ERPAN NURDIN', '081234567816', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507018', '0128982223', 'MUHAMMAD DAFFA HAFIZHSYACH AKBAR', 'IX ABU BAKAR', 'L', 'NANDANG SETIADI', '081234567817', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507022', '0125620169', 'MUHAMMAD HAIKAL FURQON ASYRAF', 'IX ABU BAKAR', 'L', 'AGUNG GUNAWAN', '081234567818', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507071', '0129211849', 'MUHAMMAD HASAN AR-RASYID', 'IX ABU BAKAR', 'L', 'HAIRONI', '081234567819', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507015', '0115437903', 'MUHAMMAD SYABIL A\'ZAWAWI OKTAVIANSYAH', 'IX ABU BAKAR', 'L', 'SUTRAJI', '081234567820', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['252607058', '0111077140', 'QINDI SAKHI ZAIDAN', 'IX ABU BAKAR', 'L', 'BUDI SANTOSO', '081234567821', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507016', '0117518987', 'QUARTO KENZIE PRAKOSO', 'IX ABU BAKAR', 'L', 'JOKO MARYANTO', '081234567822', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507025', '0126652376', 'RAKA PRASRAYA KAYANA', 'IX ABU BAKAR', 'L', 'AGUS HERMANTO', '081234567823', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['242507067', '0126800617', 'UKASYAH YAZID ALI', 'IX ABU BAKAR', 'L', 'NUR ALI FIKRI', '081234567824', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      
      // 7. IX UMMU SALAMAH (26 Murid Resmi Format Excel)
      ['242507019', '0128223754', 'ADELA NOLLY RIYANTO', 'IX UMMU SALAMAH', 'P', 'TINO RIYANTO', '081234567901', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['242507020', '0128083582', 'AIDAH HURIAH MUMTAZAH SUGITO', 'IX UMMU SALAMAH', 'P', 'SUGITO', '081234567902', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['242507021', '0123290386', 'AISYAH DAAMIYAA NUR SA ADAH', 'IX UMMU SALAMAH', 'P', 'WAHYU JUNAEDI', '081234567903', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['242507004', '0126472680', 'ALIKA RAMADINA SETIAWAN', 'IX UMMU SALAMAH', 'P', 'ANDREW HERYANTO SETIA', '081234567904', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Sumiati, S.Pd., Gr.'],
      ['242507023', '0124288742', 'ALISHA MALAIKA ARIFIANTO', 'IX UMMU SALAMAH', 'P', 'MUHAMMAD FAJAR ARIFIANTO', '081234567905', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Sumiati, S.Pd., Gr.'],
      ['242507024', '0121553565', 'ALISHA PRIYANKA ANINDITA', 'IX UMMU SALAMAH', 'P', 'DENNY HERIAWAN', '081234567906', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Sumiati, S.Pd., Gr.'],
      ['242507045', '3125848379', 'ANNISA NABILA SAKHI', 'IX UMMU SALAMAH', 'P', 'HERMAWAN SETIADI', '081234567907', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Sumiati, S.Pd., Gr.'],
      ['242507056', '3111653622', 'BUTSAINAH ABDULLAH QASIM', 'IX UMMU SALAMAH', 'P', 'ABDULLAH NANI', '081234567908', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['242507026', '0128738802', 'CHALISA AFIYAH ABDI', 'IX UMMU SALAMAH', 'P', 'CHAIRUL ABDI SARBAINI', '081234567909', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['242507027', '0129837419', 'CHAYYARA AILA JANEETA', 'IX UMMU SALAMAH', 'P', 'MUHAMAD BAIHAKI', '081234567910', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Sumiati, S.Pd., Gr.'],
      ['242507028', '0123148760', 'ESHAL CALYSTA', 'IX UMMU SALAMAH', 'P', 'WAWAN', '081234567911', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Sumiati, S.Pd., Gr.'],
      ['242507029', '0119747032', 'FALISHA JASMINE BUDIMAN', 'IX UMMU SALAMAH', 'P', 'IMAN BUDIMAN', '081234567912', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Sumiati, S.Pd., Gr.'],
      ['242507030', '3114526209', 'FIRLI OKTAVIANI HERMAWAN', 'IX UMMU SALAMAH', 'P', 'FITRIYAH NURLIYANTI', '081234567913', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['242507031', '0117217743', 'GHAIDA ALIN NADA', 'IX UMMU SALAMAH', 'P', 'DJOKO KURNIAWAN', '081234567914', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['2425070100', '3125724860', 'HANIFAH AS-SUNDAWIYAH', 'IX UMMU SALAMAH', 'P', 'KHAERUDIN', '081234567915', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Sumiati, S.Pd., Gr.'],
      ['242507032', '0125571433', 'JASMINE ALLIYA PUTRI', 'IX UMMU SALAMAH', 'P', 'GLEN ANDREAS', '081234567916', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Sumiati, S.Pd., Gr.'],
      ['242507011', '0113977545', 'JASMINE NADIAH WARDHANI', 'IX UMMU SALAMAH', 'P', 'HENDRO CANDRA WARDH', '081234567917', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['242507033', '3123490512', 'JIEHAN SEKAR MAHESWARI', 'IX UMMU SALAMAH', 'P', 'ADE RACHMAT TAUFIK D', '081234567918', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Sumiati, S.Pd., Gr.'],
      ['242507034', '0126895489', 'MAKAILA KHANZA AZZAHRA', 'IX UMMU SALAMAH', 'P', 'MARIMIN', '081234567919', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['252607060', '3114002206', 'NAJLAA SYAHIRAH SYIFA\'A', 'IX UMMU SALAMAH', 'P', 'RISNAWATY', '081234567920', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Sumiati, S.Pd., Gr.'],
      ['242507035', '0113480749', 'RADELLA GITHA OCTAVIANA', 'IX UMMU SALAMAH', 'P', 'AHMAD SUHENDRA', '081234567921', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['252607061', '0126992446', 'RAISA ARISTYA SARASWATI', 'IX UMMU SALAMAH', 'P', 'ARIS SUMARLIN', '081234567922', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Sumiati, S.Pd., Gr.'],
      ['242507036', '0121734069', 'RR. SHOFIA PUTERI NIRWANI', 'IX UMMU SALAMAH', 'P', 'R. NOVEM IRWANTOKO A', '081234567923', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['242507037', '0127484601', 'SARAH ZAKIYYA SHALEH', 'IX UMMU SALAMAH', 'P', 'SALMAN', '081234567924', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Sumiati, S.Pd., Gr.'],
      ['242507043', '0123343195', 'SEYLA ALEXANDRA KAWENGIAN', 'IX UMMU SALAMAH', 'P', 'ROYKE DEREK KAWENGIAN', '081234567925', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Sumiati, S.Pd., Gr.'],
      ['242507038', '0126637571', 'SYAZANI PUTRIGIY', 'IX UMMU SALAMAH', 'P', 'SUMARGIYANTO', '081234567926', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Sumiati, S.Pd., Gr.']
    ];
    sheetMurid.getRange(2, 1, defaultMurid.length, 15).setValues(defaultMurid);
  }
  
  // 4. Skema Nilai_Akademik (REKAP NILAI, CHECKLIST TP & CAPAIAN KOMPETENSI)
  const sheetAkademik = getOrCreateSheet(DB_CONFIG.SHEET_AKADEMIK, [
    'id', 'nis', 'semester', 'tahun_ajaran', 'mata_pelajaran', 'kkm', 'nilai_tugas', 'nilai_uts', 'nilai_akhir', 'predikat', 'capaian_kompetensi', 'catatan_guru', 'tp_optimal', 'tp_peningkatan'
  ]);
  if (sheetAkademik.getLastRow() <= 1) {
    const defaultAkademik = [
      ['NA-001', '232407021', 'Ganjil', '2025/2026', 'Akidah', 75, 87, 87, 87, 'A', 'Menunjukkan penguasaan yang sangat baik dalam memahami dasar aqidah Islam tentang mengenal Allah & sifat-sifat-Nya dan menjelaskan rukun iman.', 'Sangat aktif dalam pembelajaran.', 'TP-AKD-01,TP-AKD-02', ''],
      ['NA-002', '232407021', 'Ganjil', '2025/2026', 'Akhlak', 75, 88, 88, 88, 'A', 'Menunjukkan penguasaan yang sangat baik dalam menerapkan adab menuntut ilmu dan menghormati guru serta menunjukkan adab birrul walidain.', 'Pertahankan akhlak terpuji.', 'TP-AKH-01,TP-AKH-02', ''],
      ['NA-003', '232407021', 'Ganjil', '2025/2026', 'Hadits', 75, 82, 82, 82, 'B', 'Menunjukkan penguasaan yang baik dalam menghafal matan & terjemah hadits tentang niat dan kebersihan.', 'Tingkatkan muroja\'ah hadits.', 'TP-HDT-01', 'TP-HDT-02'],
      ['NA-004', '232407021', 'Ganjil', '2025/2026', 'Fikih', 75, 90, 92, 91, 'A', 'Menunjukkan penguasaan yang sangat baik dalam memahami tata cara thaharah dan mempraktikkan shalat fardhu dengan tertib.', 'Praktik ibadah sangat baik.', 'TP-FKH-01,TP-FKH-02', ''],
      ['NA-005', '232407021', 'Ganjil', '2025/2026', 'SKI', 75, 80, 80, 80, 'B', 'Menunjukkan penguasaan yang baik dalam memahami strategi dakwah Rasulullah SAW periode Makkah.', 'Terus tingkatkan literasi sejarah.', 'TP-SKI-01', 'TP-SKI-02'],
      ['NA-006', '232407021', 'Ganjil', '2025/2026', 'Pendidikan Pancasila', 75, 85, 85, 85, 'B', 'Menunjukkan penguasaan yang baik dalam menganalisis sejarah kelahiran dan penetapan Pancasila serta norma warga negara.', 'Sikap toleran dan beradab.', 'TP-PPN-01,TP-PPN-02', ''],
      ['NA-007', '232407021', 'Ganjil', '2025/2026', 'Bahasa Indonesia', 75, 93, 93, 93, 'A', 'Menunjukkan penguasaan yang sangat baik dalam menganalisis struktur dan ciri kebahasaan teks deskripsi serta menelaah unsur pembangun puisi rakyat.', 'Literasi sangat baik.', 'TP-BIN-01,TP-BIN-02', ''],
      ['NA-008', '232407021', 'Ganjil', '2025/2026', 'Bahasa Inggris', 75, 78, 78, 78, 'B', 'Menunjukkan penguasaan yang baik dalam menggunakan ungkapan salam dan to be. Perlu peningkatan dalam memahami teks deskriptif Simple Present Tense.', 'Tingkatkan conversation.', 'TP-BIG-01', 'TP-BIG-02'],
      ['NA-009', '232407021', 'Ganjil', '2025/2026', 'Matematika', 75, 84, 84, 84, 'B', 'Menunjukkan penguasaan yang baik dalam memahami operasi hitung bilangan bulat dan bilangan rasional.', 'Penalaran baik.', 'TP-MTK-01', 'TP-MTK-02'],
      ['NA-010', '232407021', 'Ganjil', '2025/2026', 'Ilmu Pengetahuan Alam', 75, 85, 85, 85, 'B', 'Menunjukkan penguasaan yang baik dalam menerapkan konsep besaran dan pengukuran fisis secara akurat serta menganalisis klasifikasi zat.', 'Eksperimen baik.', 'TP-IPA-01,TP-IPA-02', ''],
      ['NA-011', '232407021', 'Ganjil', '2025/2026', 'Ilmu Pengetahuan Sosial', 75, 89, 89, 89, 'B', 'Menunjukkan penguasaan yang baik dalam menghubungkan kondisi geografis dengan karakteristik sosial masyarakat dan potensi sumber daya alam.', 'Analisis spasial baik.', 'TP-IPS-01,TP-IPS-02', ''],
      ['NA-012', '232407021', 'Ganjil', '2025/2026', 'Prakarya', 75, 86, 86, 86, 'B', 'Menunjukkan penguasaan yang baik dalam mengidentifikasi bahan baku alami untuk produk kerajinan bernilai estetika.', 'Kreatif.', 'TP-PKY-01', ''],
      ['NA-013', '232407021', 'Ganjil', '2025/2026', 'Pendidikan Jasmani, Olahraga, dan Kesehatan', 75, 89, 89, 89, 'B', 'Menunjukkan penguasaan yang baik dalam mempraktikkan gerak dasar permainan invasi bola basket dan bola voli.', 'Sportif.', 'TP-PJK-01,TP-PJK-02', ''],
      ['NA-014', '232407021', 'Ganjil', '2025/2026', 'Bahasa Sunda', 75, 90, 90, 90, 'A', 'Menunjukkan penguasaan yang sangat baik dalam memahami struktur carita dongeng Sunda dan tatakrama basa Sunda.', 'Sangat baik.', 'TP-SUN-01,TP-SUN-02', ''],
      ['NA-015', '232407021', 'Ganjil', '2025/2026', 'Informatika', 75, 85, 85, 85, 'B', 'Menunjukkan penguasaan yang baik dalam menerapkan berpikir komputasional dalam menyelesaikan persoalan serta mengolah data lembar kerja.', 'Logika baik.', 'TP-INF-01,TP-INF-02', ''],
      ['NA-016', '232407021', 'Ganjil', '2025/2026', 'Bahasa Arab', 75, 76, 76, 76, 'C', 'Menunjukkan penguasaan yang cukup baik dalam mufrodat perkenalan. Perlu bimbingan dalam membedakan isim isyarah mudzakkar dan muannats.', 'Tingkatkan hafalan mufrodat.', 'TP-ARB-01', 'TP-ARB-02']
    ];
    sheetAkademik.getRange(2, 1, defaultAkademik.length, 14).setValues(defaultAkademik);
    seedDewiFitriaGrades();
  }

  // 4b. Skema Tujuan_Pembelajaran (MODUL TP KURIKULUM MERDEKA 16 MAPEL)
  const sheetTP = getOrCreateSheet(DB_CONFIG.SHEET_TP, [
    'id', 'kode_tp', 'mata_pelajaran', 'tingkat_kelas', 'fase', 'semester', 'tahun_ajaran', 'deskripsi_tp', 'ringkasan_tp', 'status', 'created_at'
  ]);
  if (sheetTP.getLastRow() <= 1) {
    const defaultTPs = getDefaultTujuanPembelajaranData();
    if (defaultTPs && defaultTPs.length > 0) {
      const tpRows = defaultTPs.map(t => [
        t.id,
        t.kode_tp,
        t.mata_pelajaran,
        t.tingkat_kelas,
        t.fase,
        t.semester,
        t.tahun_ajaran,
        t.deskripsi_tp,
        t.ringkasan_tp,
        t.status,
        t.created_at || '2026-07-01'
      ]);
      sheetTP.getRange(2, 1, tpRows.length, 11).setValues(tpRows);
    }
  }
  
  // 5. Skema Nilai_Kepemimpinan (6 ASPEK AHLAQ & KEPRIBADIAN EXCEL AL-IMAM)
  const sheetKepemimpinan = getOrCreateSheet(DB_CONFIG.SHEET_KEPEMIMPINAN, [
    'id', 'nis', 'semester', 'tahun_ajaran', 'ibadah', 'akhlak', 'kedisiplinan_kerajinan', 'kerapihan_kebersihan', 'kepemimpinan', 'kerjasama', 'catatan_diperhatikan', 'catatan_pembina'
  ]);
  if (sheetKepemimpinan.getLastRow() <= 1) {
    const defaultKepemimpinan = [
      [
        'NK-001', '232407021', 'Ganjil', '2025/2026',
        'Jadikan ibadah sebagai kebutuhan, bukan hanya kewajiban.',
        'Alhamdulillah, pertahankan akhlak baikmu di mana saja Ananda berada',
        'Jadikanlah kedisiplinan dan kerajinan sebagai bekalmu dalam meraih cita-cita',
        'Kerapihan & kebersihan diri merupakan cermin pribadi seorang muslim, jadikanlah itu sebagai identitasmu',
        'Kemampuan memimpinmu terlihat baik, lanjutkan usahamu mengajak teman-teman dalam kebaikan',
        'Berbagi peran dalam kerjasama kelompok akan menciptakan keharmonisan',
        'Ketekunan dalam belajar saat ini merupakan wujud keseriusan untuk meraih hasil belajar yang maksimal & cita-cita di masa depan.',
        'Sangat disiplin dan menunjukkan keteladanan yang baik bagi teman-temannya.'
      ],
      [
        'NK-002', '232407001', 'Ganjil', '2025/2026',
        'Jadikan ibadah sebagai kebutuhan, bukan hanya kewajiban.',
        'Alhamdulillah, pertahankan akhlak baikmu di mana saja Ananda berada',
        'Jadikanlah kedisiplinan dan kerajinan sebagai bekalmu dalam meraih cita-cita',
        'Kerapihan & kebersihan diri dan lingkungan akan menciptakan rasa nyaman dalam belajar',
        'Kemampuan memimpinmu terlihat baik, lanjutkan usahamu mengajak teman-teman dalam kebaikan',
        'Berbagi peran dalam kerjasama kelompok akan menciptakan keharmonisan',
        'Sudah menunjukkan sikap belajar yang positif. Tingkatkan lagi ketekunan dan manajemen waktumu agar hasilnya semakin baik.',
        'Ananda santun dan sangat aktif di kelas.'
      ]
    ];
    sheetKepemimpinan.getRange(2, 1, defaultKepemimpinan.length, 12).setValues(defaultKepemimpinan);
  }

  // 6. Skema Nilai_SKL_Kepemimpinan (28 INDIKATOR KEPEMIMPINAN EXCEL AL-IMAM)
  const sklHeaders = ['id', 'nis', 'semester', 'tahun_ajaran', 'catatan_walas', 'd1','d2','d3','d4','d5','d6','d7','k1','k2','k3','k4','k5','p1','p2','p3','p4','p5','s1','s2','t1','t2','m1','m2','r1','r2','r3','j1','j2','h1'];
  const sheetSkl = getOrCreateSheet(DB_CONFIG.SHEET_SKL_KEPEMIMPINAN, sklHeaders);
  if (sheetSkl.getLastRow() <= 1) {
    const defaultSkl = [
      ['SKL-232407001', '232407001', 'Tengah Semester 1', '2025/2026', 'Sudah memiliki potensi kepemimpinan alami; perlu ditingkatkan kemampuan mengambil keputusan dan mengatur waktu.', 'B','A','A','A','A','A','A', 'A','A','A','A','A', 'A','A','A','A','A', 'A','A', 'A','B', 'A','A', 'A','A','A', 'A','A', 'A'],
      ['SKL-232407005', '232407005', 'Tengah Semester 1', '2025/2026', 'Telah menunjukkan sikap tanggung jawab dan disiplin; terus latih kemampuan komunikasi agar lebih efektif dalam memimpin.', 'A','A','A','A','A','A','A', 'A','A','A','A','A', 'A','B','A','A','A', 'A','A', 'A','B', 'A','A', 'A','A','A', 'A','A', 'A'],
      ['SKL-232407021', '232407021', 'Tengah Semester 1', '2025/2026', 'Kemampuan memimpinmu terlihat baik, lanjutkan usahamu mengajak teman-teman dalam kebaikan', 'A','A','A','A','A','A','A', 'B','B','B','B','B', 'A','A','A','A','A', 'A','A', 'A','A', 'A','A', 'A','A','A', 'A','A', 'A'],
      ['SKL-252607006', '252607006', 'Tengah Semester 1', '2025/2026', 'Jadikanlah kedisiplinan dan kerajinan sebagai bekalmu dalam meraih cita-cita', 'A','A','A','A','A','A','A', 'A','A','A','A','A', 'A','A','A','A','A', 'A','A', 'A','A', 'A','A', 'A','A','A', 'A','A', 'A'],
      ['SKL-252607013', '252607013', 'Tengah Semester 1', '2025/2026', 'Tingkatkan semangat dan keseriusan dalam belajar agar mendapat hasil yang maksimal.', 'A','A','A','B','A','A','A', 'A','A','A','A','A', 'A','A','A','A','A', 'A','A', 'A','A', 'A','A', 'A','A','A', 'A','A', 'A'],
      ['SKL-252607038', '252607038', 'Tengah Semester 1', '2025/2026', 'Ananda memiliki semangat kepemimpinan yang kuat dan inspiratif bagi teman-temannya, lanjutkan usahamu mengajak teman-teman dalam kebaikan', 'A','A','A','A','A','A','A', 'A','B','B','B','B', 'B','B','A','A','A', 'B','A', 'A','A', 'A','A', 'A','A','A', 'A','A', 'A'],
      ['SKL-242507019', '242507019', 'Tengah Semester 1', '2025/2026', 'Ananda adalah rekan tim yang menyenangkan; ia kooperatif, sopan, dan mampu menyelesaikan bagian tugasnya dengan tuntas.', 'A','A','A','A','A','A','A', 'A','A','A','A','A', 'A','A','A','A','A', 'A','A', 'A','A', 'A','A', 'A','A','A', 'A','A', 'A']
    ];
    sheetSkl.getRange(2, 1, defaultSkl.length, sklHeaders.length).setValues(defaultSkl);
  }
  
  // 7. Skema Nilai_Diniyah
  const sheetDiniyah = getOrCreateSheet(DB_CONFIG.SHEET_DINIYAH, [
    'id', 'nis', 'semester', 'tahun_ajaran', 'ziyadah_juz', 'murojaah_juz', 'nilai_tahfidz', 'adab_harian', 'ibadah_harian', 'bahasa_arab', 'catatan_musyrif'
  ]);
  if (sheetDiniyah.getLastRow() <= 1) {
    const defaultDiniyah = [
      ['ND-001', '232407021', 'Ganjil', '2025/2026', 'Juz 30 & Juz 29 (Lancar)', 'Juz 30 (Mutqin)', 94, 'Mumtaz (A)', 'Mumtaz (A)', 90, 'Alhamdulillah capaian ziyadah melampaui target tengah semester. Makhraj huruf, kaidah mad, dan tajwid sangat baik.'],
      ['ND-002', '232407001', 'Ganjil', '2025/2026', 'Juz 30 (15 Halaman)', 'Juz 30 (Surah An-Naba s.d At-Takwir)', 86, 'Jayyid Jiddan (B)', 'Mumtaz (A)', 84, 'Konsisten dalam halaqah tahfidz. Perlu penekanan pada kelancaran murojaah juz 30 secara mandiri.']
    ];
    sheetDiniyah.getRange(2, 1, defaultDiniyah.length, 11).setValues(defaultDiniyah);
  }

  // 8. Skema Log_Aktivitas (AUDIT TRAIL LOG AKTIVITAS AKUN)
  const sheetLogs = getOrCreateSheet(DB_CONFIG.SHEET_LOGS, [
    'id', 'timestamp', 'username', 'user_nama', 'role', 'action_type', 'module', 'details', 'ip_address', 'status'
  ]);
  if (sheetLogs.getLastRow() <= 1) {
    const defaultLogs = [
      ['LOG-001', '2026-10-02 18:30:15', 'admin', 'Administrator Utama', 'admin', 'LOGIN', 'Autentikasi', 'Login berhasil ke dashboard sistem', '127.0.0.1', 'success'],
      ['LOG-002', '2026-10-02 18:35:40', 'dewi', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'guru', 'BULK_SAVE_GRADE', 'Nilai Akademik', 'Menyimpan nilai sekelas Bahasa Indonesia untuk 24 siswa di IX ABU BAKAR', '192.168.1.12', 'success'],
      ['LOG-003', '2026-10-02 18:42:10', 'dewi', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'guru', 'AUTO_CHECKLIST_TP', 'Tujuan Pembelajaran', 'Melakukan auto-checklist rekomendasi TP dan narasi rapor kelas IX ABU BAKAR', '192.168.1.12', 'success'],
      ['LOG-004', '2026-10-02 18:50:22', 'triyuli', 'Tri Yuli Aryani, S.Pd., Gr.', 'guru', 'UPDATE_TP', 'Tujuan Pembelajaran', 'Memperbarui ringkasan TP 2 Matematika Fase D', '192.168.1.15', 'success'],
      ['LOG-005', '2026-10-02 19:10:05', 'kepsek', 'Arif Rohman, S.Sos., M.Pd.', 'kepala_sekolah', 'VIEW_RAPOR', 'Rapor Portofolio', 'Melihat pratinjau buku leger dan validasi siap cetak kelas IX', '192.168.1.5', 'success']
    ];
    sheetLogs.getRange(2, 1, defaultLogs.length, 10).setValues(defaultLogs);
  }
  
  return { status: 'success', message: 'Inisialisasi skema database Google Sheets berhasil!' };
}

/**
 * ============================================================================
 * FORCE SYNC / SINKRONISASI DATABASE KE GOOGLE SPREADSHEET
 * Memperbarui Settings 2026/2027, 6 Walas, 159 Murid, dan Nilai ke Google Sheets
 * ============================================================================
 */
function forceSyncDatabaseToSpreadsheet() {
  const ss = getDb();
  
  // 1. Settings_CMS
  const sheetSettings = getOrCreateSheet(DB_CONFIG.SHEET_SETTINGS, ['key', 'value', 'category', 'description']);
  if (sheetSettings.getLastRow() > 1) {
    sheetSettings.getRange(2, 1, sheetSettings.getLastRow() - 1, 4).clearContent();
  }
  const defaultSettings = [
    ['school_name', 'SMP Al-Imam Islamic School (AI IS)', 'general', 'Nama Lengkap Sekolah'],
    ['school_address', 'Jl. Harjamukti No. 12, Cimanggis, Kota Depok, Jawa Barat', 'general', 'Alamat Lengkap Sekolah'],
    ['school_phone', '(021) 8775-4321 / 0812-9876-5432', 'general', 'Telepon/Kontak Sekolah'],
    ['school_website', 'https://alimamischool.com', 'general', 'Situs Web Resmi'],
    ['school_logo_url', 'https://alimamischool.com/wp-content/uploads/2020/08/Al-Imam-Islamic-School-alimamischool.com-sekolah-sunnah-logo.png', 'appearance', 'URL Logo Sekolah'],
    ['theme_primary_color', '#1e3a8a', 'appearance', 'Warna Primer (Hex)'],
    ['theme_secondary_color', '#0284c7', 'appearance', 'Warna Sekunder (Hex)'],
    ['theme_accent_color', '#10b981', 'appearance', 'Warna Aksen (Hex)'],
    ['theme_sidebar_dark', 'true', 'appearance', 'Mode Gelap Sidebar (true/false)'],
    ['academic_year', '2026/2027', 'academic', 'Tahun Ajaran Aktif'],
    ['academic_years_list', '2026/2027,2027/2028,2028/2029,2025/2026,2024/2025', 'academic', 'Daftar Pilihan Tahun Ajaran'],
    ['semester_active', 'Tengah Semester 1', 'academic', 'Semester Aktif (Tengah Semester 1 / Akhir Semester 1 / Tengah Semester 2 / Akhir Semester 2)'],
    ['report_date', '17 Oktober 2026', 'academic', 'Tanggal Titimangsa Rapor'],
    ['report_place', 'Bogor', 'academic', 'Kota Pembagian Rapor'],
    ['wali_kelas_default', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'academic', 'Wali Kelas Default'],
    ['headmaster_name', 'Arif Rohman, S.Sos., M.Pd.', 'signatory', 'Nama Kepala Sekolah'],
    ['headmaster_nip', '', 'signatory', 'NIP/NIY Kepala Sekolah'],
    ['headmaster_signature_url', '', 'signatory', 'URL Gambar TTD Kepala Sekolah (Opsional)'],
    ['report_footer_text', 'RAPOR TENGAH SEMESTER PROGRAM PORTOFOLIO SMP AL IMAM ISLAMIC SCHOOL', 'general', 'Teks Footer Rapor']
  ];
  sheetSettings.getRange(2, 1, defaultSettings.length, 4).setValues(defaultSettings);

  // 2. Users (Role Admin, 12 Guru Mapel, & Wali Murid)
  const sheetUsers = getOrCreateSheet(DB_CONFIG.SHEET_USERS, ['id', 'username', 'password_hash', 'nama_lengkap', 'role', 'status', 'created_at', 'nis', 'mapel']);
  if (sheetUsers.getLastRow() > 1) {
    sheetUsers.getRange(2, 1, sheetUsers.getLastRow() - 1, sheetUsers.getLastColumn()).clearContent();
  }
    ['USR-001', 'arifrohman', 'arif123', 'Gr. Arif Rohman, S.Sos., M.Pd.', 'admin', 'aktif', '2026-07-01', '', 'Fikih, Semua Mapel'],
    ['USR-002', 'dewi', 'dewi123', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'admin', 'aktif', '2026-07-01', '', 'Bahasa Indonesia, Semua Mapel'],
    ['USR-003', 'zamzam', 'zamzam123', 'Zam-zam Nasrullah, S.Pd.', 'admin', 'aktif', '2026-07-01', '', 'Akhlak, Hadits'],
    ['USR-004', 'asril', 'asril123', 'Asril Ardiansyah, S.H., Gr.', 'admin', 'aktif', '2026-07-01', '', 'SKI, Bahasa Arab'],
    ['USR-005', 'aning', 'aning123', 'Aning Nurhayati, S.T., Gr.', 'admin', 'aktif', '2026-07-01', '', 'Informatika, Prakarya, SBDP'],
    ['USR-006', 'trinuryani', 'tri123', 'Tri Nuryani, S.S., Gr.', 'admin', 'aktif', '2026-07-01', '', 'Bahasa Inggris'],
    ['USR-007', 'sumiati', 'sumi123', 'Sumiati, S.Pd., Gr.', 'admin', 'aktif', '2026-07-01', '', 'Ilmu Pengetahuan Sosial, BK'],
    ['USR-008', 'triyuli', 'triyuli123', 'Tri Yuli Aryani, S.Pd., Gr.', 'admin', 'aktif', '2026-07-01', '', 'Matematika'],
    ['USR-009', 'eliumiyati', 'eli123', 'Eli Umiyati, S.Pd., Gr.', 'admin', 'aktif', '2026-07-01', '', 'Ilmu Pengetahuan Alam'],
    ['USR-010', 'kahlilgibran', 'kahlil123', 'Kahlil Gibran, S.Pd., Gr.', 'admin', 'aktif', '2026-07-01', '', 'Pendidikan Pancasila, Bahasa Arab'],
    ['USR-011', 'guntur', 'guntur123', 'Guntur Ageng Auliawan, S.Pd.', 'admin', 'aktif', '2026-07-01', '', 'Pendidikan Jasmani, Olahraga, dan Kesehatan, Bahasa Sunda'],
    ['USR-012', 'nunung', 'nunung123', 'Nunung Lastika Adiansyah, S.Pd.', 'admin', 'aktif', '2026-07-01', '', 'Akidah, Fikih'],
    ['USR-013', 'admin', 'admin123', 'Administrator Utama', 'admin', 'aktif', '2026-07-01', '', 'Semua Mapel'],
    ['USR-014', 'walimurid', 'wali123', 'Bpk. Nanang Fajar', 'wali_murid', 'aktif', '2026-07-01', '242507001', '-']
  ];
  sheetUsers.getRange(2, 1, defaultUsers.length, 9).setValues(defaultUsers);

  // 3. Murid (Data 159 Murid Resmi Sesuai Excel Al-Imam)
  let sheetMurid = ss.getSheetByName(DB_CONFIG.SHEET_MURID);
  const legacySantri = ss.getSheetByName(DB_CONFIG.SHEET_SANTRI_LEGACY);
  if (!sheetMurid && legacySantri) {
    try {
      legacySantri.setName(DB_CONFIG.SHEET_MURID);
      sheetMurid = legacySantri;
    } catch (e) {
      sheetMurid = legacySantri;
    }
  }
  if (!sheetMurid) {
    sheetMurid = getOrCreateSheet(DB_CONFIG.SHEET_MURID, [
      'nis', 'nisn', 'nama_murid', 'kelas', 'jenis_kelamin', 'nama_wali', 'kontak_wali', 'status', 'kehadiran_s', 'kehadiran_i', 'kehadiran_a', 'ekskul_1', 'ekskul_1_nilai', 'ekskul_2', 'ekskul_2_nilai', 'ekskul_3', 'ekskul_3_nilai', 'wali_kelas'
    ]);
  }
  
  const muridHeaders = ['nis', 'nisn', 'nama_murid', 'kelas', 'jenis_kelamin', 'nama_wali', 'kontak_wali', 'status', 'kehadiran_s', 'kehadiran_i', 'kehadiran_a', 'ekskul_1', 'ekskul_1_nilai', 'ekskul_2', 'ekskul_2_nilai', 'ekskul_3', 'ekskul_3_nilai', 'wali_kelas'];
  sheetMurid.getRange(1, 1, 1, muridHeaders.length).setValues([muridHeaders]);
  sheetMurid.getRange(1, 1, 1, muridHeaders.length)
            .setBackground('#1e293b')
            .setFontColor('#ffffff')
            .setFontWeight('bold')
            .setHorizontalAlignment('center');
            
  if (sheetMurid.getLastRow() > 1) {
    sheetMurid.getRange(2, 1, Math.max(sheetMurid.getLastRow() - 1, 1), sheetMurid.getLastColumn()).clearContent();
  }
  
  // Re-run initDatabase to populate 159 murid & sheets
  initDatabase();
  seedDewiFitriaGrades();
  
  return {
    success: true,
    message: 'Seluruh data Settings 2026/2027, 6 Walas, dan 159 Murid berhasil disinkronkan ke Google Spreadsheet!'
  };
}

/**
 * ============================================================================
 * MODEL: CMS SETTINGS
 * ============================================================================
 */
function getSettings() {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SETTINGS, ['key', 'value', 'category', 'description']);
  const data = sheetToObjects(sheet);
  const settings = {};
  data.forEach(item => {
    if (item.key) settings[item.key] = item.value;
  });
  return settings;
}

function updateSettings(newSettings) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SETTINGS, ['key', 'value', 'category', 'description']);
  const data = sheet.getDataRange().getValues();
  const keys = Object.keys(newSettings);
  
  keys.forEach(key => {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(newSettings[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, newSettings[key], 'custom', '']);
    }
  });
  return { status: 'success', message: 'Pengaturan CMS berhasil diperbarui' };
}

/**
 * Kelola dan Tambah Tahun Ajaran Baru (Dapat digunakan Kepala Sekolah & Guru)
 */
function addAcademicYearSetting(newYear, semester) {
  if (!newYear || !newYear.trim()) return { status: 'error', message: 'Tahun ajaran tidak valid' };
  newYear = newYear.trim();
  const settings = getSettings();
  let listStr = settings.academic_years_list || '2026/2027,2025/2026,2024/2025';
  const list = listStr.split(',').map(s => s.trim()).filter(Boolean);
  if (!list.includes(newYear)) {
    list.unshift(newYear);
  }
  const payload = {
    academic_year: newYear,
    academic_years_list: list.join(',')
  };
  if (semester) payload.semester_active = semester;
  updateSettings(payload);
  return { 
    status: 'success', 
    message: 'Tahun Ajaran ' + newYear + ' berhasil ditambahkan dan diaktifkan!', 
    currentYear: newYear, 
    list: list 
  };
}

function getAcademicYearsList() {
  const settings = getSettings();
  let listStr = settings.academic_years_list || '2026/2027,2025/2026,2024/2025';
  const list = listStr.split(',').map(s => s.trim()).filter(Boolean);
  return {
    status: 'success',
    currentYear: settings.academic_year || '2026/2027',
    currentSemester: settings.semester_active || 'I (Satu)',
    list: list
  };
}

/**
 * Kelola Status Publikasi Rapor (Publish/Draft untuk Hak Akses Wali Murid)
 */
function getRaporPublishStatus(filters) {
  filters = filters || {};
  const settings = getSettings();
  const publishedClassesStr = settings.published_rapor_classes || '';
  const publishedStudentsStr = settings.published_rapor_students || '';
  
  const classKey = `${filters.kelas || ''}_${filters.tahun_ajaran || ''}_${filters.semester || ''}`;
  const studentKey = `${filters.nis || ''}_${filters.tahun_ajaran || ''}_${filters.semester || ''}`;
  
  const isClassPublished = publishedClassesStr.split(',').map(s => s.trim()).includes(classKey);
  const isStudentPublished = publishedStudentsStr.split(',').map(s => s.trim()).includes(studentKey);
  
  return {
    success: true,
    isPublished: isClassPublished || isStudentPublished,
    publishedClasses: publishedClassesStr,
    publishedStudents: publishedStudentsStr
  };
}

function setRaporPublishStatus(payload) {
  payload = payload || {};
  const settings = getSettings();
  let publishedClasses = (settings.published_rapor_classes || '').split(',').map(s => s.trim()).filter(Boolean);
  let publishedStudents = (settings.published_rapor_students || '').split(',').map(s => s.trim()).filter(Boolean);
  
  const classKey = `${payload.kelas || ''}_${payload.tahun_ajaran || ''}_${payload.semester || ''}`;
  const studentKey = `${payload.nis || ''}_${payload.tahun_ajaran || ''}_${payload.semester || ''}`;
  
  if (payload.target === 'class' || (!payload.target && payload.kelas)) {
    if (payload.is_published) {
      if (!publishedClasses.includes(classKey)) publishedClasses.push(classKey);
    } else {
      publishedClasses = publishedClasses.filter(k => k !== classKey);
    }
  }
  
  if (payload.target === 'student' || (!payload.target && payload.nis)) {
    if (payload.is_published) {
      if (!publishedStudents.includes(studentKey)) publishedStudents.push(studentKey);
    } else {
      publishedStudents = publishedStudents.filter(k => k !== studentKey);
    }
  }
  
  updateSettings({
    published_rapor_classes: publishedClasses.join(','),
    published_rapor_students: publishedStudents.join(',')
  });
  
  return {
    success: true,
    message: payload.is_published 
      ? 'Rapor kelas ' + (payload.kelas || '') + ' berhasil dipublikasikan ke Wali Murid!' 
      : 'Publikasi rapor kelas ' + (payload.kelas || '') + ' ditarik kembali ke mode Draft.',
    isPublished: payload.is_published,
    publishedClasses: publishedClasses.join(','),
    publishedStudents: publishedStudents.join(',')
  };
}

/**
 * ============================================================================
 * MODEL: USERS MANAGEMENT
 * ============================================================================
 */
function getAllUsers() {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_USERS);
  return sheetToObjects(sheet);
}

function saveUser(user) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_USERS, ['id', 'username', 'password_hash', 'nama_lengkap', 'role', 'status', 'created_at', 'nis', 'mapel']);
  const isNew = !user.id;
  const id = isNew ? 'USR-' + Utilities.getUuid().substring(0, 6).toUpperCase() : user.id;
  
  const existing = findRowByField(sheet, 'id', id);
  if (existing) {
    const rowIdx = existing.rowIndex;
    const headers = existing.headers;
    headers.forEach((h, colIdx) => {
      if (h === 'password_hash' && (!user.password_hash || user.password_hash === '')) {
        return; // Jangan overwrite jika password kosong
      }
      if (user[h] !== undefined) {
        sheet.getRange(rowIdx, colIdx + 1).setValue(user[h]);
      }
    });
  } else {
    sheet.appendRow([
      id,
      user.username,
      user.password_hash || '123456',
      user.nama_lengkap,
      user.role || 'guru',
      user.status || 'aktif',
      Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd'),
      user.nis || '',
      user.mapel || ''
    ]);
  }
  return { status: 'success', message: 'User berhasil disimpan', id: id };
}

function deleteUser(id) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_USERS);
  const match = findRowByField(sheet, 'id', id);
  if (match) {
    sheet.deleteRow(match.rowIndex);
    return { status: 'success', message: 'User berhasil dihapus' };
  }
  return { status: 'error', message: 'User tidak ditemukan' };
}

/**
 * ============================================================================
 * MODEL: DATA MURID (DATA SISWA & KELAS)
 * ============================================================================
 */
function getAllMurid(kelasFilter) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_MURID);
  let list = sheetToObjects(sheet);
  if (kelasFilter && kelasFilter !== 'Semua') {
    list = list.filter(s => String(s.kelas) === String(kelasFilter));
  }
  return list;
}

function getMuridByNis(nis) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_MURID);
  const list = sheetToObjects(sheet);
  const cleanNis = String(nis || '').trim();
  return list.find(s => 
    String(s.nis || '').trim() === cleanNis || 
    String(s.nisn || '').trim() === cleanNis ||
    String(s.id || '').trim() === cleanNis ||
    String(s.no || '').trim() === cleanNis
  ) || null;
}

function saveMurid(murid) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_MURID);
  const data = sheet.getDataRange().getValues();
  let headers = data.length > 0 ? data[0].map(h => String(h).trim()) : [];
  
  const requiredHeaders = [
    'nis', 'nisn', 'nama_murid', 'kelas', 'jenis_kelamin', 'nama_wali', 'kontak_wali', 'status',
    'kehadiran_s', 'kehadiran_i', 'kehadiran_a',
    'ekskul_1', 'ekskul_1_nilai', 'ekskul_2', 'ekskul_2_nilai', 'ekskul_3', 'ekskul_3_nilai', 'wali_kelas'
  ];
  
  let headerChanged = false;
  requiredHeaders.forEach(reqH => {
    if (headers.indexOf(reqH) === -1) {
      headers.push(reqH);
      headerChanged = true;
    }
  });

  if (headerChanged || headers.length === 0) {
    if (headers.length === 0) headers = requiredHeaders;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  const existing = findRowByField(sheet, 'nis', murid.nis);
  
  if (existing) {
    const rowIdx = existing.rowIndex;
    headers.forEach((h, colIdx) => {
      if (murid[h] !== undefined) {
        sheet.getRange(rowIdx, colIdx + 1).setValue(murid[h]);
      }
    });
  } else {
    const newRow = headers.map(h => {
      if (murid[h] !== undefined) return murid[h];
      if (h === 'ekskul_1') return murid.ekskul_1 || 'Pramuka';
      if (h === 'ekskul_1_nilai') return murid.ekskul_1_nilai || 'Baik';
      if (h === 'ekskul_2') return murid.ekskul_2 || 'Wushu';
      if (h === 'ekskul_2_nilai') return murid.ekskul_2_nilai || 'Baik';
      if (h === 'ekskul_3') return murid.ekskul_3 || 'Basket';
      if (h === 'ekskul_3_nilai') return murid.ekskul_3_nilai || 'Baik';
      if (h === 'status') return 'Aktif';
      return '-';
    });
    sheet.appendRow(newRow);
  }
  return { status: 'success', message: 'Data murid berhasil disimpan' };
}

function saveBulkMuridData(items) {
  if (!items || !Array.isArray(items)) return { status: 'error', message: 'Data items tidak valid' };
  items.forEach(item => {
    saveMurid(item);
  });
  return { status: 'success', message: 'Berhasil menyimpan data ' + items.length + ' murid' };
}

function deleteMurid(nis) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_MURID);
  const match = findRowByField(sheet, 'nis', nis);
  if (match) {
    sheet.deleteRow(match.rowIndex);
    return { status: 'success', message: 'Data murid berhasil dihapus' };
  }
  return { status: 'error', message: 'Data murid tidak ditemukan' };
}

// Aliases for backward compatibility
function getAllSantri(k) { return getAllMurid(k); }
function getSantriByNis(n) { return getMuridByNis(n); }
function saveSantri(s) { return saveMurid(s); }
function deleteSantri(n) { return deleteMurid(n); }

/**
 * ============================================================================
 * MODEL: NILAI AKADEMIK / REKAP NILAI (DENGAN KKM & CAPAIAN KOMPETENSI)
 * ============================================================================
 */
function getNilaiAkademikList(filters = {}) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_AKADEMIK);
  let list = sheetToObjects(sheet);
  
  const muridList = getAllMurid();
  const muridMap = {};
  muridList.forEach(s => { muridMap[s.nis] = s; });
  
  list = list.map(item => {
    const s = muridMap[item.nis] || {};
    return {
      ...item,
      nama_murid: s.nama_murid || s.nama_santri || 'Tidak Diketahui',
      nama_santri: s.nama_murid || s.nama_santri || 'Tidak Diketahui',
      kelas: s.kelas || item.kelas || '-'
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
  try {
    const requiredHeaders = [
      'id', 'nis', 'semester', 'tahun_ajaran', 'mata_pelajaran', 'kkm',
      'nilai_tugas', 'nilai_uts', 'nilai_akhir', 'predikat',
      'capaian_kompetensi', 'catatan_guru', 'tp_optimal', 'tp_peningkatan'
    ];

    const sheet = getOrCreateSheet(DB_CONFIG.SHEET_AKADEMIK, requiredHeaders);
    const headers = ensureSheetHeaders(sheet, requiredHeaders);

    const itemNis = String(data.nis || '').trim();
    const itemMapel = String(data.mata_pelajaran || '').trim();
    const itemSem = data.semester || 'Ganjil';
    const itemTa = data.tahun_ajaran || '2026/2027';

    const uts = Number(data.nilai_uts !== undefined && data.nilai_uts !== '' && !isNaN(data.nilai_uts) ? data.nilai_uts : (data.nilai_akhir || data.nilai || 85));
    const tugas = Number(data.nilai_tugas !== undefined && data.nilai_tugas !== '' && !isNaN(data.nilai_tugas) ? data.nilai_tugas : uts);
    const akhir = Number(data.nilai_akhir !== undefined && data.nilai_akhir !== '' && !isNaN(data.nilai_akhir) ? data.nilai_akhir : uts);
    const kkm = Number(data.kkm) || 75;
    const tpOptimal = Array.isArray(data.tp_optimal) ? data.tp_optimal.join(', ') : (data.tp_optimal || '');
    const tpPeningkatan = Array.isArray(data.tp_peningkatan) ? data.tp_peningkatan.join(', ') : (data.tp_peningkatan || '');
    const capaian = data.capaian_kompetensi || data.catatan_guru || '';

    let predikat = data.predikat;
    if (!predikat || predikat === '-') {
      if (akhir >= 92) predikat = 'A';
      else if (akhir >= 84) predikat = 'B';
      else if (akhir >= 75) predikat = 'C';
      else if (akhir > 0) predikat = 'D';
      else predikat = '-';
    }

    let existing = null;
    if (data.id) {
      existing = findRowByField(sheet, 'id', data.id);
    }
    if (!existing && itemNis && itemMapel) {
      existing = findRowByCompositeKey(sheet, {
        nis: itemNis,
        mata_pelajaran: itemMapel,
        semester: itemSem,
        tahun_ajaran: itemTa
      });
    }

    const id = existing
      ? (existing.values[existing.headers.indexOf('id')] || data.id || ('NA-' + itemNis + '-' + itemMapel.replace(/\s+/g, '')))
      : (data.id || ('NA-' + itemNis + '-' + itemMapel.replace(/\s+/g, '')));

    const payload = {
      ...data,
      id: id,
      nis: itemNis,
      semester: itemSem,
      tahun_ajaran: itemTa,
      mata_pelajaran: itemMapel,
      kkm: kkm,
      nilai_tugas: tugas,
      nilai_uts: uts,
      nilai_akhir: akhir,
      predikat: predikat,
      capaian_kompetensi: capaian,
      catatan_guru: capaian,
      tp_optimal: tpOptimal,
      tp_peningkatan: tpPeningkatan
    };

    if (existing) {
      const rowIdx = existing.rowIndex;
      headers.forEach((h, colIdx) => {
        const normH = String(h).toLowerCase().trim();
        if (payload[normH] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(payload[normH]);
        } else if (payload[h] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(payload[h]);
        }
      });
    } else {
      const newRow = headers.map(h => {
        const normH = String(h).toLowerCase().trim();
        if (payload[normH] !== undefined) return payload[normH];
        if (payload[h] !== undefined) return payload[h];
        return '';
      });
      sheet.appendRow(newRow);
    }

    return { status: 'success', success: true, message: 'Nilai akademik berhasil disimpan', id: id };
  } catch (err) {
    console.error('Error saveNilaiAkademik:', err);
    return { status: 'error', success: false, message: 'Gagal menyimpan nilai akademik: ' + err.toString() };
  }
}

/**
 * Bulk Save Nilai Akademik per Mapel Kelas (Teacher Speed Workflow - Fast In-Memory Batch)
 */
function saveBulkNilaiAkademik(payload) {
  try {
    const items = payload.items || (Array.isArray(payload) ? payload : []);
    const mapel = payload.mata_pelajaran || (items[0] && items[0].mata_pelajaran) || '';
    const semester = payload.semester || 'Ganjil';
    const tahunAjaran = payload.tahun_ajaran || '2026/2027';
    const kkmDefault = Number(payload.kkm) || 75;

    if (!items || items.length === 0) {
      return { status: 'error', success: false, message: 'Daftar nilai tidak boleh kosong' };
    }

    const requiredHeaders = [
      'id', 'nis', 'semester', 'tahun_ajaran', 'mata_pelajaran', 'kkm',
      'nilai_tugas', 'nilai_uts', 'nilai_akhir', 'predikat',
      'capaian_kompetensi', 'catatan_guru', 'tp_optimal', 'tp_peningkatan'
    ];

    const sheet = getOrCreateSheet(DB_CONFIG.SHEET_AKADEMIK, requiredHeaders);
    const headers = ensureSheetHeaders(sheet, requiredHeaders);
    
    // Read all existing rows at once for fast batch processing
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    let allData = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];

    // Create index of existing rows
    const rowMapById = new Map();
    const rowMapByComp = new Map();

    const idColIdx = headers.findIndex(h => h.toLowerCase() === 'id');
    const nisColIdx = headers.findIndex(h => h.toLowerCase() === 'nis');
    const mapelColIdx = headers.findIndex(h => h.toLowerCase() === 'mata_pelajaran');
    const semColIdx = headers.findIndex(h => h.toLowerCase() === 'semester');
    const taColIdx = headers.findIndex(h => h.toLowerCase() === 'tahun_ajaran');

    allData.forEach((row, idx) => {
      const rowId = idColIdx !== -1 ? String(row[idColIdx]).trim() : '';
      const rowNis = nisColIdx !== -1 ? String(row[nisColIdx]).trim() : '';
      const rowMapel = mapelColIdx !== -1 ? String(row[mapelColIdx]).trim().toLowerCase() : '';
      const rowSem = semColIdx !== -1 ? normalizeSemester(row[semColIdx]) : '';
      const rowTa = taColIdx !== -1 ? normalizeYear(row[taColIdx]) : '';

      if (rowId) rowMapById.set(rowId.toLowerCase(), idx);
      if (rowNis && rowMapel) {
        const compKey = `${rowNis}|${rowMapel}|${rowSem}|${rowTa}`;
        rowMapByComp.set(compKey, idx);
        const looseCompKey = `${rowNis}|${rowMapel}`;
        if (!rowMapByComp.has(looseCompKey)) {
          rowMapByComp.set(looseCompKey, idx);
        }
      }
    });

    const newRowsToAppend = [];
    let updatedCount = 0;
    let createdCount = 0;

    items.forEach(item => {
      const itemNis = String(item.nis || '').trim();
      const itemMapel = (item.mata_pelajaran || mapel).trim();
      const itemSem = item.semester || semester || 'Ganjil';
      const itemTa = item.tahun_ajaran || tahunAjaran || '2026/2027';
      const itemKkm = Number(item.kkm) || kkmDefault;

      const uts = Number(item.nilai_uts !== undefined && item.nilai_uts !== '' && !isNaN(item.nilai_uts) ? item.nilai_uts : (item.nilai_akhir || item.nilai || 0));
      const tugas = Number(item.nilai_tugas !== undefined && item.nilai_tugas !== '' && !isNaN(item.nilai_tugas) ? item.nilai_tugas : uts);
      const akhir = Number(item.nilai_akhir !== undefined && item.nilai_akhir !== '' && !isNaN(item.nilai_akhir) ? item.nilai_akhir : uts);
      
      let predikat = item.predikat;
      if (!predikat || predikat === '-') {
        if (akhir >= 92) predikat = 'A';
        else if (akhir >= 84) predikat = 'B';
        else if (akhir >= 75) predikat = 'C';
        else if (akhir > 0) predikat = 'D';
        else predikat = '-';
      }

      const tpOptimal = Array.isArray(item.tp_optimal) ? item.tp_optimal.join(', ') : (item.tp_optimal || '');
      const tpPeningkatan = Array.isArray(item.tp_peningkatan) ? item.tp_peningkatan.join(', ') : (item.tp_peningkatan || '');
      const capaian = item.capaian_kompetensi || item.catatan_guru || '';

      const rowPayload = {
        nis: itemNis,
        semester: itemSem,
        tahun_ajaran: itemTa,
        mata_pelajaran: itemMapel,
        kkm: itemKkm,
        nilai_tugas: tugas,
        nilai_uts: uts,
        nilai_akhir: akhir,
        predikat: predikat,
        capaian_kompetensi: capaian,
        catatan_guru: capaian,
        tp_optimal: tpOptimal,
        tp_peningkatan: tpPeningkatan
      };

      let matchedIdx = -1;
      if (item.id && rowMapById.has(String(item.id).toLowerCase().trim())) {
        matchedIdx = rowMapById.get(String(item.id).toLowerCase().trim());
      }
      if (matchedIdx === -1 && itemNis && itemMapel) {
        const strictKey = `${itemNis}|${itemMapel.toLowerCase()}|${normalizeSemester(itemSem)}|${normalizeYear(itemTa)}`;
        if (rowMapByComp.has(strictKey)) {
          matchedIdx = rowMapByComp.get(strictKey);
        } else {
          const looseKey = `${itemNis}|${itemMapel.toLowerCase()}`;
          if (rowMapByComp.has(looseKey)) {
            matchedIdx = rowMapByComp.get(looseKey);
          }
        }
      }

      if (matchedIdx !== -1) {
        const existingRow = allData[matchedIdx];
        const currentId = idColIdx !== -1 ? existingRow[idColIdx] : (item.id || ('NA-' + itemNis + '-' + itemMapel.replace(/\s+/g, '')));
        rowPayload.id = currentId;

        headers.forEach((h, colIdx) => {
          const normH = String(h).toLowerCase().trim();
          if (rowPayload[normH] !== undefined) {
            existingRow[colIdx] = rowPayload[normH];
          } else if (rowPayload[h] !== undefined) {
            existingRow[colIdx] = rowPayload[h];
          }
        });
        updatedCount++;
      } else {
        const newId = item.id || `NA-${itemNis}-${itemMapel.replace(/\s+/g, '')}`;
        rowPayload.id = newId;

        const newRowArr = headers.map(h => {
          const normH = String(h).toLowerCase().trim();
          if (rowPayload[normH] !== undefined) return rowPayload[normH];
          if (rowPayload[h] !== undefined) return rowPayload[h];
          return '';
        });
        newRowsToAppend.push(newRowArr);
        createdCount++;
      }
    });

    // Write back all modified existing rows in 1 single API call
    if (allData.length > 0) {
      sheet.getRange(2, 1, allData.length, headers.length).setValues(allData);
    }

    // Append all new rows in 1 single API call
    if (newRowsToAppend.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, newRowsToAppend.length, headers.length).setValues(newRowsToAppend);
    }

    return {
      status: 'success',
      success: true,
      message: `Alhamdulillah! Berhasil menyimpan nilai ${mapel} (${updatedCount} diperbarui, ${createdCount} ditambah).`,
      count: items.length
    };
  } catch (err) {
    console.error('Error saveBulkNilaiAkademik:', err);
    return { status: 'error', success: false, message: 'Gagal menyimpan nilai akademik: ' + err.toString() };
  }
}

/**
 * Bulk Upload Nilai Siswa untuk Tahun Ajaran Baru (Excel / CSV / Multi-Mapel Batch)
 */
function saveBulkUploadNilaiAkademik(payload) {
  return saveBulkNilaiAkademik(payload);
}

/**
 * Injeksi Nilai ATS 1 Kelas Bu Dewi Fitria (IX ABU BAKAR) ke Sheet Nilai_Akademik
 * Sesuai Data Resmi Excel Analisis ATS 1 Al-Imam (18 Siswa, 7 Mapel)
 */
function seedDewiFitriaGrades() {
  const studentsGrades = [
    { nis: '242507001', nama: 'ABDILLAH ZULQARNAIN ARRAZI', fikih: 89, indo: 89, mtk: 85, ipa: 86, ips: 95, pky: 93, inf: 89 },
    { nis: '242507002', nama: 'AL-FATTAH IBNU SYAM', fikih: 83, indo: 85, mtk: 81, ipa: 84, ips: 88, pky: 91, inf: 88 },
    { nis: '242507003', nama: 'ALDENTA DWIKA PRADIPTA', fikih: 75, indo: 81, mtk: 81, ipa: 79, ips: 80, pky: 88, inf: 80 },
    { nis: '242507005', nama: 'AZKA WAFI ATHAYA', fikih: 81, indo: 83, mtk: 80, ipa: 76, ips: 80, pky: 87, inf: 84 },
    { nis: '242507006', nama: 'BIMASENA NARARYA MALIKUL', fikih: 85, indo: 90, mtk: 83, ipa: 80, ips: 83, pky: 88, inf: 86 },
    { nis: '242507007', nama: 'DAFFA RAHMAT AZAMI', fikih: 95, indo: 94, mtk: 95, ipa: 89, ips: 90, pky: 88, inf: 84 },
    { nis: '242507008', nama: 'GHAISAN ARFA RAVELLIO', fikih: 93, indo: 95, mtk: 92, ipa: 91, ips: 92, pky: 89, inf: 90 },
    { nis: '242507009', nama: 'ISA RAFIF NAILU', fikih: 87, indo: 95, mtk: 96, ipa: 90, ips: 89, pky: 93, inf: 89 },
    { nis: '242507013', nama: 'LIEVE LUTHFI', fikih: 78, indo: 85, mtk: 75, ipa: 70, ips: 80, pky: 86, inf: 75 },
    { nis: '242507010', nama: 'LIONEL NAGAZKHA IRAWAN TOBING', fikih: 81, indo: 80, mtk: 79, ipa: 77, ips: 80, pky: 88, inf: 80 },
    { nis: '242507014', nama: 'MARIQ ATHALLA MUNIARTO', fikih: 82, indo: 92, mtk: 86, ipa: 80, ips: 86, pky: 88, inf: 91 },
    { nis: '242507012', nama: 'MUHAMMAD AL BAIS SAHID ROKHIM', fikih: 93, indo: 91, mtk: 90, ipa: 91, ips: 89, pky: 87, inf: 88 },
    { nis: '242507017', nama: 'MUHAMMAD AZKA NAUFAL SAPUTRA', fikih: 99, indo: 95, mtk: 96, ipa: 97, ips: 96, pky: 91, inf: 93 },
    { nis: '242507018', nama: 'MUHAMMAD DAFFA HAFIZHSYACH AKBAR', fikih: 86, indo: 89, mtk: 80, ipa: 75, ips: 82, pky: 89, inf: 86 },
    { nis: '242507022', nama: 'MUHAMMAD HAIKAL FURQON ASYRAF', fikih: 84, indo: 82, mtk: 81, ipa: 78, ips: 80, pky: 87, inf: 85 },
    { nis: '242507015', nama: 'MUHAMMAD SYABIL A\'ZAWAWI OKTAVIANSYAH', fikih: 90, indo: 91, mtk: 86, ipa: 85, ips: 92, pky: 94, inf: 90 },
    { nis: '242507016', nama: 'QUARTO KENZIE PRAKOSO', fikih: 82, indo: 89, mtk: 85, ipa: 81, ips: 89, pky: 89, inf: 88 },
    { nis: '242507025', nama: 'RAKA PRASRAYA KAYANA', fikih: 87, indo: 88, mtk: 84, ipa: 80, ips: 85, pky: 88, inf: 83 }
  ];

  const mapelMapping = [
    { key: 'fikih', name: 'Fikih', kkm: 75, tpOpt: 'TP-FKH-01,TP-FKH-02', tpPen: 'TP-FKH-03' },
    { key: 'indo', name: 'Bahasa Indonesia', kkm: 75, tpOpt: 'TP-BIN-01,TP-BIN-02', tpPen: 'TP-BIN-03' },
    { key: 'mtk', name: 'Matematika', kkm: 75, tpOpt: 'TP-MTK-01,TP-MTK-02', tpPen: 'TP-MTK-03' },
    { key: 'ipa', name: 'Ilmu Pengetahuan Alam', kkm: 75, tpOpt: 'TP-IPA-01,TP-IPA-02', tpPen: 'TP-IPA-03' },
    { key: 'ips', name: 'Ilmu Pengetahuan Sosial', kkm: 75, tpOpt: 'TP-IPS-01,TP-IPS-02', tpPen: 'TP-IPS-03' },
    { key: 'pky', name: 'Prakarya', kkm: 75, tpOpt: 'TP-PKY-01,TP-PKY-02', tpPen: 'TP-PKY-03' },
    { key: 'inf', name: 'Informatika', kkm: 75, tpOpt: 'TP-INF-01,TP-INF-02', tpPen: 'TP-INF-03' }
  ];

  const items = [];
  studentsGrades.forEach(st => {
    mapelMapping.forEach(m => {
      const score = Number(st[m.key]);
      const predikat = score >= 88 ? 'A' : (score >= 75 ? 'B' : (score >= 65 ? 'C' : 'D'));
      let capaian = '';
      if (score >= 88) {
        capaian = `Menunjukkan penguasaan yang sangat baik dalam memahami materi pokok dan capaian pembelajaran ${m.name}. Pertahankan prestasi yang telah dicapai.`;
      } else if (score >= 75) {
        capaian = `Menunjukkan penguasaan yang baik dalam memahami materi ${m.name}. Terus tingkatkan keaktifan dan latihan mandiri.`;
      } else {
        capaian = `Menunjukkan penguasaan yang cukup dalam materi ${m.name}. Perlu bimbingan dan peningkatan ketekunan belajar secara teratur.`;
      }

      items.push({
        id: `NA-${st.nis}-${m.name.replace(/\s+/g, '')}`,
        nis: st.nis,
        nama_murid: st.nama,
        kelas: 'IX ABU BAKAR',
        mata_pelajaran: m.name,
        kkm: m.kkm,
        nilai_tugas: score,
        nilai_uts: score,
        nilai_akhir: score,
        predikat: predikat,
        tp_optimal: score >= 75 ? m.tpOpt : '',
        tp_peningkatan: score < 75 ? m.tpPen : '',
        capaian_kompetensi: capaian,
        catatan_guru: capaian,
        semester: 'Tengah Semester 1',
        tahun_ajaran: '2026/2027'
      });
    });
  });

  return saveBulkNilaiAkademik({
    semester: 'Tengah Semester 1',
    tahun_ajaran: '2026/2027',
    items: items
  });
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
 * MODEL: AHLAQ & KEPRIBADIAN (6 ASPEK AL-IMAM + CATATAN DIPERHATIKAN)
 * ============================================================================
 */
function getNilaiKepemimpinanList(filters = {}) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_KEPEMIMPINAN);
  let list = sheetToObjects(sheet);
  
  const muridList = getAllMurid();
  const muridMap = {};
  muridList.forEach(s => { muridMap[s.nis] = s; });
  
  list = list.map(item => {
    const s = muridMap[item.nis] || {};
    return {
      ...item,
      nama_murid: s.nama_murid || s.nama_santri || 'Tidak Diketahui',
      nama_santri: s.nama_murid || s.nama_santri || 'Tidak Diketahui',
      kelas: s.kelas || '-'
    };
  });
  
  if (filters.nis) list = list.filter(item => String(item.nis) === String(filters.nis));
  if (filters.kelas && filters.kelas !== 'Semua') list = list.filter(item => String(item.kelas) === String(filters.kelas));
  
  return list;
}

function saveNilaiKepemimpinan(data) {
  try {
    const requiredHeaders = [
      'id', 'nis', 'semester', 'tahun_ajaran', 'ibadah', 'akhlak',
      'kedisiplinan_kerajinan', 'kerapihan_kebersihan', 'kepemimpinan',
      'kerjasama', 'catatan_diperhatikan', 'catatan_pembina'
    ];

    const sheet = getOrCreateSheet(DB_CONFIG.SHEET_KEPEMIMPINAN, requiredHeaders);
    const headers = ensureSheetHeaders(sheet, requiredHeaders);

    const itemNis = String(data.nis || '').trim();
    const itemSem = data.semester || 'Ganjil';
    const itemTa = data.tahun_ajaran || '2026/2027';

    let existing = null;
    if (data.id) {
      existing = findRowByField(sheet, 'id', data.id);
    }
    if (!existing && itemNis) {
      existing = findRowByCompositeKey(sheet, {
        nis: itemNis,
        semester: itemSem,
        tahun_ajaran: itemTa
      });
    }

    const id = existing
      ? (existing.values[existing.headers.indexOf('id')] || data.id || ('NK-' + itemNis))
      : (data.id || ('NK-' + itemNis));

    const payload = {
      ...data,
      id: id,
      nis: itemNis,
      semester: itemSem,
      tahun_ajaran: itemTa,
      ibadah: data.ibadah || 'Jadikan ibadah sebagai kebutuhan, bukan hanya kewajiban.',
      akhlak: data.akhlak || data.karakter_adab || 'Keseimbangan antara kemampuan akademis serta sikap & akhlak mulia menjadikanmu insan yang lebih baik.',
      kedisiplinan_kerajinan: data.kedisiplinan_kerajinan || data.kedisiplinan || 'Jadikanlah kedisiplinan dan kerajinan sebagai bekalmu dalam meraih cita-cita.',
      kedisiplinan: data.kedisiplinan || data.kedisiplinan_kerajinan || 'Sangat Baik (A)',
      organisasi: data.organisasi || data.kepemimpinan || 'Sangat Aktif (A)',
      karakter_adab: data.karakter_adab || data.akhlak || 'Sangat Baik (A)',
      inisiatif_kemandirian: data.inisiatif_kemandirian || data.kerjasama || 'Mandiri & Proaktif',
      kerapihan_kebersihan: data.kerapihan_kebersihan || 'Kerapihan & kebersihan diri merupakan cermin pribadi seorang muslim, jadikanlah itu sebagai identitasmu.',
      kepemimpinan: data.kepemimpinan || data.organisasi || 'Kemampuan memimpinmu terlihat baik, lanjutkan usahamu mengajak teman-teman dalam kebaikan.',
      kerjasama: data.kerjasama || data.inisiatif_kemandirian || 'Berbagi peran dalam kerjasama kelompok akan menciptakan keharmonisan.',
      catatan_diperhatikan: data.catatan_diperhatikan || data.catatan_pembina || '',
      catatan_pembina: data.catatan_pembina || data.catatan_diperhatikan || ''
    };

    if (existing) {
      const rowIdx = existing.rowIndex;
      headers.forEach((h, colIdx) => {
        const normH = String(h).toLowerCase().trim();
        if (payload[normH] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(payload[normH]);
        } else if (payload[h] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(payload[h]);
        }
      });
    } else {
      const newRow = headers.map(h => {
        const normH = String(h).toLowerCase().trim();
        if (payload[normH] !== undefined) return payload[normH];
        if (payload[h] !== undefined) return payload[h];
        return '';
      });
      sheet.appendRow(newRow);
    }

    return { status: 'success', success: true, message: 'Nilai kepribadian berhasil disimpan', id: id };
  } catch (err) {
    console.error('Error saveNilaiKepemimpinan:', err);
    return { status: 'error', success: false, message: 'Gagal menyimpan kepribadian: ' + err.toString() };
  }
}

function saveBulkKepribadian(payload) {
  try {
    const items = payload.items || (Array.isArray(payload) ? payload : []);
    if (!items || items.length === 0) return { status: 'error', success: false, message: 'Data kepribadian tidak boleh kosong' };

    const requiredHeaders = [
      'id', 'nis', 'semester', 'tahun_ajaran', 'ibadah', 'akhlak',
      'kedisiplinan_kerajinan', 'kerapihan_kebersihan', 'kepemimpinan',
      'kerjasama', 'catatan_diperhatikan', 'catatan_pembina'
    ];

    const sheet = getOrCreateSheet(DB_CONFIG.SHEET_KEPEMIMPINAN, requiredHeaders);
    const headers = ensureSheetHeaders(sheet, requiredHeaders);

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    let allData = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];

    const rowMapById = new Map();
    const rowMapByNis = new Map();

    const idColIdx = headers.findIndex(h => h.toLowerCase() === 'id');
    const nisColIdx = headers.findIndex(h => h.toLowerCase() === 'nis');
    const semColIdx = headers.findIndex(h => h.toLowerCase() === 'semester');
    const taColIdx = headers.findIndex(h => h.toLowerCase() === 'tahun_ajaran');

    allData.forEach((row, idx) => {
      const rowId = idColIdx !== -1 ? String(row[idColIdx]).trim().toLowerCase() : '';
      const rowNis = nisColIdx !== -1 ? String(row[nisColIdx]).trim() : '';
      const rowSem = semColIdx !== -1 ? normalizeSemester(row[semColIdx]) : '';
      const rowTa = taColIdx !== -1 ? normalizeYear(row[taColIdx]) : '';

      if (rowId) rowMapById.set(rowId, idx);
      if (rowNis) {
        rowMapByNis.set(`${rowNis}|${rowSem}|${rowTa}`, idx);
        if (!rowMapByNis.has(rowNis)) rowMapByNis.set(rowNis, idx);
      }
    });

    const newRowsToAppend = [];
    let updatedCount = 0;
    let createdCount = 0;

    items.forEach(item => {
      const itemNis = String(item.nis || '').trim();
      const itemSem = item.semester || 'Ganjil';
      const itemTa = item.tahun_ajaran || '2026/2027';

      const rowPayload = {
        nis: itemNis,
        semester: itemSem,
        tahun_ajaran: itemTa,
        ibadah: item.ibadah || 'Jadikan ibadah sebagai kebutuhan, bukan hanya kewajiban.',
        akhlak: item.akhlak || item.karakter_adab || 'Keseimbangan antara kemampuan akademis serta sikap & akhlak mulia menjadikanmu insan yang lebih baik.',
        kedisiplinan_kerajinan: item.kedisiplinan_kerajinan || item.kedisiplinan || 'Jadikanlah kedisiplinan dan kerajinan sebagai bekalmu dalam meraih cita-cita.',
        kedisiplinan: item.kedisiplinan || item.kedisiplinan_kerajinan || 'Sangat Baik (A)',
        organisasi: item.organisasi || item.kepemimpinan || 'Sangat Aktif (A)',
        karakter_adab: item.karakter_adab || item.akhlak || 'Sangat Baik (A)',
        inisiatif_kemandirian: item.inisiatif_kemandirian || item.kerjasama || 'Mandiri & Proaktif',
        kerapihan_kebersihan: item.kerapihan_kebersihan || 'Kerapihan & kebersihan diri merupakan cermin pribadi seorang muslim, jadikanlah itu sebagai identitasmu.',
        kepemimpinan: item.kepemimpinan || item.organisasi || 'Kemampuan memimpinmu terlihat baik, lanjutkan usahamu mengajak teman-teman dalam kebaikan.',
        kerjasama: item.kerjasama || item.inisiatif_kemandirian || 'Berbagi peran dalam kerjasama kelompok akan menciptakan keharmonisan.',
        catatan_diperhatikan: item.catatan_diperhatikan || item.catatan_pembina || '',
        catatan_pembina: item.catatan_pembina || item.catatan_diperhatikan || ''
      };

      let matchedIdx = -1;
      if (item.id && rowMapById.has(String(item.id).toLowerCase().trim())) {
        matchedIdx = rowMapById.get(String(item.id).toLowerCase().trim());
      }
      if (matchedIdx === -1 && itemNis) {
        const strictKey = `${itemNis}|${normalizeSemester(itemSem)}|${normalizeYear(itemTa)}`;
        if (rowMapByNis.has(strictKey)) {
          matchedIdx = rowMapByNis.get(strictKey);
        } else if (rowMapByNis.has(itemNis)) {
          matchedIdx = rowMapByNis.get(itemNis);
        }
      }

      if (matchedIdx !== -1) {
        const existingRow = allData[matchedIdx];
        const currentId = idColIdx !== -1 ? existingRow[idColIdx] : (item.id || ('NK-' + itemNis));
        rowPayload.id = currentId;

        headers.forEach((h, colIdx) => {
          const normH = String(h).toLowerCase().trim();
          if (rowPayload[normH] !== undefined) {
            existingRow[colIdx] = rowPayload[normH];
          } else if (rowPayload[h] !== undefined) {
            existingRow[colIdx] = rowPayload[h];
          }
        });
        updatedCount++;
      } else {
        const newId = item.id || `NK-${itemNis}`;
        rowPayload.id = newId;

        const newRowArr = headers.map(h => {
          const normH = String(h).toLowerCase().trim();
          if (rowPayload[normH] !== undefined) return rowPayload[normH];
          if (rowPayload[h] !== undefined) return rowPayload[h];
          return '';
        });
        newRowsToAppend.push(newRowArr);
        createdCount++;
      }
    });

    if (allData.length > 0) {
      sheet.getRange(2, 1, allData.length, headers.length).setValues(allData);
    }
    if (newRowsToAppend.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, newRowsToAppend.length, headers.length).setValues(newRowsToAppend);
    }

    return {
      status: 'success',
      success: true,
      message: `Berhasil menyimpan kepribadian untuk ${items.length} murid (${updatedCount} diperbarui, ${createdCount} ditambah).`
    };
  } catch (err) {
    console.error('Error saveBulkKepribadian:', err);
    return { status: 'error', success: false, message: 'Gagal menyimpan kepribadian: ' + err.toString() };
  }
}

function deleteNilaiKepemimpinan(id) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_KEPEMIMPINAN);
  const match = findRowByField(sheet, 'id', id);
  if (match) {
    sheet.deleteRow(match.rowIndex);
    return { status: 'success', message: 'Nilai kepribadian berhasil dihapus' };
  }
  return { status: 'error', message: 'Data kepribadian tidak ditemukan' };
}

/**
 * ============================================================================
 * MODEL: SKL KEPEMIMPINAN (28 INDIKATOR EXCEL AL-IMAM)
 * ============================================================================
 */
function getSklKepemimpinanList(filters = {}) {
  const sklHeaders = ['id', 'nis', 'semester', 'tahun_ajaran', 'catatan_walas', 'd1','d2','d3','d4','d5','d6','d7','k1','k2','k3','k4','k5','p1','p2','p3','p4','p5','s1','s2','t1','t2','m1','m2','r1','r2','r3','j1','j2','h1'];
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SKL_KEPEMIMPINAN, sklHeaders);
  let list = sheetToObjects(sheet);
  
  const muridList = getAllMurid();
  const muridMap = {};
  muridList.forEach(s => { muridMap[s.nis] = s; });
  
  list = list.map(item => {
    const s = muridMap[item.nis] || {};
    const scores = {};
    const sklKeys = ['d1','d2','d3','d4','d5','d6','d7','k1','k2','k3','k4','k5','p1','p2','p3','p4','p5','s1','s2','t1','t2','m1','m2','r1','r2','r3','j1','j2','h1'];
    sklKeys.forEach(k => {
      scores[k] = item[k] || (k.startsWith('k') ? 'B' : 'A');
    });
    return {
      id: item.id || ('SKL-' + item.nis),
      nis: item.nis,
      nama_murid: s.nama_murid || s.nama_santri || 'Tidak Diketahui',
      nama_santri: s.nama_murid || s.nama_santri || 'Tidak Diketahui',
      kelas: s.kelas || '-',
      semester: item.semester || 'Tengah Semester 1',
      tahun_ajaran: item.tahun_ajaran || '2026/2027',
      catatan_walas: item.catatan_walas || 'Kemampuan memimpinmu terlihat baik, lanjutkan usahamu mengajak teman-teman dalam kebaikan',
      scores: scores
    };
  });
  
  if (filters.nis) list = list.filter(item => String(item.nis) === String(filters.nis));
  if (filters.kelas && filters.kelas !== 'Semua') list = list.filter(item => String(item.kelas) === String(filters.kelas));
  
  return list;
}

function saveSklKepemimpinan(data) {
  try {
    const sklHeaders = ['id', 'nis', 'semester', 'tahun_ajaran', 'catatan_walas', 'd1','d2','d3','d4','d5','d6','d7','k1','k2','k3','k4','k5','p1','p2','p3','p4','p5','s1','s2','t1','t2','m1','m2','r1','r2','r3','j1','j2','h1'];
    const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SKL_KEPEMIMPINAN, sklHeaders);
    const headers = ensureSheetHeaders(sheet, sklHeaders);

    const itemNis = String(data.nis || '').trim();
    const itemSem = data.semester || 'Tengah Semester 1';
    const itemTa = data.tahun_ajaran || '2026/2027';
    const id = data.id || ('SKL-' + itemNis);
    
    let existing = null;
    if (data.id) {
      existing = findRowByField(sheet, 'id', data.id);
    }
    if (!existing && itemNis) {
      existing = findRowByCompositeKey(sheet, {
        nis: itemNis,
        semester: itemSem,
        tahun_ajaran: itemTa
      });
    }

    const scores = data.scores || {};
    const rowDataObj = {
      id: id,
      nis: itemNis,
      semester: itemSem,
      tahun_ajaran: itemTa,
      catatan_walas: data.catatan_walas || 'Kemampuan memimpinmu terlihat baik, lanjutkan usahamu mengajak teman-teman dalam kebaikan'
    };
    
    const sklKeys = ['d1','d2','d3','d4','d5','d6','d7','k1','k2','k3','k4','k5','p1','p2','p3','p4','p5','s1','s2','t1','t2','m1','m2','r1','r2','r3','j1','j2','h1'];
    sklKeys.forEach(k => {
      rowDataObj[k] = (scores[k] !== undefined) ? scores[k] : (data[k] || (k.startsWith('k') ? 'B' : 'A'));
    });
    
    if (existing) {
      const rowIdx = existing.rowIndex;
      headers.forEach((h, colIdx) => {
        const normH = String(h).toLowerCase().trim();
        if (rowDataObj[normH] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(rowDataObj[normH]);
        } else if (rowDataObj[h] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(rowDataObj[h]);
        }
      });
    } else {
      const newRow = headers.map(h => {
        const normH = String(h).toLowerCase().trim();
        if (rowDataObj[normH] !== undefined) return rowDataObj[normH];
        if (rowDataObj[h] !== undefined) return rowDataObj[h];
        return '';
      });
      sheet.appendRow(newRow);
    }
    
    return { status: 'success', success: true, message: 'Nilai SKL Kepemimpinan berhasil disimpan', id: id };
  } catch (err) {
    console.error('Error saveSklKepemimpinan:', err);
    return { status: 'error', success: false, message: 'Gagal menyimpan SKL: ' + err.toString() };
  }
}

function saveBulkSklKepemimpinan(payload) {
  try {
    const items = payload.items || (Array.isArray(payload) ? payload : []);
    if (!items || items.length === 0) return { status: 'error', success: false, message: 'Data SKL tidak boleh kosong' };

    const sklHeaders = [
      'id', 'nis', 'semester', 'tahun_ajaran', 'catatan_walas',
      'd1','d2','d3','d4','d5','d6','d7',
      'k1','k2','k3','k4','k5',
      'p1','p2','p3','p4','p5',
      's1','s2','t1','t2','m1','m2',
      'r1','r2','r3','j1','j2','h1'
    ];

    const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SKL_KEPEMIMPINAN, sklHeaders);
    const headers = ensureSheetHeaders(sheet, sklHeaders);

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    let allData = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];

    const rowMapById = new Map();
    const rowMapByNis = new Map();

    const idColIdx = headers.findIndex(h => h.toLowerCase() === 'id');
    const nisColIdx = headers.findIndex(h => h.toLowerCase() === 'nis');
    const semColIdx = headers.findIndex(h => h.toLowerCase() === 'semester');
    const taColIdx = headers.findIndex(h => h.toLowerCase() === 'tahun_ajaran');

    allData.forEach((row, idx) => {
      const rowId = idColIdx !== -1 ? String(row[idColIdx]).trim().toLowerCase() : '';
      const rowNis = nisColIdx !== -1 ? String(row[nisColIdx]).trim() : '';
      const rowSem = semColIdx !== -1 ? normalizeSemester(row[semColIdx]) : '';
      const rowTa = taColIdx !== -1 ? normalizeYear(row[taColIdx]) : '';

      if (rowId) rowMapById.set(rowId, idx);
      if (rowNis) {
        rowMapByNis.set(`${rowNis}|${rowSem}|${rowTa}`, idx);
        if (!rowMapByNis.has(rowNis)) rowMapByNis.set(rowNis, idx);
      }
    });

    const newRowsToAppend = [];
    let updatedCount = 0;
    let createdCount = 0;

    const sklKeys = ['d1','d2','d3','d4','d5','d6','d7','k1','k2','k3','k4','k5','p1','p2','p3','p4','p5','s1','s2','t1','t2','m1','m2','r1','r2','r3','j1','j2','h1'];

    items.forEach(item => {
      const itemNis = String(item.nis || '').trim();
      const itemSem = item.semester || 'Tengah Semester 1';
      const itemTa = item.tahun_ajaran || '2026/2027';
      const scores = item.scores || {};

      const rowPayload = {
        nis: itemNis,
        semester: itemSem,
        tahun_ajaran: itemTa,
        catatan_walas: item.catatan_walas || 'Kemampuan memimpinmu terlihat baik, lanjutkan usahamu mengajak teman-teman dalam kebaikan'
      };

      sklKeys.forEach(k => {
        rowPayload[k] = (scores[k] !== undefined) ? scores[k] : (item[k] || (k.startsWith('k') ? 'B' : 'A'));
      });

      let matchedIdx = -1;
      if (item.id && rowMapById.has(String(item.id).toLowerCase().trim())) {
        matchedIdx = rowMapById.get(String(item.id).toLowerCase().trim());
      }
      if (matchedIdx === -1 && itemNis) {
        const strictKey = `${itemNis}|${normalizeSemester(itemSem)}|${normalizeYear(itemTa)}`;
        if (rowMapByNis.has(strictKey)) {
          matchedIdx = rowMapByNis.get(strictKey);
        } else if (rowMapByNis.has(itemNis)) {
          matchedIdx = rowMapByNis.get(itemNis);
        }
      }

      if (matchedIdx !== -1) {
        const existingRow = allData[matchedIdx];
        const currentId = idColIdx !== -1 ? existingRow[idColIdx] : (item.id || ('SKL-' + itemNis));
        rowPayload.id = currentId;

        headers.forEach((h, colIdx) => {
          const normH = String(h).toLowerCase().trim();
          if (rowPayload[normH] !== undefined) {
            existingRow[colIdx] = rowPayload[normH];
          } else if (rowPayload[h] !== undefined) {
            existingRow[colIdx] = rowPayload[h];
          }
        });
        updatedCount++;
      } else {
        const newId = item.id || `SKL-${itemNis}`;
        rowPayload.id = newId;

        const newRowArr = headers.map(h => {
          const normH = String(h).toLowerCase().trim();
          if (rowPayload[normH] !== undefined) return rowPayload[normH];
          if (rowPayload[h] !== undefined) return rowPayload[h];
          return '';
        });
        newRowsToAppend.push(newRowArr);
        createdCount++;
      }
    });

    if (allData.length > 0) {
      sheet.getRange(2, 1, allData.length, headers.length).setValues(allData);
    }
    if (newRowsToAppend.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, newRowsToAppend.length, headers.length).setValues(newRowsToAppend);
    }

    return {
      status: 'success',
      success: true,
      message: `Berhasil menyimpan 28 Indikator SKL untuk ${items.length} murid (${updatedCount} diperbarui, ${createdCount} ditambah).`
    };
  } catch (err) {
    console.error('Error saveBulkSklKepemimpinan:', err);
    return { status: 'error', success: false, message: 'Gagal menyimpan SKL Kepemimpinan: ' + err.toString() };
  }
}

function deleteSklKepemimpinan(id) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SKL_KEPEMIMPINAN);
  const match = findRowByField(sheet, 'id', id);
  if (match) {
    sheet.deleteRow(match.rowIndex);
    return { status: 'success', message: 'Nilai SKL Kepemimpinan berhasil dihapus' };
  }
  return { status: 'error', message: 'Data SKL Kepemimpinan tidak ditemukan' };
}

/**
 * ============================================================================
 * MODEL: NILAI DINIYAH & TAHFIDZ
 * ============================================================================
 */
function getNilaiDiniyahList(filters = {}) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_DINIYAH);
  let list = sheetToObjects(sheet);
  
  const muridList = getAllMurid();
  const muridMap = {};
  muridList.forEach(s => { muridMap[s.nis] = s; });
  
  list = list.map(item => {
    const s = muridMap[item.nis] || {};
    return {
      ...item,
      nama_murid: s.nama_murid || s.nama_santri || 'Tidak Diketahui',
      nama_santri: s.nama_murid || s.nama_santri || 'Tidak Diketahui',
      kelas: s.kelas || '-'
    };
  });
  
  if (filters.nis) list = list.filter(item => String(item.nis) === String(filters.nis));
  if (filters.kelas && filters.kelas !== 'Semua') list = list.filter(item => String(item.kelas) === String(filters.kelas));
  
  return list;
}

function saveNilaiDiniyah(data) {
  try {
    const requiredHeaders = [
      'id', 'nis', 'semester', 'tahun_ajaran', 'ziyadah_juz',
      'murojaah_juz', 'nilai_tahfidz', 'adab_harian', 'ibadah_harian',
      'bahasa_arab', 'catatan_musyrif'
    ];

    const sheet = getOrCreateSheet(DB_CONFIG.SHEET_DINIYAH, requiredHeaders);
    const headers = ensureSheetHeaders(sheet, requiredHeaders);

    const itemNis = String(data.nis || '').trim();
    const itemSem = data.semester || 'Ganjil';
    const itemTa = data.tahun_ajaran || '2026/2027';

    let existing = null;
    if (data.id) {
      existing = findRowByField(sheet, 'id', data.id);
    }
    if (!existing && itemNis) {
      existing = findRowByCompositeKey(sheet, {
        nis: itemNis,
        semester: itemSem,
        tahun_ajaran: itemTa
      });
    }

    const id = existing
      ? (existing.values[existing.headers.indexOf('id')] || data.id || ('ND-' + itemNis))
      : (data.id || ('ND-' + itemNis));

    const payload = {
      ...data,
      id: id,
      nis: itemNis,
      semester: itemSem,
      tahun_ajaran: itemTa,
      ziyadah_juz: data.ziyadah_juz || '-',
      murojaah_juz: data.murojaah_juz || '-',
      nilai_tahfidz: Number(data.nilai_tahfidz) || 0,
      adab_harian: data.adab_harian || 'Mumtaz (A)',
      ibadah_harian: data.ibadah_harian || 'Mumtaz (A)',
      bahasa_arab: Number(data.bahasa_arab) || 0,
      catatan_musyrif: data.catatan_musyrif || ''
    };

    if (existing) {
      const rowIdx = existing.rowIndex;
      headers.forEach((h, colIdx) => {
        const normH = String(h).toLowerCase().trim();
        if (payload[normH] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(payload[normH]);
        } else if (payload[h] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(payload[h]);
        }
      });
    } else {
      const newRow = headers.map(h => {
        const normH = String(h).toLowerCase().trim();
        if (payload[normH] !== undefined) return payload[normH];
        if (payload[h] !== undefined) return payload[h];
        return '';
      });
      sheet.appendRow(newRow);
    }

    return { status: 'success', success: true, message: 'Nilai diniyah berhasil disimpan', id: id };
  } catch (err) {
    console.error('Error saveNilaiDiniyah:', err);
    return { status: 'error', success: false, message: 'Gagal menyimpan nilai diniyah: ' + err.toString() };
  }
}

function deleteNilaiDiniyah(id) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_DINIYAH);
  const match = findRowByField(sheet, 'id', id);
  if (match) {
    sheet.deleteRow(match.rowIndex);
    return { status: 'success', message: 'Nilai diniyah berhasil dihapus' };
  }
  return { status: 'error', message: 'Data nilai diniyah tidak ditemukan' };
}

/**
 * ============================================================================
 * MODEL: TUJUAN PEMBELAJARAN (TP) - KURIKULUM MERDEKA FASE D (16 MAPEL)
 * ============================================================================
 */
function getTujuanPembelajaranList(filters = {}) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_TP);
  let list = sheetToObjects(sheet);
  
  if (list.length === 0) {
    list = getDefaultTujuanPembelajaranData();
  }
  
  if (filters.mata_pelajaran && filters.mata_pelajaran !== 'Semua') {
    list = list.filter(item => String(item.mata_pelajaran).toLowerCase() === String(filters.mata_pelajaran).toLowerCase());
  }
  if (filters.tingkat_kelas && filters.tingkat_kelas !== 'Semua') {
    list = list.filter(item => !item.tingkat_kelas || item.tingkat_kelas === 'Semua' || String(item.tingkat_kelas).toLowerCase().includes(String(filters.tingkat_kelas).toLowerCase()));
  }
  if (filters.semester && filters.semester !== 'Semua') {
    list = list.filter(item => !item.semester || item.semester === 'Semua' || String(item.semester).toLowerCase().includes(String(filters.semester).toLowerCase()));
  }
  if (filters.status && filters.status !== 'Semua') {
    list = list.filter(item => String(item.status).toLowerCase() === String(filters.status).toLowerCase());
  }
  
  return list;
}

function saveTujuanPembelajaran(data) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_TP);
  
  let existing = null;
  if (data.id) {
    existing = findRowByField(sheet, 'id', data.id);
  }
  if (!existing && data.kode_tp && data.mata_pelajaran) {
    existing = findRowByCompositeKey(sheet, {
      kode_tp: data.kode_tp,
      mata_pelajaran: data.mata_pelajaran,
      fase: data.fase || 'Fase D'
    });
  }
  
  const id = existing ? (existing.values[existing.headers.indexOf('id')] || data.id || ('TP-' + Utilities.getUuid().substring(0, 8).toUpperCase())) : (data.id || ('TP-' + Utilities.getUuid().substring(0, 8).toUpperCase()));
  
  if (existing) {
    const rowIdx = existing.rowIndex;
    const headers = existing.headers;
    const payload = { ...data, id: id };
    headers.forEach((h, colIdx) => {
      if (payload[h] !== undefined) {
        sheet.getRange(rowIdx, colIdx + 1).setValue(payload[h]);
      }
    });
  } else {
    sheet.appendRow([
      id,
      data.kode_tp || 'TP 1',
      data.mata_pelajaran || '',
      data.tingkat_kelas || 'Semua Kelas',
      data.fase || 'Fase D',
      data.semester || 'Tengah Semester 1',
      data.tahun_ajaran || '2026/2027',
      data.deskripsi_tp || '',
      data.ringkasan_tp || data.deskripsi_tp || '',
      data.status || 'Aktif',
      data.created_at || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd')
    ]);
  }
  return { status: 'success', message: 'Tujuan Pembelajaran berhasil disimpan', id: id };
}

function saveBulkTujuanPembelajaran(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { status: 'error', message: 'Daftar TP tidak valid' };
  }
  items.forEach(item => {
    saveTujuanPembelajaran(item);
  });
  return { status: 'success', message: 'Berhasil menyimpan ' + items.length + ' Tujuan Pembelajaran!' };
}

function deleteTujuanPembelajaran(id) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_TP);
  const match = findRowByField(sheet, 'id', id);
  if (match) {
    sheet.deleteRow(match.rowIndex);
    return { status: 'success', message: 'Tujuan Pembelajaran berhasil dihapus' };
  }
  return { status: 'error', message: 'Data TP tidak ditemukan' };
}

function importDefaultTujuanPembelajaran(forceReset = false) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_TP);
  if (forceReset) {
    sheet.clearContents();
    sheet.appendRow(['id', 'kode_tp', 'mata_pelajaran', 'tingkat_kelas', 'fase', 'semester', 'tahun_ajaran', 'deskripsi_tp', 'ringkasan_tp', 'status', 'created_at']);
  }
  const defaultTPs = getDefaultTujuanPembelajaranData();
  const rows = defaultTPs.map(t => [
    t.id,
    t.kode_tp,
    t.mata_pelajaran,
    t.tingkat_kelas,
    t.fase,
    t.semester,
    t.tahun_ajaran,
    t.deskripsi_tp,
    t.ringkasan_tp,
    t.status,
    t.created_at || '2026-07-01'
  ]);
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 11).setValues(rows);
  }
  return { status: 'success', message: 'Berhasil mengimpor ' + rows.length + ' Tujuan Pembelajaran Kurikulum Merdeka!' };
}

function getDefaultTujuanPembelajaranData() {
  return [
    // 1. Akidah
    { id: 'TP-AKD-01', kode_tp: 'TP 1', mata_pelajaran: 'Akidah', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Memahami dasar-dasar aqidah Islam tentang mengenal Allah & sifat-sifat-Nya berdasarkan Al-Qur\'an dan As-Sunnah', ringkasan_tp: 'memahami dasar aqidah Islam tentang mengenal Allah & sifat-sifat-Nya', status: 'Aktif' },
    { id: 'TP-AKD-02', kode_tp: 'TP 2', mata_pelajaran: 'Akidah', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menjelaskan rukun iman dan implementasinya dalam kehidupan sehari-hari', ringkasan_tp: 'menjelaskan rukun iman dan implementasinya dalam kehidupan', status: 'Aktif' },
    { id: 'TP-AKD-03', kode_tp: 'TP 3', mata_pelajaran: 'Akidah', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Meneladani sifat-sifat mulia Rasulullah SAW dan menjauhi perilaku syirik', ringkasan_tp: 'meneladani sifat mulia Rasulullah SAW dan menjauhi kesyirikan', status: 'Aktif' },
    { id: 'TP-AKD-04', kode_tp: 'TP 4', mata_pelajaran: 'Akidah', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Memahami makna bersyukur dan tawakal dalam menghadapi berbagai ujian hidup', ringkasan_tp: 'memahami hakikat syukur dan tawakal dalam kehidupan', status: 'Aktif' },

    // 2. Akhlak
    { id: 'TP-AKH-01', kode_tp: 'TP 1', mata_pelajaran: 'Akhlak', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menerapkan etika dan adab menuntut ilmu di majelis serta menghormati guru', ringkasan_tp: 'menerapkan adab menuntut ilmu dan menghormati guru', status: 'Aktif' },
    { id: 'TP-AKH-02', kode_tp: 'TP 2', mata_pelajaran: 'Akhlak', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menunjukkan adab berbakti kepada orang tua (birrul walidain) dalam keseharian', ringkasan_tp: 'menunjukkan adab birrul walidain kepada orang tua', status: 'Aktif' },
    { id: 'TP-AKH-03', kode_tp: 'TP 3', mata_pelajaran: 'Akhlak', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Membiasakan sifat jujur, amanah, dan menjaga lisan dalam pergaulan', ringkasan_tp: 'membiasakan sifat jujur, amanah, dan menjaga lisan', status: 'Aktif' },
    { id: 'TP-AKH-04', kode_tp: 'TP 4', mata_pelajaran: 'Akhlak', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menghindari perilaku tercela seperti ghibah, namimah, dan kesombongan', ringkasan_tp: 'menghindari perilaku tercela seperti ghibah dan sombong', status: 'Aktif' },

    // 3. Hadits
    { id: 'TP-HDT-01', kode_tp: 'TP 1', mata_pelajaran: 'Hadits', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menghafal matan dan terjemah Hadits Arbain tentang niat serta kebersihan', ringkasan_tp: 'menghafal matan & terjemah hadits tentang niat dan kebersihan', status: 'Aktif' },
    { id: 'TP-HDT-02', kode_tp: 'TP 2', mata_pelajaran: 'Hadits', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menjelaskan kandungan hadits tentang ukhuwah islamiyah dan larangan berbuat dzalim', ringkasan_tp: 'memahami hadits tentang ukhuwah islamiyah dan larangan dzalim', status: 'Aktif' },
    { id: 'TP-HDT-03', kode_tp: 'TP 3', mata_pelajaran: 'Hadits', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menerapkan pesan hadits tentang menjaga lisan dan memuliakan tamu', ringkasan_tp: 'menerapkan adab memuliakan tamu dan menjaga perkataan', status: 'Aktif' },
    { id: 'TP-HDT-04', kode_tp: 'TP 4', mata_pelajaran: 'Hadits', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menganalisis intisari sanad dan matan hadits-hadits shahih pilihan', ringkasan_tp: 'menganalisis intisari kandungan hadits shahih pilihan', status: 'Aktif' },

    // 4. Fikih
    { id: 'TP-FKH-01', kode_tp: 'TP 1', mata_pelajaran: 'Fikih', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Memahami konsep bersuci (thaharah), jenis-jenis air, dan tata cara membersihkan najis', ringkasan_tp: 'memahami tata cara thaharah dari hadats dan najis', status: 'Aktif' },
    { id: 'TP-FKH-02', kode_tp: 'TP 2', mata_pelajaran: 'Fikih', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Mempraktikkan rukun, syarat sah, dan gerakan shalat fardhu secara tertib dan benar', ringkasan_tp: 'mempraktikkan shalat fardhu dan sunnah dengan sempurna', status: 'Aktif' },
    { id: 'TP-FKH-03', kode_tp: 'TP 3', mata_pelajaran: 'Fikih', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menjelaskan ketentuan shalat berjamaah, shalat jamak, dan shalat qashar', ringkasan_tp: 'memahami ketentuan shalat berjamaah, jamak, dan qashar', status: 'Aktif' },
    { id: 'TP-FKH-04', kode_tp: 'TP 4', mata_pelajaran: 'Fikih', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Memahami tata cara sujud sahwi, sujud tilawah, dan sujud syukur', ringkasan_tp: 'mempraktikkan sujud sahwi, sujud tilawah, dan sujud syukur', status: 'Aktif' },

    // 5. SKI
    { id: 'TP-SKI-01', kode_tp: 'TP 1', mata_pelajaran: 'SKI', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menganalisis kondisi bangsa Arab pra-Islam dan latar belakang diutusnya Rasulullah SAW', ringkasan_tp: 'menganalisis kondisi bangsa Arab pra-Islam dan diutusnya Rasulullah', status: 'Aktif' },
    { id: 'TP-SKI-02', kode_tp: 'TP 2', mata_pelajaran: 'SKI', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menjelaskan misi dakwah Nabi Muhammad SAW periode Makkah dan ketabahan para sahabat', ringkasan_tp: 'memahami strategi dakwah Rasulullah SAW periode Makkah', status: 'Aktif' },
    { id: 'TP-SKI-03', kode_tp: 'TP 3', mata_pelajaran: 'SKI', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menganalisis peristiwa hijrah ke Madinah dan pembentukan Piagam Madinah', ringkasan_tp: 'menganalisis sejarah peristiwa hijrah dan piagam Madinah', status: 'Aktif' },
    { id: 'TP-SKI-04', kode_tp: 'TP 4', mata_pelajaran: 'SKI', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Meneladani kepemimpinan dan perjuangan Khulafaur Rasyidin dalam peradaban Islam', ringkasan_tp: 'meneladani kepemimpinan dan perjuangan Khulafaur Rasyidin', status: 'Aktif' },

    // 6. Pendidikan Pancasila
    { id: 'TP-PPN-01', kode_tp: 'TP 1', mata_pelajaran: 'Pendidikan Pancasila', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menganalisis sejarah perumusan dan penetapan Pancasila sebagai dasar negara', ringkasan_tp: 'menganalisis sejarah kelahiran dan penetapan Pancasila', status: 'Aktif' },
    { id: 'TP-PPN-02', kode_tp: 'TP 2', mata_pelajaran: 'Pendidikan Pancasila', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Mengidentifikasi norma, hak, dan kewajiban warga negara dalam bermasyarakat', ringkasan_tp: 'mengidentifikasi norma, hak, dan kewajiban warga negara', status: 'Aktif' },
    { id: 'TP-PPN-03', kode_tp: 'TP 3', mata_pelajaran: 'Pendidikan Pancasila', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menunjukkan komitmen persatuan dan kesatuan bangsa dalam bingkai kebinekaan', ringkasan_tp: 'menunjukkan sikap persatuan dalam keberagaman suku dan budaya', status: 'Aktif' },
    { id: 'TP-PPN-04', kode_tp: 'TP 4', mata_pelajaran: 'Pendidikan Pancasila', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Memahami hierarki dan ketaatan terhadap peraturan perundang-undangan nasional', ringkasan_tp: 'memahami hierarki peraturan perundang-undangan nasional', status: 'Aktif' },

    // 7. Bahasa Indonesia
    { id: 'TP-BIN-01', kode_tp: 'TP 1', mata_pelajaran: 'Bahasa Indonesia', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menganalisis struktur dan ciri kebahasaan teks deskripsi tentang objek dan lingkungan sekitar', ringkasan_tp: 'menganalisis struktur dan ciri kebahasaan teks deskripsi', status: 'Aktif' },
    { id: 'TP-BIN-02', kode_tp: 'TP 2', mata_pelajaran: 'Bahasa Indonesia', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menelaah unsur-unsur pembangun dan nilai kearifan dalam puisi rakyat dan pantun', ringkasan_tp: 'menelaah unsur pembangun dan pesan dalam puisi rakyat', status: 'Aktif' },
    { id: 'TP-BIN-03', kode_tp: 'TP 3', mata_pelajaran: 'Bahasa Indonesia', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menulis teks cerita fantasi / narasi imajinatif dengan memperhatikan kaidah PUEBI', ringkasan_tp: 'menulis teks cerita narasi kreatif dengan kaidah ejaan yang tepat', status: 'Aktif' },
    { id: 'TP-BIN-04', kode_tp: 'TP 4', mata_pelajaran: 'Bahasa Indonesia', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menyajikan petunjuk langkah-langkah kerja secara sistematis dalam teks prosedur', ringkasan_tp: 'menyajikan langkah-langkah sistematis dalam teks prosedur', status: 'Aktif' },

    // 8. Bahasa Inggris
    { id: 'TP-BIG-01', kode_tp: 'TP 1', mata_pelajaran: 'Bahasa Inggris', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menggunakan ungkapan greeting, self-introduction, dan penggunaan to be (is, am, are) secara tepat', ringkasan_tp: 'menggunakan ungkapan salam, perkenalan diri, dan to be dengan tepat', status: 'Aktif' },
    { id: 'TP-BIG-02', kode_tp: 'TP 2', mata_pelajaran: 'Bahasa Inggris', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Memahami teks deskriptif sederhana tentang orang, hewan, dan tempat menggunakan Simple Present Tense', ringkasan_tp: 'memahami teks deskriptif dan struktur Simple Present Tense', status: 'Aktif' },
    { id: 'TP-BIG-03', kode_tp: 'TP 3', mata_pelajaran: 'Bahasa Inggris', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Mengidentifikasi fungsi sosial teks interaksi transaksional memberi dan meminta informasi', ringkasan_tp: 'mengidentifikasi fungsi sosial teks interaksi transaksional', status: 'Aktif' },
    { id: 'TP-BIG-04', kode_tp: 'TP 4', mata_pelajaran: 'Bahasa Inggris', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menyusun kalimat sederhana mendeskripsikan aktivitas sehari-hari (daily routines)', ringkasan_tp: 'menyusun teks deskripsi aktivitas harian secara runtut', status: 'Aktif' },

    // 9. Matematika
    { id: 'TP-MTK-01', kode_tp: 'TP 1', mata_pelajaran: 'Matematika', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Membaca, menulis, membandingkan bilangan bulat serta melakukan operasi hitung bilangan bulat & pecahan rasional', ringkasan_tp: 'memahami operasi hitung bilangan bulat dan bilangan rasional', status: 'Aktif' },
    { id: 'TP-MTK-02', kode_tp: 'TP 2', mata_pelajaran: 'Matematika', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Mengoperasikan bentuk aljabar dan menyederhanakan persamaan linear satu variabel', ringkasan_tp: 'mengoperasikan bentuk aljabar dan menyederhanakan persamaan', status: 'Aktif' },
    { id: 'TP-MTK-03', kode_tp: 'TP 3', mata_pelajaran: 'Matematika', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menyelesaikan masalah kontekstual berkaitan dengan perbandingan senilai dan berbalik nilai', ringkasan_tp: 'menyelesaikan soal cerita perbandingan senilai dan berbalik nilai', status: 'Aktif' },
    { id: 'TP-MTK-04', kode_tp: 'TP 4', mata_pelajaran: 'Matematika', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Mengenal pola bilangan, barisan aritmatika dasar, dan penalaran logika numerik', ringkasan_tp: 'mengidentifikasi pola barisan bilangan dan pemecahan masalah numerik', status: 'Aktif' },

    // 10. IPA
    { id: 'TP-IPA-01', kode_tp: 'TP 1', mata_pelajaran: 'Ilmu Pengetahuan Alam', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menerapkan besaran fisis, satuan baku, dan metode pengukuran ilmiah secara tepat', ringkasan_tp: 'menerapkan konsep besaran dan pengukuran fisis secara akurat', status: 'Aktif' },
    { id: 'TP-IPA-02', kode_tp: 'TP 2', mata_pelajaran: 'Ilmu Pengetahuan Alam', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menganalisis wujud zat, sifat fisika-kimia, dan perubahan wujud zat dalam kehidupan', ringkasan_tp: 'menganalisis klasifikasi zat, wujud materi, dan perubahan zat', status: 'Aktif' },
    { id: 'TP-IPA-03', kode_tp: 'TP 3', mata_pelajaran: 'Ilmu Pengetahuan Alam', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menjelaskan konsep suhu, kalor, perpindahan kalor, dan pemuaian zat', ringkasan_tp: 'memahami konsep suhu, perpindahan kalor, dan pengaruhnya', status: 'Aktif' },
    { id: 'TP-IPA-04', kode_tp: 'TP 4', mata_pelajaran: 'Ilmu Pengetahuan Alam', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Mengidentifikasi ciri makhluk hidup dan sistem organisasi kehidupan dari sel hingga organisme', ringkasan_tp: 'mengidentifikasi ciri makhluk hidup dan sistem organisasi kehidupan', status: 'Aktif' },

    // 11. IPS
    { id: 'TP-IPS-01', kode_tp: 'TP 1', mata_pelajaran: 'Ilmu Pengetahuan Sosial', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menghubungkan letak geografis wilayah Indonesia dengan karakteristik sosial masyarakat', ringkasan_tp: 'menghubungkan kondisi geografis dengan karakteristik sosial masyarakat', status: 'Aktif' },
    { id: 'TP-IPS-02', kode_tp: 'TP 2', mata_pelajaran: 'Ilmu Pengetahuan Sosial', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menganalisis potensi sumber daya alam kemaritiman dan daratan serta pelestariannya', ringkasan_tp: 'menganalisis potensi sumber daya alam dan upaya pelestariannya', status: 'Aktif' },
    { id: 'TP-IPS-03', kode_tp: 'TP 3', mata_pelajaran: 'Ilmu Pengetahuan Sosial', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menjelaskan konsep kebutuhan manusia, kelangkaan barang, dan prinsip-prinsip ekonomi', ringkasan_tp: 'memahami konsep kebutuhan manusia, kelangkaan, dan motif ekonomi', status: 'Aktif' },
    { id: 'TP-IPS-04', kode_tp: 'TP 4', mata_pelajaran: 'Ilmu Pengetahuan Sosial', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menelaah interaksi antarruang dan dinamika hubungan sosial kemasyarakatan', ringkasan_tp: 'menelaah interaksi antarruang dan dinamika sosial kemasyarakatan', status: 'Aktif' },

    // 12. Prakarya
    { id: 'TP-PKY-01', kode_tp: 'TP 1', mata_pelajaran: 'Prakarya', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Mengidentifikasi karakteristik bahan lunak dan serat alami untuk produk kerajinan', ringkasan_tp: 'mengidentifikasi bahan baku alami dan sintetis untuk produk kerajinan', status: 'Aktif' },
    { id: 'TP-PKY-02', kode_tp: 'TP 2', mata_pelajaran: 'Prakarya', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Merancang dan membuat produk kerajinan yang ergonomis, bernilai estetis dan ekonomis', ringkasan_tp: 'merancang karya kerajinan bernilai estetika dan fungsi pakai', status: 'Aktif' },
    { id: 'TP-PKY-03', kode_tp: 'TP 3', mata_pelajaran: 'Prakarya', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menerapkan teknik pengolahan bahan pangan buah dan sayuran menjadi makanan sehat', ringkasan_tp: 'menerapkan teknik pengolahan bahan pangan higienis dan sehat', status: 'Aktif' },
    { id: 'TP-PKY-04', kode_tp: 'TP 4', mata_pelajaran: 'Prakarya', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Mengevaluasi dan mendesain kemasan produk kerajinan secara kreatif dan menarik', ringkasan_tp: 'mengevaluasi dan mengemas produk kerajinan secara kreatif', status: 'Aktif' },

    // 13. PJOK
    { id: 'TP-PJK-01', kode_tp: 'TP 1', mata_pelajaran: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Mempraktikkan gerak dasar passing, dribbling, dan shooting pada permainan bola basket & sepak bola', ringkasan_tp: 'mempraktikkan gerak dasar permainan invasi dan kerja sama tim', status: 'Aktif' },
    { id: 'TP-PJK-02', kode_tp: 'TP 2', mata_pelajaran: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Mempraktikkan variasi passing dan servis pada permainan bola voli dan bulu tangkis', ringkasan_tp: 'menguasai variasi gerak servis dan passing pada permainan net', status: 'Aktif' },
    { id: 'TP-PJK-03', kode_tp: 'TP 3', mata_pelajaran: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Melakukan latihan kebugaran jasmani untuk daya tahan jantung, kekuatan otot, dan kelenturan tubuh', ringkasan_tp: 'melakukan latihan kebugaran jasmani dan menjaga stamina tubuh', status: 'Aktif' },
    { id: 'TP-PJK-04', kode_tp: 'TP 4', mata_pelajaran: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menunjukkan sportivitas, disiplin, kerja sama tim, dan kepatuhan pada aturan olahraga', ringkasan_tp: 'menunjukkan sportivitas, ketahanan fisik, dan disiplin berolahraga', status: 'Aktif' },

    // 14. Bahasa Sunda
    { id: 'TP-SUN-01', kode_tp: 'TP 1', mata_pelajaran: 'Bahasa Sunda', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Memahami struktur, unsur kebahasaan, dan pesan moral dalam teks dongeng Sunda', ringkasan_tp: 'memahami struktur carita dongeng Sunda dan pesan moralnya', status: 'Aktif' },
    { id: 'TP-SUN-02', kode_tp: 'TP 2', mata_pelajaran: 'Bahasa Sunda', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menelaah ragam tatakrama basa Sunda (basa loma jeung lemes) dalam percakapan sehari-hari', ringkasan_tp: 'menerapkan tatakrama basa Sunda loma jeung lemes sacara merenah', status: 'Aktif' },
    { id: 'TP-SUN-03', kode_tp: 'TP 3', mata_pelajaran: 'Bahasa Sunda', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menganalisis teks biantara (pidato) dan paguneman bahasa Sunda yang santun', ringkasan_tp: 'menganalisis struktur biantara dan paguneman bahasa Sunda', status: 'Aktif' },
    { id: 'TP-SUN-04', kode_tp: 'TP 4', mata_pelajaran: 'Bahasa Sunda', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menulis karangan pendek deskriptif ngagunakeun ejaan basa Sunda anu merenah', ringkasan_tp: 'menulis teks deskripsi pendek menggunakan kosa kata Sunda yang tepat', status: 'Aktif' },

    // 15. Informatika
    { id: 'TP-INF-01', kode_tp: 'TP 1', mata_pelajaran: 'Informatika', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menerapkan berpikir komputasional (computational thinking) untuk memecahkan persoalan logis', ringkasan_tp: 'menerapkan berpikir komputasional dalam menyelesaikan persoalan', status: 'Aktif' },
    { id: 'TP-INF-02', kode_tp: 'TP 2', mata_pelajaran: 'Informatika', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Memanfaatkan aplikasi pengolah kata dan lembar kerja untuk mengolah dan memvisualisasikan data', ringkasan_tp: 'mengolah data terstruktur menggunakan lembar kerja digital', status: 'Aktif' },
    { id: 'TP-INF-03', kode_tp: 'TP 3', mata_pelajaran: 'Informatika', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Memahami konsep jaringan komputer lokal/internet dan etika keamanan berselancar digital', ringkasan_tp: 'memahami dasar jaringan komputer dan etika keamanan digital', status: 'Aktif' },
    { id: 'TP-INF-04', kode_tp: 'TP 4', mata_pelajaran: 'Informatika', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Merancang algoritma sederhana menggunakan blok pemrograman visual (Scratch/Blockly)', ringkasan_tp: 'merancang logika algoritma dan alur pemrograman visual dasar', status: 'Aktif' },

    // 16. Bahasa Arab
    { id: 'TP-ARB-01', kode_tp: 'TP 1', mata_pelajaran: 'Bahasa Arab', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menguasai mufrodat tentang perkenalan diri (ta\'aruf) dan sarana prasarana sekolah', ringkasan_tp: 'menguasai mufrodat perkenalan dan lingkungan madrasah', status: 'Aktif' },
    { id: 'TP-ARB-02', kode_tp: 'TP 2', mata_pelajaran: 'Bahasa Arab', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Membedakan penggunaan Isim Isyaroh (mudzakkar dan muannats) serta Isim Dhomir', ringkasan_tp: 'membedakan isim isyarah mudzakkar-muannats dan isim dhomir', status: 'Aktif' },
    { id: 'TP-ARB-03', kode_tp: 'TP 3', mata_pelajaran: 'Bahasa Arab', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Mempraktikkan percakapan sehari-hari (al-hiwar) dengan intonasi dan makhraj fasih', ringkasan_tp: 'mempraktikkan percakapan al-hiwar dengan pelafalan fasih', status: 'Aktif' },
    { id: 'TP-ARB-04', kode_tp: 'TP 4', mata_pelajaran: 'Bahasa Arab', tingkat_kelas: 'Kelas VII', fase: 'Fase D', semester: 'Tengah Semester 1', tahun_ajaran: '2026/2027', deskripsi_tp: 'Menyusun pola kalimat tarkib sederhana (jumlah ismiyyah dan jumlah fi\'liyyah dasar)', ringkasan_tp: 'menyusun pola kalimat tarkib sederhana berbahasa Arab', status: 'Aktif' }
  ];
}

/**
 * ============================================================================
 * 10. MODUL LOG AKTIVITAS & AUDIT TRAIL AKUN
 * ============================================================================
 */

/**
 * Mencatat log aktivitas setiap akun (User, Admin, Guru, Walas, Kepsek)
 */
function logActivity(data) {
  try {
    if (!data) return { success: false, message: 'Data log tidak boleh kosong.' };

    const ss = getDb();
    const headers = ['id', 'timestamp', 'username', 'user_nama', 'role', 'action_type', 'module', 'details', 'ip_address', 'status'];
    const sheet = getOrCreateSheet(DB_CONFIG.SHEET_LOGS, headers);

    const now = new Date();
    const formattedTime = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
    const logId = data.id || ('LOG-' + now.getTime().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000));

    const row = [
      logId,
      data.timestamp || formattedTime,
      data.username || 'system',
      data.user_nama || data.nama_lengkap || data.username || 'Pengguna',
      data.role || 'guru',
      data.action_type || data.action || 'GENERAL_ACTION',
      data.module || 'Sistem',
      data.details || data.keterangan || '-',
      data.ip_address || '127.0.0.1',
      data.status || 'success'
    ];

    sheet.appendRow(row);

    // Prune logs if sheet exceeds 2,000 rows to keep spreadsheet performant
    if (sheet.getLastRow() > 2000) {
      sheet.deleteRows(2, 200);
    }

    return { success: true, log_id: logId, message: 'Aktivitas berhasil dicatat.' };
  } catch (err) {
    console.warn('Gagal mencatat log aktivitas:', err);
    return { success: false, message: 'Error log: ' + err.toString() };
  }
}

/**
 * Mengambil daftar log aktivitas dengan filter
 */
function getActivityLogsList(filters = {}) {
  try {
    const sheet = getOrCreateSheet(DB_CONFIG.SHEET_LOGS, [
      'id', 'timestamp', 'username', 'user_nama', 'role', 'action_type', 'module', 'details', 'ip_address', 'status'
    ]);

    let list = sheetToObjects(sheet);

    if (filters.username && filters.username !== 'Semua') {
      list = list.filter(item => String(item.username).toLowerCase() === String(filters.username).toLowerCase());
    }

    if (filters.role && filters.role !== 'Semua') {
      list = list.filter(item => String(item.role).toLowerCase() === String(filters.role).toLowerCase());
    }

    if (filters.module && filters.module !== 'Semua') {
      list = list.filter(item => String(item.module).toLowerCase().includes(String(filters.module).toLowerCase()));
    }

    if (filters.action_type && filters.action_type !== 'Semua') {
      list = list.filter(item => String(item.action_type).toLowerCase() === String(filters.action_type).toLowerCase());
    }

    if (filters.search) {
      const q = String(filters.search).toLowerCase().trim();
      list = list.filter(item => 
        String(item.details || '').toLowerCase().includes(q) ||
        String(item.username || '').toLowerCase().includes(q) ||
        String(item.user_nama || '').toLowerCase().includes(q) ||
        String(item.module || '').toLowerCase().includes(q) ||
        String(item.action_type || '').toLowerCase().includes(q)
      );
    }

    // Sort descending by timestamp / row
    list.reverse();

    // Limit returned records to maximum 200 for fast responsiveness
    return list.slice(0, 200);
  } catch (err) {
    console.warn('Gagal mengambil daftar log aktivitas:', err);
    return [];
  }
}

/**
 * Menghapus log aktivitas lama (Admin only)
 */
function clearActivityLogs() {
  try {
    const sheet = getOrCreateSheet(DB_CONFIG.SHEET_LOGS, [
      'id', 'timestamp', 'username', 'user_nama', 'role', 'action_type', 'module', 'details', 'ip_address', 'status'
    ]);

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }

    return { success: true, message: 'Seluruh riwayat log aktivitas berhasil dibersihkan.' };
  } catch (err) {
    return { success: false, message: 'Gagal membersihkan log: ' + err.toString() };
  }
}

