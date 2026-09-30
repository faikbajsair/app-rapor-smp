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
  SHEET_DINIYAH: 'Nilai_Diniyah'
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
  let colIndex = headers.indexOf(fieldName);
  
  // Fallback field check
  if (colIndex === -1 && fieldName === 'nama_murid') {
    colIndex = headers.indexOf('nama_santri');
  }
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
      ['academic_years_list', '2026/2027,2025/2026,2024/2025', 'academic', 'Daftar Pilihan Tahun Ajaran'],
      ['semester_active', 'I (Satu)', 'academic', 'Semester Aktif (I (Satu) / II (Dua))'],
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
  
  // 2. Skema Users (4 Role: Admin, Kepala Sekolah, Guru, Wali Murid)
  const sheetUsers = getOrCreateSheet(DB_CONFIG.SHEET_USERS, ['id', 'username', 'password_hash', 'nama_lengkap', 'role', 'status', 'created_at', 'nis']);
  if (sheetUsers.getLastRow() <= 1) {
    const defaultUsers = [
      ['USR-001', 'admin', 'admin123', 'Administrator Utama', 'admin', 'aktif', '2025-01-01', ''],
      ['USR-002', 'kepsek', 'kepsek123', 'Arif Rohman, S.Sos., M.Pd.', 'kepala_sekolah', 'aktif', '2025-01-01', ''],
      ['USR-003', 'guru', 'guru123', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'guru', 'aktif', '2025-01-01', ''],
      ['USR-004', 'dewi', 'dewi123', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'guru', 'aktif', '2025-01-01', ''],
      ['USR-005', 'triyuli', 'tri123', 'Tri Yuli Aryani, S.Pd., Gr.', 'guru', 'aktif', '2025-01-01', ''],
      ['USR-006', 'eliumiyati', 'eli123', 'Eli Umiyati, S.Pd., Gr.', 'guru', 'aktif', '2025-01-01', ''],
      ['USR-007', 'aning', 'aning123', 'Aning Nurhayati, S.T., Gr.', 'guru', 'aktif', '2025-01-01', ''],
      ['USR-008', 'trinuryani', 'tri123', 'Tri Nuryani, S.S., Gr.', 'guru', 'aktif', '2025-01-01', ''],
      ['USR-009', 'sumiati', 'sumi123', 'Sumiati, S.Pd., Gr.', 'guru', 'aktif', '2025-01-01', ''],
      ['USR-010', 'walimurid', 'wali123', 'Bpk. Nanang Fajar', 'wali_murid', 'aktif', '2025-01-01', '242507001']
    ];
    sheetUsers.getRange(2, 1, defaultUsers.length, 8).setValues(defaultUsers);
  }
  
  // 3. Skema Murid (DATA SISWA SESUAI EXCEL AL-IMAM)
  const sheetMurid = getOrCreateSheet(DB_CONFIG.SHEET_MURID, [
    'nis', 'nisn', 'nama_murid', 'kelas', 'jenis_kelamin', 'nama_wali', 'kontak_wali', 'status', 'kehadiran_s', 'kehadiran_i', 'kehadiran_a', 'ekskul_1', 'ekskul_2', 'ekskul_3', 'wali_kelas'
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
  
  // 4. Skema Nilai_Akademik (REKAP NILAI & CAPAIAN KOMPETENSI)
  const sheetAkademik = getOrCreateSheet(DB_CONFIG.SHEET_AKADEMIK, [
    'id', 'nis', 'semester', 'tahun_ajaran', 'mata_pelajaran', 'kkm', 'nilai_tugas', 'nilai_uts', 'nilai_akhir', 'predikat', 'capaian_kompetensi', 'catatan_guru'
  ]);
  if (sheetAkademik.getLastRow() <= 1) {
    const defaultAkademik = [
      ['NA-001', '232407021', 'Ganjil', '2025/2026', 'Akidah', 75, 87, 87, 87, 'A', 'Ananda menunjukkan pemahaman baik tentang adab dalam menyebut Asma\' Allah, Al-Qur\'an, dan Rasul-Nya serta baik dalam memahami makna bersyukur.', 'Sangat aktif dalam pembelajaran.'],
      ['NA-002', '232407021', 'Ganjil', '2025/2026', 'Akhlak', 75, 88, 88, 88, 'A', 'Ananda baik dalam menerapkan adab terhadap orang tua dan guru.', 'Pertahankan akhlak terpuji.'],
      ['NA-003', '232407021', 'Ganjil', '2025/2026', 'Hadits', 75, 82, 82, 82, 'B', 'Ananda baik dalam menghafal matan dan terjemah hadits kebersihan.', 'Tingkatkan muroja\'ah hadits.'],
      ['NA-004', '232407021', 'Ganjil', '2025/2026', 'Fikih', 75, 90, 92, 91, 'A', 'Ananda menguasai tata cara thaharah dan sholat fardhu secara sempurna.', 'Praktik ibadah sangat baik.'],
      ['NA-005', '232407021', 'Ganjil', '2025/2026', 'SKI', 75, 80, 80, 80, 'B', 'Ananda memahami sejarah perkembangan islam.', 'Terus tingkatkan literasi sejarah.'],
      ['NA-006', '232407021', 'Ganjil', '2025/2026', 'Pendidikan Pancasila', 75, 85, 85, 85, 'B', 'Ananda memiliki pemahaman wawasan kebangsaan yang baik.', 'Sikap toleran dan beradab.'],
      ['NA-007', '232407021', 'Ganjil', '2025/2026', 'Bahasa Indonesia', 75, 93, 93, 93, 'A', 'Ananda sangat baik dalam memahami struktur teks laporan percobaan.', 'Literasi sangat baik.'],
      ['NA-008', '232407021', 'Ganjil', '2025/2026', 'Bahasa Inggris', 75, 78, 78, 78, 'B', 'Ananda cukup baik dalam menggunakan berbagai ungkapan bahasa Inggris.', 'Tingkatkan conversation.'],
      ['NA-009', '232407021', 'Ganjil', '2025/2026', 'Matematika', 75, 84, 84, 84, 'B', 'Ananda baik dalam mengenali pola susunan bilangan.', 'Penalaran baik.'],
      ['NA-010', '232407021', 'Ganjil', '2025/2026', 'Ilmu Pengetahuan Alam', 75, 85, 85, 85, 'B', 'Ananda baik dalam memahami ciri makhluk hidup dan sistem reproduksi.', 'Eksperimen baik.'],
      ['NA-011', '232407021', 'Ganjil', '2025/2026', 'Ilmu Pengetahuan Sosial', 75, 89, 89, 89, 'B', 'Ananda baik dalam memahami kondisi geografis Indonesia.', 'Analisis spasial baik.'],
      ['NA-012', '232407021', 'Ganjil', '2025/2026', 'Prakarya', 75, 86, 86, 86, 'B', 'Ananda baik dalam membuat karya seni rupa modifikasi.', 'Kreatif.'],
      ['NA-013', '232407021', 'Ganjil', '2025/2026', 'Pendidikan Jasmani, Olahraga, dan Kesehatan', 75, 89, 89, 89, 'B', 'Ananda baik dalam mempraktikkan permainan bola voli dan sepak bola.', 'Sportif.'],
      ['NA-014', '232407021', 'Ganjil', '2025/2026', 'Bahasa Sunda', 75, 90, 90, 90, 'A', 'Ananda sangat baik dalam menganalisis biantara.', 'Sangat baik.'],
      ['NA-015', '232407021', 'Ganjil', '2025/2026', 'Informatika', 75, 85, 85, 85, 'B', 'Ananda baik dalam pemecahan persoalan komputasional.', 'Logika baik.'],
      ['NA-016', '232407021', 'Ganjil', '2025/2026', 'Bahasa Arab', 75, 76, 76, 76, 'C', 'Ananda cukup baik dalam penguasaan mufrodat dan dhomir.', 'Tingkatkan hafalan mufrodat.']
    ];
    sheetAkademik.getRange(2, 1, defaultAkademik.length, 12).setValues(defaultAkademik);
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
    ['academic_years_list', '2026/2027,2025/2026,2024/2025', 'academic', 'Daftar Pilihan Tahun Ajaran'],
    ['semester_active', 'I (Satu)', 'academic', 'Semester Aktif (I (Satu) / II (Dua))'],
    ['report_date', '17 Oktober 2026', 'academic', 'Tanggal Titimangsa Rapor'],
    ['report_place', 'Bogor', 'academic', 'Kota Pembagian Rapor'],
    ['wali_kelas_default', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'academic', 'Wali Kelas Default'],
    ['headmaster_name', 'Arif Rohman, S.Sos., M.Pd.', 'signatory', 'Nama Kepala Sekolah'],
    ['headmaster_nip', '', 'signatory', 'NIP/NIY Kepala Sekolah'],
    ['headmaster_signature_url', '', 'signatory', 'URL Gambar TTD Kepala Sekolah (Opsional)'],
    ['report_footer_text', 'RAPOR TENGAH SEMESTER PROGRAM PORTOFOLIO SMP AL IMAM ISLAMIC SCHOOL', 'general', 'Teks Footer Rapor']
  ];
  sheetSettings.getRange(2, 1, defaultSettings.length, 4).setValues(defaultSettings);

  // 2. Users (Role Admin, Kepsek, & 6 Wali Kelas Jenjang)
  const sheetUsers = getOrCreateSheet(DB_CONFIG.SHEET_USERS, ['id', 'username', 'password_hash', 'nama_lengkap', 'role', 'status', 'created_at', 'nis']);
  if (sheetUsers.getLastRow() > 1) {
    sheetUsers.getRange(2, 1, sheetUsers.getLastRow() - 1, 8).clearContent();
  }
  const defaultUsers = [
    ['USR-001', 'admin', 'admin123', 'Administrator Utama', 'admin', 'aktif', '2025-01-01', ''],
    ['USR-002', 'kepsek', 'kepsek123', 'Arif Rohman, S.Sos., M.Pd.', 'kepala_sekolah', 'aktif', '2025-01-01', ''],
    ['USR-003', 'guru', 'guru123', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'guru', 'aktif', '2025-01-01', ''],
    ['USR-004', 'dewi', 'dewi123', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'guru', 'aktif', '2025-01-01', ''],
    ['USR-005', 'triyuli', 'tri123', 'Tri Yuli Aryani, S.Pd., Gr.', 'guru', 'aktif', '2025-01-01', ''],
    ['USR-006', 'eliumiyati', 'eli123', 'Eli Umiyati, S.Pd., Gr.', 'guru', 'aktif', '2025-01-01', ''],
    ['USR-007', 'aning', 'aning123', 'Aning Nurhayati, S.T., Gr.', 'guru', 'aktif', '2025-01-01', ''],
    ['USR-008', 'trinuryani', 'tri123', 'Tri Nuryani, S.S., Gr.', 'guru', 'aktif', '2025-01-01', ''],
    ['USR-009', 'sumiati', 'sumi123', 'Sumiati, S.Pd., Gr.', 'guru', 'aktif', '2025-01-01', ''],
    ['USR-010', 'walimurid', 'wali123', 'Bpk. Nanang Fajar', 'wali_murid', 'aktif', '2025-01-01', '242507001']
  ];
  sheetUsers.getRange(2, 1, defaultUsers.length, 8).setValues(defaultUsers);

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
      'nis', 'nisn', 'nama_murid', 'kelas', 'jenis_kelamin', 'nama_wali', 'kontak_wali', 'status', 'kehadiran_s', 'kehadiran_i', 'kehadiran_a', 'ekskul_1', 'ekskul_2', 'ekskul_3', 'wali_kelas'
    ]);
  }
  
  const muridHeaders = ['nis', 'nisn', 'nama_murid', 'kelas', 'jenis_kelamin', 'nama_wali', 'kontak_wali', 'status', 'kehadiran_s', 'kehadiran_i', 'kehadiran_a', 'ekskul_1', 'ekskul_2', 'ekskul_3', 'wali_kelas'];
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
 * ============================================================================
 * MODEL: USERS MANAGEMENT
 * ============================================================================
 */
