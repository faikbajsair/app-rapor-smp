/**
 * ============================================================================
 * RAPORSERVICE.GS - Layanan Agregasi & Generator Rapor Tengah Semester SMP Al-Imam (AI IS)
 * Mengintegrasikan 3 Aspek: Akademik, Kepemimpinan, dan Diniyah
 * ============================================================================
 */

/**
 * Mengambil Seluruh Data Rapor Lengkap untuk 1 Murid
 */
function getMuridReportData(nis) {
  if (!nis) return { success: false, message: 'NIS Murid wajib diisi.' };
  
  const murid = getMuridByNis(nis);
  if (!murid) return { success: false, message: 'Data murid dengan NIS ' + nis + ' tidak ditemukan.' };
  
  const settings = getSettings();
  const currentSemester = settings.semester_active || 'Ganjil';
  const currentYear = settings.academic_year || '2025/2026';
  
  // 1. Data Akademik
  const rawAkademik = getNilaiAkademikList({ nis: nis });
  const akademikFiltered = rawAkademik.filter(n => 
    String(n.semester).toLowerCase() === currentSemester.toLowerCase() &&
    String(n.tahun_ajaran) === currentYear
  );
  
  let totalNilaiAkhir = 0;
  akademikFiltered.forEach(item => {
    totalNilaiAkhir += Number(item.nilai_akhir) || 0;
  });
  const rataRataAkademik = akademikFiltered.length > 0 
    ? (totalNilaiAkhir / akademikFiltered.length).toFixed(1) 
    : 0;
  
  // 2. Data Kepemimpinan
  const rawKepemimpinan = getNilaiKepemimpinanList({ nis: nis });
  const kepemimpinan = rawKepemimpinan.find(n => 
    String(n.semester).toLowerCase() === currentSemester.toLowerCase() &&
    String(n.tahun_ajaran) === currentYear
  ) || {
    kedisiplinan: 'Belum Dinilai',
    organisasi: 'Belum Dinilai',
    karakter_adab: 'Belum Dinilai',
    inisiatif_kemandirian: 'Belum Dinilai',
    catatan_pembina: 'Belum ada catatan dari pembina kepemimpinan.'
  };
  
  // 3. Data Diniyah
  const rawDiniyah = getNilaiDiniyahList({ nis: nis });
  const diniyah = rawDiniyah.find(n => 
    String(n.semester).toLowerCase() === currentSemester.toLowerCase() &&
    String(n.tahun_ajaran) === currentYear
  ) || {
    ziyadah_juz: '-',
    murojaah_juz: '-',
    nilai_tahfidz: 0,
    adab_harian: 'Belum Dinilai',
    ibadah_harian: 'Belum Dinilai',
    bahasa_arab: 0,
    catatan_musyrif: 'Belum ada catatan dari musyrif tahfidz/diniyah.'
  };
  
  return {
    success: true,
    data: {
      settings: settings,
      murid: murid,
      santri: murid, // alias
      akademik: {
        items: akademikFiltered,
        totalNilai: totalNilaiAkhir,
        rataRata: rataRataAkademik,
        jumlahMapel: akademikFiltered.length
      },
      kepemimpinan: kepemimpinan,
      diniyah: diniyah,
      generatedAt: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd MMMM yyyy HH:mm')
    }
  };
}

// Alias for backward compatibility
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
  
  // Hitung jumlah kelas unik
  const kelasSet = new Set(muridList.map(s => s.kelas).filter(k => Boolean(k)));
  
  // Rata-rata nilai akademik keseluruhan
  let sumAkademik = 0;
  akademikList.forEach(a => { sumAkademik += Number(a.nilai_akhir) || 0; });
  const avgAkademik = akademikList.length > 0 ? (sumAkademik / akademikList.length).toFixed(1) : 0;
  
  // Murid yang sudah memiliki nilai lengkap 3 aspek
  const currentSemester = settings.semester_active || 'Ganjil';
  const currentYear = settings.academic_year || '2025/2026';
  
  let muridLengkapCount = 0;
  muridList.forEach(s => {
    const hasAk = akademikList.some(a => String(a.nis) === String(s.nis));
    const hasKp = kepemimpinanList.some(k => String(k.nis) === String(s.nis));
    const hasDn = diniyahList.some(d => String(d.nis) === String(s.nis));
    if (hasAk && hasKp && hasDn) {
      muridLengkapCount++;
    }
  });
  
  const progressPercent = totalMurid > 0 ? Math.round((muridLengkapCount / totalMurid) * 100) : 0;
  
  return {
    success: true,
    stats: {
      totalMurid: totalMurid,
      totalSantri: totalMurid, // alias
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
