/**
 * ============================================================================
 * RAPORSERVICE.GS - Layanan Generator & Perhitungan Rapor Portofolio SMP Al-Imam (AI IS)
 * Mengadopsi Logika & Desain Sheet Excel Resmi SMP Al-Imam Islamic School
 * ============================================================================
 */

/**
 * Mengambil Seluruh Data Rapor Portofolio Lengkap untuk 1 Murid
 */
function getMuridReportData(nis) {
  if (!nis) return { success: false, message: 'NIS Murid wajib diisi.' };
  
  const murid = getMuridByNis(nis);
  if (!murid) return { success: false, message: 'Data murid dengan NIS ' + nis + ' tidak ditemukan.' };
  
  const settings = getSettings();
  const currentSemester = settings.semester_active || 'Ganjil';
  const currentYear = settings.academic_year || '2025/2026';
  
  // 1. Data Rekap Nilai Akademik & Capaian Kompetensi
  const rawAkademik = getNilaiAkademikList({ nis: nis });
  const akademikFiltered = rawAkademik.filter(n => 
    String(n.semester).toLowerCase() === currentSemester.toLowerCase() &&
    String(n.tahun_ajaran) === currentYear
  );
  
  let totalNilaiAkhir = 0;
  akademikFiltered.forEach(item => {
    totalNilaiAkhir += Number(item.nilai_akhir || item.nilai_uts || item.nilai || 0);
  });
  const rataRataAkademik = akademikFiltered.length > 0 
    ? (totalNilaiAkhir / akademikFiltered.length).toFixed(1) 
    : 0;
  
  // 2. Data Ahlaq & Kepribadian (6 Aspek Al-Imam + Catatan Diperhatikan)
  const rawKepemimpinan = getNilaiKepemimpinanList({ nis: nis });
  const kepribadian = rawKepemimpinan.find(n => 
    String(n.semester).toLowerCase() === currentSemester.toLowerCase() &&
    String(n.tahun_ajaran) === currentYear
  ) || {
    ibadah: 'Jadikan ibadah sebagai kebutuhan, bukan hanya kewajiban.',
    akhlak: 'Keseimbangan antara kemampuan akademis serta sikap & akhlak mulia menjadikanmu insan yang lebih baik.',
    kedisiplinan_kerajinan: 'Jadikanlah kedisiplinan dan kerajinan sebagai bekalmu dalam meraih cita-cita.',
    kerapihan_kebersihan: 'Kerapihan & kebersihan diri merupakan cermin pribadi seorang muslim, jadikanlah itu sebagai identitasmu.',
    kepemimpinan: 'Kemampuan memimpinmu terlihat baik, lanjutkan usahamu mengajak teman-teman dalam kebaikan.',
    kerjasama: 'Berbagi peran dalam kerjasama kelompok akan menciptakan keharmonisan.',
    catatan_diperhatikan: 'Ketekunan dalam belajar saat ini merupakan wujud keseriusan untuk meraih hasil belajar yang maksimal, & cita-cita di masa depan. Tingkatkan semangat belajarmu.',
    catatan_pembina: 'Menunjukkan akhlak terpuji dan kedisiplinan yang baik.'
  };
  
  // 3. Data Diniyah & Tahfidz
  const rawDiniyah = getNilaiDiniyahList({ nis: nis });
  const diniyah = rawDiniyah.find(n => 
    String(n.semester).toLowerCase() === currentSemester.toLowerCase() &&
    String(n.tahun_ajaran) === currentYear
  ) || {
    ziyadah_juz: 'Juz 30 & Juz 29 (Lancar)',
    murojaah_juz: 'Juz 30 (Mutqin)',
    nilai_tahfidz: 94,
    adab_harian: 'Mumtaz (A)',
    ibadah_harian: 'Mumtaz (A)',
    bahasa_arab: 90,
    catatan_musyrif: 'Alhamdulillah capaian hafalan dan adab sangat baik.'
  };
  
  return {
    success: true,
    data: {
      settings: settings,
      murid: {
        ...murid,
        kehadiran_s: murid.kehadiran_s || '-',
        kehadiran_i: murid.kehadiran_i || '-',
        kehadiran_a: murid.kehadiran_a || '-',
        ekskul_1: murid.ekskul_1 || 'Pramuka',
        ekskul_2: murid.ekskul_2 || 'Wushu',
        ekskul_3: murid.ekskul_3 || 'Futsal',
        wali_kelas: murid.wali_kelas || 'Kahlil Gibran, S.Pd.'
      },
      santri: murid, // alias
      akademik: {
        items: akademikFiltered,
        totalNilai: totalNilaiAkhir,
        rataRata: rataRataAkademik,
        jumlahMapel: akademikFiltered.length
      },
      kepribadian: kepribadian,
      kepemimpinan: kepribadian, // alias
      diniyah: diniyah,
      generatedAt: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd MMMM yyyy HH:mm')
    }
  };
}

function getSantriReportData(nis) {
  return getMuridReportData(nis);
}

/**
 * Mengambil Ringkasan Statistik untuk Dashboard Beranda
 */
function getDashboardSummaryStats() {
  const muridList = getAllMurid();
  const akademikList = getNilaiAkademikList();
  const kepemimpinanList = getNilaiKepemimpinanList();
  const diniyahList = getNilaiDiniyahList();
  const settings = getSettings();
  
  const totalMurid = muridList.length;
  const kelasSet = new Set(muridList.map(s => s.kelas).filter(k => Boolean(k)));
  
  let sumAkademik = 0;
  akademikList.forEach(a => { sumAkademik += Number(a.nilai_akhir || a.nilai_uts || 0); });
  const avgAkademik = akademikList.length > 0 ? (sumAkademik / akademikList.length).toFixed(1) : 0;
  
  const currentSemester = settings.semester_active || 'Ganjil';
  const currentYear = settings.academic_year || '2025/2026';
  
  let muridLengkapCount = 0;
  muridList.forEach(s => {
    const hasAk = akademikList.some(a => String(a.nis) === String(s.nis));
    const hasKp = kepemimpinanList.some(k => String(k.nis) === String(s.nis));
    const hasDn = diniyahList.some(d => String(d.nis) === String(s.nis));
    if (hasAk && hasKp && hasDn) muridLengkapCount++;
  });
  
  const progressPercent = totalMurid > 0 ? Math.round((muridLengkapCount / totalMurid) * 100) : 0;
  
  return {
    success: true,
    stats: {
      totalMurid: totalMurid,
      totalSantri: totalMurid,
      totalKelas: kelasSet.size,
      daftarKelas: Array.from(kelasSet).sort(),
      avgAkademik: avgAkademik,
      totalNilaiAkademikInput: akademikList.length,
      totalKepemimpinanInput: kepemimpinanList.length,
      totalDiniyahInput: diniyahList.length,
      muridLengkapCount: muridLengkapCount,
      santriLengkapCount: muridLengkapCount,
      progressPercent: progressPercent,
      activeSemester: currentSemester,
      activeYear: currentYear,
      schoolName: settings.school_name || 'SMP Al-Imam Islamic School (AI IS)'
    }
  };
}