function getAllUsers() {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_USERS);
  return sheetToObjects(sheet);
}

function saveUser(user) {
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_USERS);
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
      Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd')
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
  const existing = findRowByField(sheet, 'nis', murid.nis);
  
  if (existing) {
    const rowIdx = existing.rowIndex;
    const headers = existing.headers;
    headers.forEach((h, colIdx) => {
      if (murid[h] !== undefined) {
        sheet.getRange(rowIdx, colIdx + 1).setValue(murid[h]);
      }
    });
  } else {
    sheet.appendRow([
      murid.nis,
      murid.nisn || '',
      murid.nama_murid || murid.nama_santri || '',
      murid.kelas || '7A',
      murid.jenis_kelamin || 'L',
      murid.nama_wali || '',
      murid.kontak_wali || '',
      murid.status || 'Aktif',
      murid.kehadiran_s || '-',
      murid.kehadiran_i || '-',
      murid.kehadiran_a || '-',
      murid.ekskul_1 || 'Pramuka',
      murid.ekskul_2 || 'Wushu',
      murid.ekskul_3 || 'Futsal',
      murid.wali_kelas || 'Dewi Fitria Nugraheni, S.Pd., Gr.'
    ]);
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
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_AKADEMIK);
  const isNew = !data.id;
  const id = isNew ? 'NA-' + Utilities.getUuid().substring(0, 6).toUpperCase() : data.id;
  
  const uts = Number(data.nilai_uts !== undefined && data.nilai_uts !== '' ? data.nilai_uts : (data.nilai_akhir || data.nilai || 85));
  const tugas = Number(data.nilai_tugas !== undefined && data.nilai_tugas !== '' ? data.nilai_tugas : uts);
  const akhir = data.nilai_akhir !== undefined && data.nilai_akhir !== '' ? Number(data.nilai_akhir) : uts;
  const kkm = Number(data.kkm) || 75;
  
  let predikat = data.predikat;
  if (!predikat) {
    if (akhir >= 90) predikat = 'A';
    else if (akhir >= 80) predikat = 'B';
    else if (akhir >= kkm) predikat = 'C';
    else predikat = 'D';
  }
  
  const existing = findRowByField(sheet, 'id', id);
  if (existing) {
    const rowIdx = existing.rowIndex;
    const headers = existing.headers;
    const payload = {
      ...data,
      id: id,
      kkm: kkm,
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
      data.tahun_ajaran || '2026/2027',
      data.mata_pelajaran || '',
      kkm,
      tugas,
      uts,
      akhir,
      predikat,
      data.capaian_kompetensi || '',
      data.catatan_guru || ''
    ]);
  }
  return { status: 'success', message: 'Nilai akademik berhasil disimpan', id: id };
}

