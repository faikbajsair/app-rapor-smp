const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('🚀 Running Unit & Integration Tests: Jadwal Pelajaran & Modal Capaian Nilai...');

const indexPath = path.join(__dirname, '../public/index.html');
if (!fs.existsSync(indexPath)) {
  console.error('❌ public/index.html does not exist! Please run node scripts/bundle.js first.');
  process.exit(1);
}

const virtualConsole = new (require('jsdom').VirtualConsole)();
virtualConsole.on("error", (err) => { console.error("JSDOM Error:", err); });
virtualConsole.on("jsdomError", (err) => { console.error("JSDOM Exception:", err); });

const html = fs.readFileSync(indexPath, 'utf-8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  virtualConsole,
  url: 'http://localhost/'
});

setTimeout(() => {
  const { window } = dom;
  const { document } = window;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
      process.exit(1);
    }
    console.log(`  ✓ ${message}`);
  }

// 1. Check Schedule Dataset existence
console.log('\n--- 1. Testing Schedule Dataset (JADWAL_DATA_MAP & SERAGAM) ---');
assert(window.JADWAL_DATA_MAP !== undefined, 'JADWAL_DATA_MAP must be exported on window');
assert(window.SERAGAM_JADWAL_MAP !== undefined, 'SERAGAM_JADWAL_MAP must be exported on window');

const expectedClasses = ['VII AISYAH', 'VII UTSMAN', 'VIII KHODIJAH', 'VIII UMAR', 'IX UMMU SALAMAH', 'IX ABU BAKAR'];
expectedClasses.forEach(cls => {
  const cData = window.JADWAL_DATA_MAP[cls];
  assert(cData !== undefined, `Schedule for class ${cls} must exist`);
  assert(cData.wali_kelas && cData.wali_kelas.length > 0, `Class ${cls} must have an assigned wali kelas`);
  
  const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM\'AT'];
  days.forEach(day => {
    assert(cData.days[day] && cData.days[day].length > 0, `Class ${cls} must have schedule entries for ${day}`);
  });
});

// 2. Check Uniform Mapping
console.log('\n--- 2. Testing Daily Uniform Requirements ---');
const uniforms = window.SERAGAM_JADWAL_MAP;
assert(uniforms['SENIN'].seragam.toLowerCase().includes('putih biru'), 'Senin uniform must be Putih biru');
assert(uniforms['SELASA'].seragam.toLowerCase().includes('batik'), 'Selasa uniform must be Batik Putih');
assert(uniforms['RABU'].seragam.toLowerCase().includes('hijau'), 'Rabu uniform must be Kotak-kotak hijau');
assert(uniforms['KAMIS'].seragam.toLowerCase().includes('gamis') || uniforms['KAMIS'].seragam.toLowerCase().includes('koko'), 'Kamis uniform must be Gamis/koko');
assert(uniforms['JUM\'AT'].seragam.toLowerCase().includes('pramuka'), 'Jum\'at uniform must be Pramuka');

// 3. Testing Parent Portal Tab Navigation & Section
console.log('\n--- 3. Testing Tab Navigation & Jadwal Section in Parent Portal ---');
const tabJadwal = document.getElementById('tab-wali-jadwal');
const secJadwal = document.getElementById('section-wali-jadwal');
const modalMapel = document.getElementById('modal-mapel-capaian');

assert(tabJadwal !== null, 'Tab button #tab-wali-jadwal must exist in DOM');
assert(secJadwal !== null, 'Section container #section-wali-jadwal must exist in DOM');
assert(modalMapel !== null, 'Modal #modal-mapel-capaian must exist in DOM');

// Simulate switching tab to 'jadwal'
window.filterWaliReportCards('jadwal');
assert(!secJadwal.classList.contains('hidden'), 'Section #section-wali-jadwal must NOT be hidden when filter is "jadwal"');

const secGrafik = document.getElementById('section-wali-grafik');
assert(secGrafik.classList.contains('hidden'), 'Section #section-wali-grafik must be hidden when tab is "jadwal"');

// Switch back to 'all'
window.filterWaliReportCards('all');
assert(!secJadwal.classList.contains('hidden'), 'Section #section-wali-jadwal must be visible when filter is "all"');
assert(!secGrafik.classList.contains('hidden'), 'Section #section-wali-grafik must be visible when filter is "all"');

// 4. Testing Render Schedule
console.log('\n--- 4. Testing renderWaliJadwal ---');
const mockMurid = {
  nis: '242507001',
  nama_murid: 'Aisyah Putri Pratama',
  kelas: 'VII AISYAH',
  wali_kelas: 'Tri Yuli Aryani, S.Pd., Gr.'
};

window.renderWaliJadwal('242507001', mockMurid);
const jadwalContainer = document.getElementById('wali-jadwal-container');
assert(jadwalContainer !== null, 'Jadwal container must exist');
assert(jadwalContainer.children.length > 0, 'Jadwal container must contain rendered day schedule cards');

const walasBadge = document.getElementById('wali-jadwal-walas');
assert(walasBadge && walasBadge.textContent.includes('Tri Yuli'), 'Wali kelas text must match Tri Yuli Aryani');

// 5. Testing Interactive Click on Subject -> Mapel Capaian Modal
console.log('\n--- 5. Testing openMapelCapaianDetail & Grade Presentation ---');
window.openMapelCapaianDetail(
  encodeURIComponent('Matematika'),
  encodeURIComponent('SENIN'),
  encodeURIComponent('10.00 - 11.00'),
  encodeURIComponent('Tri Yuli Aryani, S.Pd., Gr.'),
  encodeURIComponent('MATEMATIKA')
);

assert(!modalMapel.classList.contains('hidden'), 'Modal #modal-mapel-capaian must be visible after click');

const scoreEl = document.getElementById('modal-mapel-score');
const kkmEl = document.getElementById('modal-mapel-kkm');
const deltaEl = document.getElementById('modal-mapel-delta');
const predikatEl = document.getElementById('modal-mapel-predikat');
const titleEl = document.getElementById('modal-mapel-title');
const guruEl = document.getElementById('modal-mapel-guru');
const optEl = document.getElementById('modal-mapel-capaian-optimal');

assert(scoreEl && Number(scoreEl.textContent) > 0, 'Score element must display valid numeric score');
assert(kkmEl && Number(kkmEl.textContent) === 75, 'KKM must be 75');
assert(deltaEl && deltaEl.textContent.length > 0, 'Delta score must be displayed');
assert(predikatEl && ['A', 'B', 'C', 'D'].includes(predikatEl.textContent.trim()), 'Predikat must be A, B, C, or D');
assert(titleEl && titleEl.textContent.toLowerCase().includes('matematika'), 'Subject title must show Matematika');
assert(guruEl && guruEl.textContent.includes('Tri Yuli'), 'Teacher name must show Tri Yuli Aryani');
assert(optEl && optEl.textContent.length > 20, 'Optimal achievement narrative must be populated');

// 6. Testing Close Modal
console.log('\n--- 6. Testing closeMapelCapaianDetail ---');
window.closeMapelCapaianDetail();
assert(modalMapel.classList.contains('hidden'), 'Modal #modal-mapel-capaian must be hidden after closeMapelCapaianDetail()');

console.log('\n🎉 ALL JADWAL & MAPEL CAPAIAN TESTS PASSED SUCCESSFULLY! 100% VALIDATED.');
}, 500);
