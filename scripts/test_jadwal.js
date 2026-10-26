const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('🚀 Running Unit & Integration Tests: Jadwal Pelajaran (Sidebar & Kalender Interaktif)...');

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

  // 3. Testing Removal from Dashboard & Sidebar Integration
  console.log('\n--- 3. Testing Dashboard Cleanliness & Sidebar Navigation Item ---');
  const navJadwal = document.getElementById('nav-item-jadwal');
  assert(navJadwal !== null, 'Sidebar menu link #nav-item-jadwal must exist in DOM');
  assert(!navJadwal.classList.contains('menu-non-wali'), '#nav-item-jadwal must NOT have menu-non-wali class so Wali Murid can access it');

  const secJadwalInDashboard = document.getElementById('section-wali-jadwal');
  assert(secJadwalInDashboard === null, 'Section #section-wali-jadwal must be removed from dashboard');

  const tabJadwalInDashboard = document.getElementById('tab-wali-jadwal');
  assert(tabJadwalInDashboard === null, 'Tab button #tab-wali-jadwal must be removed from dashboard');

  const viewJadwal = document.getElementById('view-jadwal');
  assert(viewJadwal !== null, 'Dedicated view #view-jadwal must exist in DOM');

  // 4. Testing switchView('jadwal')
  console.log('\n--- 4. Testing switchView("jadwal") ---');
  window.switchView('jadwal');
  assert(!viewJadwal.classList.contains('hidden'), '#view-jadwal must NOT be hidden after switchView("jadwal")');
  assert(window.AppState.currentView === 'jadwal', 'AppState.currentView must be "jadwal"');

  // 5. Testing Calendar Initialization & Rendering
  console.log('\n--- 5. Testing Interactive Calendar Grid & Selected Day Schedule ---');
  window.initJadwalCalendar();

  const calendarGrid = document.getElementById('calendar-days-grid');
  assert(calendarGrid !== null, '#calendar-days-grid must exist');
  assert(calendarGrid.children.length >= 28, `Calendar grid must have at least 28 day cells (found: ${calendarGrid.children.length})`);

  const monthYearLabel = document.getElementById('calendar-month-year-label');
  assert(monthYearLabel && monthYearLabel.textContent.trim().length > 0, 'Calendar month & year label must be populated');
  console.log('  Calendar month/year:', monthYearLabel.textContent.trim());

  const slotsContainer = document.getElementById('jadwal-slots-container');
  assert(slotsContainer !== null, '#jadwal-slots-container must exist');
  assert(slotsContainer.children.length > 0, 'Slots container must have schedule items for the selected day');

  const dateTitle = document.getElementById('selected-date-title');
  assert(dateTitle && dateTitle.textContent.trim().length > 0, '#selected-date-title must show the selected date');
  console.log('  Selected day schedule:', dateTitle.textContent.trim(), `(${slotsContainer.children.length} time slots)`);

  // 6. Testing Selecting Date on Calendar
  console.log('\n--- 6. Testing selectCalendarWeekday & selectCalendarDate ---');
  window.selectCalendarWeekday('SELASA');
  const selDayBadge = document.getElementById('selected-day-badge');
  assert(selDayBadge && selDayBadge.textContent.includes('SELASA'), 'Selected day badge must show SELASA');

  const uniformPill = document.getElementById('selected-day-uniform-pill');
  assert(uniformPill && uniformPill.textContent.toLowerCase().includes('batik'), 'Uniform pill for SELASA must show Batik');

  // 7. Testing Interactive Click on Subject -> Mapel Capaian Modal
  console.log('\n--- 7. Testing openMapelCapaianDetail & Grade Presentation from Calendar ---');
  const modalMapel = document.getElementById('modal-mapel-capaian');
  assert(modalMapel !== null, 'Modal #modal-mapel-capaian must exist in DOM');

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

  assert(scoreEl && Number(scoreEl.textContent) > 0, 'Score element must display valid numeric score');
  assert(kkmEl && Number(kkmEl.textContent) === 75, 'KKM must be 75');
  assert(deltaEl && deltaEl.textContent.length > 0, 'Delta score must be displayed');
  assert(predikatEl && ['A', 'B', 'C', 'D'].includes(predikatEl.textContent.trim()), 'Predikat must be A, B, C, or D');
  assert(titleEl && titleEl.textContent.toLowerCase().includes('matematika'), 'Subject title must show Matematika');
  assert(guruEl && guruEl.textContent.includes('Tri Yuli'), 'Teacher name must show Tri Yuli Aryani');

  // 8. Testing Close Modal
  console.log('\n--- 8. Testing closeMapelCapaianDetail ---');
  window.closeMapelCapaianDetail();
  assert(modalMapel.classList.contains('hidden'), 'Modal #modal-mapel-capaian must be hidden after closeMapelCapaianDetail()');

  // 9. Testing Wali Murid Role Access to Jadwal View
  console.log('\n--- 9. Testing Wali Murid Role Navigation to Jadwal View ---');
  window.loginAsSpecificTeacher('walimurid', 'wali123');
  assert(window.AppState.currentUser.role === 'wali_murid', 'Logged in as wali_murid');

  window.switchView('jadwal');
  assert(!viewJadwal.classList.contains('hidden'), 'Wali murid can access #view-jadwal without being blocked');
  assert(navJadwal && !navJadwal.classList.contains('hidden'), '#nav-item-jadwal is visible in sidebar for Wali Murid');

  console.log('\n🎉 ALL JADWAL (SIDEBAR & KALENDER) TESTS PASSED 100% SUCCESSFULLY!');
}, 500);