/**
 * Bulk Save Nilai Akademik per Mapel Kelas (Teacher Speed Workflow)
 */
function saveBulkNilaiAkademik(payload) {
  const { mata_pelajaran, kkm, semester, tahun_ajaran, items } = payload;
  if (!items || !Array.isArray(items)) return { status: 'error', message: 'Daftar nilai tidak valid' };
  
  items.forEach(item => {
    saveNilaiAkademik({
      id: item.id || '',
      nis: item.nis,
      mata_pelajaran: mata_pelajaran,
      kkm: kkm || 75,
      semester: semester || 'Ganjil',
      tahun_ajaran: tahun_ajaran || '2026/2027',
      nilai_tugas: item.nilai_tugas || item.nilai || 0,
      nilai_uts: item.nilai_uts || item.nilai || 0,
      nilai_akhir: item.nilai_akhir || item.nilai || 0,
      predikat: item.predikat || '',
      capaian_kompetensi: item.capaian_kompetensi || '',
      catatan_guru: item.catatan_guru || ''
    });
  });
  
  return { status: 'success', message: 'Berhasil menyimpan nilai mata pelajaran ' + mata_pelajaran + ' untuk ' + items.length + ' murid!' };
}

/**
 * Bulk Upload Nilai Siswa untuk Tahun Ajaran Baru (Excel / CSV / Multi-Mapel Batch)
 */
