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
  SHEET_DINIYAH: 'Nilai_Diniyah'
};

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
  
  const prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (prop) {
    return SpreadsheetApp.openById(prop);
  }
  
  throw new Error('Spreadsheet belum terhubung. Pastikan script terikat dengan Google Sheets atau set Script Property SPREADSHEET_ID.');
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
    // Normalisasi nama_murid jika kolomnya nama_santri
    if (!obj.nama_murid && obj.nama_santri) {
      obj.nama_murid = obj.nama_santri;
    }
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
      ['academic_year', '2025/2026', 'academic', 'Tahun Ajaran Aktif'],
      ['semester_active', 'I (Satu)', 'academic', 'Semester Aktif (I (Satu) / II (Dua))'],
      ['report_date', '17 Oktober 2025', 'academic', 'Tanggal Titimangsa Rapor'],
      ['report_place', 'Bogor', 'academic', 'Kota Pembagian Rapor'],
      ['wali_kelas_default', 'Kahlil Gibran, S.Pd.', 'academic', 'Wali Kelas Default'],
      ['headmaster_name', 'Arif Rohman, M.Pd.', 'signatory', 'Nama Kepala Sekolah'],
      ['headmaster_nip', '', 'signatory', 'NIP/NIY Kepala Sekolah'],
      ['headmaster_signature_url', '', 'signatory', 'URL Gambar TTD Kepala Sekolah (Opsional)'],
      ['report_footer_text', 'RAPOR TENGAH SEMESTER PROGRAM PORTOFOLIO SMP AL IMAM ISLAMIC SCHOOL', 'general', 'Teks Footer Rapor']
    ];
    sheetSettings.getRange(2, 1, defaultSettings.length, 4).setValues(defaultSettings);
  }
  
  // 2. Skema Users (4 Role: Admin, Kepala Sekolah, Guru, Wali Murid)
  const sheetUsers = getOrCreateSheet(DB_CONFIG.SHEET_USERS, ['id', 'username', 'password_hash', 'nama_lengkap', 'role', 'status', 'created_at']);
  if (sheetUsers.getLastRow() <= 1) {
    const defaultUsers = [
      ['USR-001', 'admin', 'admin123', 'Administrator Utama', 'admin', 'aktif', '2025-01-01'],
      ['USR-002', 'kepsek', 'kepsek123', 'Arif Rohman, M.Pd.', 'kepala_sekolah', 'aktif', '2025-01-01'],
      ['USR-003', 'guru', 'guru123', 'Kahlil Gibran, S.Pd.', 'guru', 'aktif', '2025-01-01'],
      ['USR-004', 'dewi', 'dewi123', 'Dewi Fitria Nugraheni, S.Pd., Gr.', 'guru', 'aktif', '2025-01-01'],
      ['USR-005', 'walimurid', 'wali123', 'Bpk. Rifaat (Wali Nadhif)', 'wali_murid', 'aktif', '2025-01-01']
    ];
    sheetUsers.getRange(2, 1, defaultUsers.length, 7).setValues(defaultUsers);
  }
  
  // 3. Skema Murid (DATA SISWA SESUAI EXCEL AL-IMAM)
  const sheetMurid = getOrCreateSheet(DB_CONFIG.SHEET_MURID, [
    'nis', 'nisn', 'nama_murid', 'kelas', 'jenis_kelamin', 'nama_wali', 'kontak_wali', 'status', 'kehadiran_s', 'kehadiran_i', 'kehadiran_a', 'ekskul_1', 'ekskul_2', 'ekskul_3', 'wali_kelas'
  ]);
  if (sheetMurid.getLastRow() <= 1) {
    const defaultMurid = [
      // IX ABU BAKAR (12 Murid)
      ['202509001', '0113408257', 'AHMAD YAZID ILMANY RAMADHAN', 'IX ABU BAKAR', 'L', 'Bpk. Ramadhan', '081234567801', 'Aktif', '2', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Kahlil Gibran, S.Pd.'],
      ['202509002', '0116425792', 'AL AZIZ BENZAVEIRO SUNARYO', 'IX ABU BAKAR', 'L', 'Bpk. Sunaryo', '081234567802', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Kahlil Gibran, S.Pd.'],
      ['202509003', '0113811055', 'ALWAN IBRAHIM', 'IX ABU BAKAR', 'L', 'Bpk. Ibrahim', '081234567803', 'Aktif', '2', '3', '4', 'Pramuka', 'Wushu', 'Futsal', 'Kahlil Gibran, S.Pd.'],
      ['202509004', '0114838409', 'AZKA DWI ABDHUL GHANIY', 'IX ABU BAKAR', 'L', 'Bpk. Ghaniy', '081234567804', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Kahlil Gibran, S.Pd.'],
      ['202509005', '0118589769', 'DZAKI AQEELA ALIFANDRA', 'IX ABU BAKAR', 'L', 'Bpk. Alifandra', '081234567805', 'Aktif', '2', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Kahlil Gibran, S.Pd.'],
      ['202509006', '0113915620', 'FARHAN PUTRA NOVRIANSYAH', 'IX ABU BAKAR', 'L', 'Bpk. Novriansyah', '081234567806', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Kahlil Gibran, S.Pd.'],
      ['202509007', '0118560424', 'GHAISAN FARRELLUZ SUKARNO', 'IX ABU BAKAR', 'L', 'Bpk. Sukarno', '081234567807', 'Aktif', '-', '3', '-', 'Pramuka', 'Wushu', 'Basket', 'Kahlil Gibran, S.Pd.'],
      ['202509008', '0119042818', 'GIBRAN ARGA PUTRAKU', 'IX ABU BAKAR', 'L', 'Bpk. Putraku', '081234567808', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Kahlil Gibran, S.Pd.'],
      ['202509009', '0107305756', 'LUTHFI FAEYZA SATRIOPUTRA', 'IX ABU BAKAR', 'L', 'Bpk. Satrioputra', '081234567809', 'Aktif', '-', '1', '-', 'Pramuka', 'Wushu', 'Futsal', 'Kahlil Gibran, S.Pd.'],
      ['202509010', '0108446122', 'MOHAMAD MIRZA RADITYA', 'IX ABU BAKAR', 'L', 'Bpk. Raditya', '081234567810', 'Aktif', '2', '-', '-', 'Pramuka', 'Wushu', 'Futsal', 'Kahlil Gibran, S.Pd.'],
      ['202509011', '0113743973', 'MUHAMMAD ALFAJRI', 'IX ABU BAKAR', 'L', 'Bpk. Alfajri', '081234567811', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Kahlil Gibran, S.Pd.'],
      ['202509012', '0103456069', 'NADHIF SYAFWAN RIFAAT', 'IX ABU BAKAR', 'L', 'Bpk. Rifaat', '081234567812', 'Aktif', '-', '3', '-', 'Pramuka', 'Wushu', 'Basket', 'Kahlil Gibran, S.Pd.'],
      
      // IX UMMU SALAMAH (16 Murid)
      ['202509101', '0112522587', 'ALIZA FAIDA NUR AZMI', 'IX UMMU SALAMAH', 'P', 'Bpk. Azmi', '081234567901', 'Aktif', '1', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509102', '0117401882', 'ALMIRA SYIFA RAHMADINI', 'IX UMMU SALAMAH', 'P', 'Bpk. Rahmadini', '081234567902', 'Aktif', '6', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509103', '0118273422', 'ANDI ATHIFA KHANSA TABINA', 'IX UMMU SALAMAH', 'P', 'Bpk. Pangerang', '081234567903', 'Aktif', '1', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509104', '3109536735', 'ANNISA GEMINTANG NOVIANI', 'IX UMMU SALAMAH', 'P', 'Bpk. Noviani', '081234567904', 'Aktif', '1', '1', '-', 'Pramuka', 'Wushu', 'Basket', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509105', '0117636003', 'AYESHA ALFIRA RAFANDA', 'IX UMMU SALAMAH', 'P', 'Bpk. Rafanda', '081234567905', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Basket', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509106', '0103651480', 'AYRA FARADINA MUMTAZAH', 'IX UMMU SALAMAH', 'P', 'Bpk. Mumtazah', '081234567906', 'Aktif', '3', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509107', '0115212757', 'CALISTA HUMAIRA NOOR KHAIRANI', 'IX UMMU SALAMAH', 'P', 'Bpk. Khairani', '081234567907', 'Aktif', '2', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509108', '0101875317', 'DAFINA ANGGUN KHAIRUNNISA', 'IX UMMU SALAMAH', 'P', 'Bpk. Khairunnisa', '081234567908', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509109', '0105915404', 'FATHIAH NUR AMALINA GHASSANI', 'IX UMMU SALAMAH', 'P', 'Bpk. Ghassani', '081234567909', 'Aktif', '2', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509110', '0109433278', 'FEIYAZ SABRINA', 'IX UMMU SALAMAH', 'P', 'Bpk. Sabrina', '081234567910', 'Aktif', '-', '1', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509111', '0102134181', 'HANA NADIAH', 'IX UMMU SALAMAH', 'P', 'Bpk. Nadiah', '081234567911', 'Aktif', '2', '-', '-', 'Pramuka', 'Wushu', 'Panahan', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509112', '0116883089', 'LINZIA KENIVAEL', 'IX UMMU SALAMAH', 'P', 'Bpk. Kenivael', '081234567912', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509113', '0105697995', 'RAEESA AMEERA ALSHAN', 'IX UMMU SALAMAH', 'P', 'Bpk. Alshan', '081234567913', 'Aktif', '-', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509114', '3117690947', 'ZAHRA RIZQI SYAHBANIA', 'IX UMMU SALAMAH', 'P', 'Bpk. Syahbania', '081234567914', 'Aktif', '1', '-', '-', 'Pramuka', 'Wushu', 'English Club', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509115', '0111672076', 'ZAMEENA SARAH QANITA', 'IX UMMU SALAMAH', 'P', 'Bpk. Qanita', '081234567915', 'Aktif', '1', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Dewi Fitria Nugraheni, S.Pd., Gr.'],
      ['202509116', '0111010746', 'ZANIRA ATHAYALITA YUSUF', 'IX UMMU SALAMAH', 'P', 'Bpk. Yusuf', '081234567916', 'Aktif', '4', '-', '-', 'Pramuka', 'Wushu', 'Desain Grafis', 'Dewi Fitria Nugraheni, S.Pd., Gr.']
    ];
    sheetMurid.getRange(2, 1, defaultMurid.length, 15).setValues(defaultMurid);
  }
  
  // 4. Skema Nilai_Akademik (REKAP NILAI & CAPAIAN KOMPETENSI)
  const sheetAkademik = getOrCreateSheet(DB_CONFIG.SHEET_AKADEMIK, [
    'id', 'nis', 'semester', 'tahun_ajaran', 'mata_pelajaran', 'kkm', 'nilai_tugas', 'nilai_uts', 'nilai_akhir', 'predikat', 'capaian_kompetensi', 'catatan_guru'
  ]);
  if (sheetAkademik.getLastRow() <= 1) {
    const defaultAkademik = [
      ['NA-001', '202509001', 'Ganjil', '2025/2026', 'Akidah', 70, 87, 87, 87, 'A', 'Ananda menunjukkan pemahaman baik tentang adab dalam menyebut Asma\' Allah, Al-Qur\'an, dan Rasul-Nya serta baik dalam memahami makna bersyukur.', 'Sangat aktif dalam pembelajaran.'],
      ['NA-002', '202509001', 'Ganjil', '2025/2026', 'Akhlak', 72, 88, 88, 88, 'A', 'Ananda baik dalam menerapkan adab terhadap orang tua dan guru.', 'Pertahankan akhlak terpuji.'],
      ['NA-003', '202509001', 'Ganjil', '2025/2026', 'Hadits', 75, 82, 82, 82, 'B', 'Ananda baik dalam menghafal matan dan terjemah hadits kebersihan.', 'Tingkatkan muroja\'ah hadits.'],
      ['NA-004', '202509001', 'Ganjil', '2025/2026', 'Fikih', 75, 90, 92, 91, 'A', 'Ananda menguasai tata cara thaharah dan sholat fardhu secara sempurna.', 'Praktik ibadah sangat baik.'],
      ['NA-005', '202509001', 'Ganjil', '2025/2026', 'SKI', 75, 80, 80, 80, 'B', 'Ananda memahami sejarah perkembangan islam.', 'Terus tingkatkan literasi sejarah.'],
      ['NA-006', '202509001', 'Ganjil', '2025/2026', 'Pendidikan Pancasila', 75, 85, 85, 85, 'B', 'Ananda memiliki pemahaman wawasan kebangsaan yang baik.', 'Sikap toleran dan beradab.'],
      ['NA-007', '202509001', 'Ganjil', '2025/2026', 'Bahasa Indonesia', 75, 93, 93, 93, 'A', 'Ananda sangat baik dalam memahami struktur teks laporan percobaan.', 'Literasi sangat baik.'],
      ['NA-008', '202509001', 'Ganjil', '2025/2026', 'Bahasa Inggris', 73, 78, 78, 78, 'B', 'Ananda cukup baik dalam menggunakan berbagai ungkapan bahasa Inggris.', 'Tingkatkan conversation.'],
      ['NA-009', '202509001', 'Ganjil', '2025/2026', 'Matematika', 75, 84, 84, 84, 'B', 'Ananda baik dalam mengenali pola susunan bilangan.', 'Penalaran baik.'],
      ['NA-010', '202509001', 'Ganjil', '2025/2026', 'Ilmu Pengetahuan Alam', 75, 85, 85, 85, 'B', 'Ananda baik dalam memahami ciri makhluk hidup dan sistem reproduksi.', 'Eksperimen baik.'],
      ['NA-011', '202509001', 'Ganjil', '2025/2026', 'Ilmu Pengetahuan Sosial', 75, 89, 89, 89, 'B', 'Ananda baik dalam memahami kondisi geografis Indonesia.', 'Analisis spasial baik.'],
      ['NA-012', '202509001', 'Ganjil', '2025/2026', 'Prakarya', 70, 86, 86, 86, 'B', 'Ananda baik dalam membuat karya seni rupa modifikasi.', 'Kreatif.'],
      ['NA-013', '202509001', 'Ganjil', '2025/2026', 'Pendidikan Jasmani, Olahraga, dan Kesehatan', 72, 89, 89, 89, 'B', 'Ananda baik dalam mempraktikkan permainan bola voli dan sepak bola.', 'Sportif.'],
      ['NA-014', '202509001', 'Ganjil', '2025/2026', 'Bahasa Sunda', 75, 90, 90, 90, 'A', 'Ananda sangat baik dalam menganalisis biantara.', 'Sangat baik.'],
      ['NA-015', '202509001', 'Ganjil', '2025/2026', 'Informatika', 75, 85, 85, 85, 'B', 'Ananda baik dalam pemecahan persoalan komputasional.', 'Logika baik.'],
      ['NA-016', '202509001', 'Ganjil', '2025/2026', 'Bahasa Arab', 75, 76, 76, 76, 'C', 'Ananda cukup baik dalam penguasaan mufrodat dan dhomir.', 'Tingkatkan hafalan mufrodat.']
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
        'NK-001', '202509001', 'Ganjil', '2025/2026',
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
        'NK-002', '202509101', 'Ganjil', '2025/2026',
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
  
  // 6. Skema Nilai_Diniyah
  const sheetDiniyah = getOrCreateSheet(DB_CONFIG.SHEET_DINIYAH, [
    'id', 'nis', 'semester', 'tahun_ajaran', 'ziyadah_juz', 'murojaah_juz', 'nilai_tahfidz', 'adab_harian', 'ibadah_harian', 'bahasa_arab', 'catatan_musyrif'
  ]);
  if (sheetDiniyah.getLastRow() <= 1) {
    const defaultDiniyah = [
      ['ND-001', '202507001', 'Ganjil', '2025/2026', 'Juz 30 & Juz 29 (Lancar)', 'Juz 30 (Mutqin)', 94, 'Mumtaz (A)', 'Mumtaz (A)', 90, 'Alhamdulillah capaian ziyadah melampaui target tengah semester. Makhraj huruf, kaidah mad, dan tajwid sangat baik.'],
      ['ND-002', '202507002', 'Ganjil', '2025/2026', 'Juz 30 (15 Halaman)', 'Juz 30 (Surah An-Naba s.d At-Takwir)', 86, 'Jayyid Jiddan (B)', 'Mumtaz (A)', 84, 'Konsisten dalam halaqah tahfidz. Perlu penekanan pada kelancaran murojaah juz 30 secara mandiri.']
    ];
    sheetDiniyah.getRange(2, 1, defaultDiniyah.length, 11).setValues(defaultDiniyah);
  }
  
  return { status: 'success', message: 'Inisialisasi skema database Google Sheets berhasil!' };
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
  return list.find(s => String(s.nis) === String(nis) || String(s.nisn) === String(nis)) || null;
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
      murid.wali_kelas || 'Kahlil Gibran, S.Pd.'
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
  
  const tugas = Number(data.nilai_tugas) || 0;
  const uts = Number(data.nilai_uts) || 0;
  const akhir = data.nilai_akhir !== undefined && data.nilai_akhir !== '' ? Number(data.nilai_akhir) : Math.round((tugas * 0.4) + (uts * 0.6));
  const kkm = Number(data.kkm) || 75;
  
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
      data.tahun_ajaran || '2025/2026',
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
      tahun_ajaran: tahun_ajaran || '2025/2026',
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
      data.tahun_ajaran || '2025/2026',
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
      data.tahun_ajaran || '2025/2026',
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
