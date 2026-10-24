const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('public/index.html', 'utf8');
const virtualConsole = new VirtualConsole();
virtualConsole.on('error', (err) => console.error('BROWSER ERROR:', err));
virtualConsole.on('warn', (w) => console.warn('BROWSER WARN:', w));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'https://app-rapor-smp.vercel.app/',
  virtualConsole
});

setTimeout(() => {
  const win = dom.window;
  const doc = win.document;

  console.log('=== STARTING RESUME GRAFIK NILAI VERIFICATION TESTS ===\n');

  // TEST 1: Student Grade Data Calculation
  console.log('--- TEST 1: STUDENT GRADE DATA ENGINE ---');
  const studentData = win.getStudentGradeData('242507001'); // ABDILLAH ZULQARNAIN ARRAZI
  console.log('Student Name:', studentData.nama_murid, '| Class:', studentData.kelas);
  console.log('Total Scores count:', studentData.scores.length);
  if (studentData.scores.length !== 16) throw new Error(`Expected 16 scores, got ${studentData.scores.length}`);
  console.log('Average Score:', studentData.avg, '| Predikat:', studentData.predikat);
  console.log('Highest Score:', studentData.highest.name, '=>', studentData.highest.score);
  console.log('Lowest Score:', studentData.lowest.name, '=>', studentData.lowest.score);
  console.log('KKM Pass Count:', `${studentData.tuntasCount}/16 (${studentData.tuntasPct}%)`);
  
  if (studentData.avg <= 0 || isNaN(studentData.avg)) throw new Error('Invalid student average score');
  if (studentData.highest.score < studentData.lowest.score) throw new Error('Highest score cannot be less than lowest score');
  if (studentData.clusters.agama.items.length !== 5) throw new Error('Kelompok Agama should have 5 subjects');
  if (studentData.clusters.umum.items.length !== 8) throw new Error('Kelompok Umum should have 8 subjects');
  if (studentData.clusters.mulok.items.length !== 3) throw new Error('Kelompok Mulok should have 3 subjects');
  console.log('Cluster Averages:', {
    Agama: studentData.clusters.agama.avg,
    Umum: studentData.clusters.umum.avg,
    Mulok: studentData.clusters.mulok.avg
  });
  console.log('✅ Student Grade Data Engine calculated accurately\n');

  // TEST 2: Class Grade Data Calculation
  console.log('--- TEST 2: CLASS AVERAGE GRADE ENGINE ---');
  const classData = win.getClassGradeData('IX ABU BAKAR');
  console.log('Class Label:', classData.nama_murid, '| Average:', classData.avg);
  if (classData.scores.length !== 16) throw new Error(`Expected 16 scores for class, got ${classData.scores.length}`);
  if (classData.avg <= 0 || isNaN(classData.avg)) throw new Error('Invalid class average score');
  console.log('✅ Class Average Engine calculated accurately\n');

  // TEST 3: Modal Interaction & Tabs
  console.log('--- TEST 3: RESUME CHART MODAL & TAB SWITCHING ---');
  win.openResumeChartModal('242507001');
  const modal = doc.getElementById('modal-resume-chart-nilai');
  if (modal.classList.contains('hidden')) throw new Error('Resume Chart Modal should not be hidden when opened');
  
  // Verify KPI rendering in modal
  const kpiAvg = doc.getElementById('resume-kpi-avg')?.textContent;
  const kpiMax = doc.getElementById('resume-kpi-max-score')?.textContent;
  console.log('Modal KPI Average:', kpiAvg, '| Max Score:', kpiMax);
  if (!kpiAvg || kpiAvg === '0.0') throw new Error('Modal KPI Average was not rendered');

  // Tab Switching
  win.switchResumeChartTab('radar');
  if (doc.getElementById('resume-pane-radar').classList.contains('hidden')) throw new Error('Radar pane should be visible');
  if (!doc.getElementById('resume-pane-bar').classList.contains('hidden')) throw new Error('Bar pane should be hidden');

  win.switchResumeChartTab('rumpun');
  if (doc.getElementById('resume-pane-rumpun').classList.contains('hidden')) throw new Error('Rumpun pane should be visible');

  win.switchResumeChartTab('tabel');
  if (doc.getElementById('resume-pane-tabel').classList.contains('hidden')) throw new Error('Tabel pane should be visible');
  const tableRows = doc.querySelectorAll('#resume-table-tbody tr');
  console.log('Table rows rendered:', tableRows.length);
  if (tableRows.length !== 16) throw new Error(`Expected 16 table rows for 16 subjects, got ${tableRows.length}`);

  win.closeResumeChartModal();
  if (!modal.classList.contains('hidden')) throw new Error('Resume Chart Modal should be hidden after closing');
  console.log('✅ Resume Chart Modal & Tab Switching verified\n');

  // TEST 4: Parent Portal (Wali Murid) Resume Chart Section
  console.log('--- TEST 4: WALI MURID EMBEDDED RESUME CHART ---');
  win.loginAsSpecificTeacher('walimurid'); // Login as parent
  win.loadDashboardStats();
  const parentAvg = doc.getElementById('wali-kpi-avg')?.textContent;
  const parentMax = doc.getElementById('wali-kpi-max-score')?.textContent;
  console.log('Parent Portal KPI - Avg:', parentAvg, '| Max Score:', parentMax);
  if (!parentAvg || parentAvg === '0.0') throw new Error('Parent portal KPI average not rendered');

  // Filter tab to 'grafik'
  win.filterWaliReportCards('grafik');
  if (doc.getElementById('section-wali-grafik').classList.contains('hidden')) throw new Error('section-wali-grafik should be visible on grafik tab');
  if (!doc.getElementById('section-wali-anekdot').classList.contains('hidden')) throw new Error('section-wali-anekdot should be hidden on grafik tab');
  console.log('✅ Wali Murid Embedded Resume Chart verified\n');

  // TEST 5: Teacher / Admin Dashboard Chart Section & Class Restriction
  console.log('--- TEST 5: TEACHER & ADMIN CHART CONTROLS & RBAC ---');
  win.loginAsSpecificTeacher('dewi'); // Wali Kelas IX ABU BAKAR
  win.initAdminChartSection();
  const adminClassSelect = doc.getElementById('admin-chart-kelas-select');
  console.log('Dewi (Wali Kelas) locked class value:', adminClassSelect.value, '| disabled:', adminClassSelect.disabled);
  if (adminClassSelect.value !== 'IX ABU BAKAR') throw new Error('Dewi should have IX ABU BAKAR selected in admin chart');
  if (!adminClassSelect.disabled) throw new Error('Class selector should be locked/disabled for Wali Kelas');
  
  const adminStudentOptions = Array.from(doc.getElementById('admin-chart-student-select').options);
  console.log('Total student options for Dewi:', adminStudentOptions.length);
  if (adminStudentOptions.length < 2) throw new Error('Admin chart should list students in the class');
  console.log('✅ Teacher & Admin Chart Section RBAC verified\n');

  console.log('🎉 ALL RESUME GRAFIK NILAI & CHART VERIFICATION TESTS PASSED 100% SUCCESSFULLY!\n');

}, 1500);