function saveBulkUploadNilaiAkademik(payload) {
  const { items, tahun_ajaran, semester } = payload;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { status: 'error', message: 'Data upload nilai tidak boleh kosong' };
  }
  let successCount = 0;
  items.forEach(item => {
    saveNilaiAkademik({
      nis: item.nis,
      mata_pelajaran: item.mata_pelajaran,
      kkm: Number(item.kkm) || 75,
      semester: item.semester || semester || 'I (Satu)',
      tahun_ajaran: item.tahun_ajaran || tahun_ajaran || '2026/2027',
      nilai_tugas: Number(item.nilai_tugas || item.nilai_uts || item.nilai || 0),
      nilai_uts: Number(item.nilai_uts || item.nilai || 0),
      nilai_akhir: Number(item.nilai_akhir || item.nilai_uts || item.nilai || 0),
      predikat: item.predikat || '',
      capaian_kompetensi: item.capaian_kompetensi || '',
      catatan_guru: item.catatan_guru || item.capaian_kompetensi || ''
    });
    successCount++;
  });
  return { 
    status: 'success', 
    message: 'Alhamdulillah! Berhasil mengunggah ' + successCount + ' data nilai untuk Tahun Ajaran ' + (tahun_ajaran || '2026/2027') + '!' 
  };
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
      data.tahun_ajaran || '2026/2027',
      data.ibadah || 'Jadikan ibadah sebagai kebutuhan, bukan hanya kewajiban.',
      data.akhlak || 'Keseimbangan antara kemampuan akademis serta sikap & akhlak mulia menjadikanmu insan yang lebih baik.',
      data.kedisiplinan_kerajinan || data.kedisiplinan || 'Jadikanlah kedisiplinan dan kerajinan sebagai bekalmu dalam meraih cita-cita.',
      data.kerapihan_kebersihan || 'Kerapihan & kebersihan diri merupakan cermin pribadi seorang muslim, jadikanlah itu sebagai identitasmu.',
      data.kepemimpinan || 'Kemampuan memimpinmu terlihat baik, lanjutkan usahamu mengajak teman-teman dalam kebaikan.',
      data.kerjasama || data.inisiatif_kemandirian || 'Berbagi peran dalam kerjasama kelompok akan menciptakan keharmonisan.',
      data.catatan_diperhatikan || 'Ketekunan dalam belajar saat ini merupakan wujud keseriusan untuk meraih hasil belajar yang maksimal, & cita-cita di masa depan. Tingkatkan semangat belajarmu.',
      data.catatan_pembina || ''
    ]);
  }
  return { status: 'success', message: 'Nilai kepribadian berhasil disimpan', id: id };
}

function saveBulkKepribadian(items) {
  if (!items || !Array.isArray(items)) return { status: 'error', message: 'Data kepribadian tidak valid' };
  items.forEach(item => {
    saveNilaiKepemimpinan(item);
  });
  return { status: 'success', message: 'Berhasil menyimpan kepribadian untuk ' + items.length + ' murid' };
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
  const sklHeaders = ['id', 'nis', 'semester', 'tahun_ajaran', 'catatan_walas', 'd1','d2','d3','d4','d5','d6','d7','k1','k2','k3','k4','k5','p1','p2','p3','p4','p5','s1','s2','t1','t2','m1','m2','r1','r2','r3','j1','j2','h1'];
  const sheet = getOrCreateSheet(DB_CONFIG.SHEET_SKL_KEPEMIMPINAN, sklHeaders);
  const id = data.id || ('SKL-' + data.nis);
  
  const existing = findRowByField(sheet, 'id', id);
  const scores = data.scores || {};
  
  const rowDataObj = {
    id: id,
    nis: data.nis,
    semester: data.semester || 'Tengah Semester 1',
    tahun_ajaran: data.tahun_ajaran || '2026/2027',
    catatan_walas: data.catatan_walas || 'Kemampuan memimpinmu terlihat baik, lanjutkan usahamu mengajak teman-teman dalam kebaikan'
  };
  
  const sklKeys = ['d1','d2','d3','d4','d5','d6','d7','k1','k2','k3','k4','k5','p1','p2','p3','p4','p5','s1','s2','t1','t2','m1','m2','r1','r2','r3','j1','j2','h1'];
  sklKeys.forEach(k => {
    rowDataObj[k] = (scores[k] !== undefined) ? scores[k] : (data[k] || (k.startsWith('k') ? 'B' : 'A'));
  });
  
  if (existing) {
    const rowIdx = existing.rowIndex;
    const headers = existing.headers;
    headers.forEach((h, colIdx) => {
      if (rowDataObj[h] !== undefined) {
        sheet.getRange(rowIdx, colIdx + 1).setValue(rowDataObj[h]);
      }
    });
  } else {
    const rowArr = sklHeaders.map(h => rowDataObj[h] !== undefined ? rowDataObj[h] : '');
    sheet.appendRow(rowArr);
  }
  
  return { status: 'success', message: 'Nilai SKL Kepemimpinan berhasil disimpan', id: id };
}

function saveBulkSklKepemimpinan(items) {
  if (!items || !Array.isArray(items)) return { status: 'error', message: 'Data SKL Kepemimpinan tidak valid' };
  items.forEach(item => {
    saveSklKepemimpinan(item);
  });
  return { status: 'success', message: 'Berhasil menyimpan SKL Kepemimpinan untuk ' + items.length + ' murid' };
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
      data.tahun_ajaran || '2026/2027',
      data.ziyadah_juz || '-',
      data.murojaah_juz || '-',
      Number(data.nilai_tahfidz) || 0,
      data.adab_harian || 'Mumtaz (A)',
      data.ibadah_harian || 'Mumtaz (A)',
      Number(data.bahasa_arab) || 0,
      data.catatan_musyrif || ''
    ]);
  }
  return { status: 'success', message: 'Nilai diniyah berhasil disimpan', id: id };
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
