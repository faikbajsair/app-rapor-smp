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

  console.log('=== STARTING RBAC VERIFICATION TESTS ===\n');

  // TEST 1: WALI KELAS - DEWI (IX ABU BAKAR)
  console.log('--- TEST 1: WALI KELAS - DEWI (IX ABU BAKAR) ---');
  win.loginAsSpecificTeacher('dewi');
  console.log('Logged in user:', win.AppState.currentUser.username, '| Role:', win.AppState.currentUser.role);
  if (!win.isUserWaliKelas()) throw new Error('Dewi should be recognized as Wali Kelas!');
  const dewiClass = win.getUserAssignedClass();
  console.log('Assigned class:', dewiClass);
  if (dewiClass !== 'IX ABU BAKAR') throw new Error(`Dewi class mismatch: expected IX ABU BAKAR, got ${dewiClass}`);

  // Check class dropdown locking
  const walasClassDropdown = doc.getElementById('filter-murid-kelas');
  console.log('filter-murid-kelas locked class:', walasClassDropdown.getAttribute('data-locked-class'), '| value:', walasClassDropdown.value);
  if (walasClassDropdown.value !== 'IX ABU BAKAR') throw new Error('filter-murid-kelas is not locked to IX ABU BAKAR');

  // Check student dropdowns in academic modal
  win.populateMuridDropdowns();
  const studentOptions = Array.from(doc.getElementById('akademik-nis').options);
  console.log('Total students in dropdown for Dewi:', studentOptions.length);
  const otherClassStudents = studentOptions.filter(opt => !opt.textContent.includes('IX ABU BAKAR'));
  if (otherClassStudents.length > 0) {
    throw new Error(`Dewi sees students from other classes in dropdown: ${otherClassStudents[0].textContent}`);
  }
  console.log('✅ Dewi only sees students of IX ABU BAKAR');

  // TEST 2: WALI KELAS - SUMIATI (IX UMMU SALAMAH)
  console.log('\n--- TEST 2: WALI KELAS - SUMIATI (IX UMMU SALAMAH) ---');
  win.loginAsSpecificTeacher('sumiati');
  console.log('Logged in user:', win.AppState.currentUser.username, '| Role:', win.AppState.currentUser.role);
  const sumiatiClass = win.getUserAssignedClass();
  console.log('Assigned class:', sumiatiClass);
  if (sumiatiClass !== 'IX UMMU SALAMAH') throw new Error(`Sumiati class mismatch: ${sumiatiClass}`);
  win.populateMuridDropdowns();
  const sumiatiStudentOptions = Array.from(doc.getElementById('akademik-nis').options);
  console.log('Total students in dropdown for Sumiati:', sumiatiStudentOptions.length);
  const nonUmmuStudents = sumiatiStudentOptions.filter(opt => !opt.textContent.includes('IX UMMU SALAMAH'));
  if (nonUmmuStudents.length > 0) throw new Error('Sumiati sees students of other classes!');
  console.log('✅ Sumiati only sees students of IX UMMU SALAMAH');

  // TEST 3: GURU MAPEL - ZAMZAM (Akhlak, Hadits)
  console.log('\n--- TEST 3: GURU MAPEL - ZAMZAM (Akhlak, Hadits) ---');
  win.loginAsSpecificTeacher('zamzam');
  console.log('Logged in user:', win.AppState.currentUser.username, '| Role:', win.AppState.currentUser.role);
  if (!win.isUserGuruMapel()) throw new Error('Zamzam should be recognized as Guru Mapel!');
  const zamzamMapels = win.getUserAssignedMapels();
  console.log('Assigned mapels:', zamzamMapels);
  if (!zamzamMapels.includes('Akhlak') || !zamzamMapels.includes('Hadits')) {
    throw new Error('Zamzam missing assigned mapels!');
  }
  if (win.isMapelAssignedToUser('Matematika') || win.isMapelAssignedToUser('Bahasa Indonesia')) {
    throw new Error('Zamzam should NOT have access to Matematika or Bahasa Indonesia!');
  }
  console.log('✅ Zamzam mapels properly restricted');

  // Test Route Protection for Guru Mapel:
  // Guru Mapel must NOT be able to access homeroom-only views (kepemimpinan, diniyah, rapor, murid, cms)
  ['kepemimpinan', 'diniyah', 'rapor', 'murid', 'cms'].forEach(view => {
    win.switchView(view);
    if (win.AppState.currentView === view) {
      throw new Error(`Guru Mapel was able to access prohibited view: ${view}!`);
    }
  });
  console.log('✅ Prohibited homeroom views successfully blocked for Guru Mapel');

  // Test mapel restriction on Leger
  win.switchView('leger');
  const legerThead = doc.getElementById('leger-table-thead');
  const renderedHeaders = legerThead ? legerThead.textContent : '';
  console.log('Zamzam Leger headers:', renderedHeaders.replace(/\s+/g, ' ').substring(0, 80));
  if (renderedHeaders.includes('MTK') || renderedHeaders.includes('B.Indo') || renderedHeaders.includes('IPA')) {
    throw new Error('Leger for Guru Mapel contains non-assigned subjects!');
  }
  if (!renderedHeaders.includes('Akhlak') || !renderedHeaders.includes('Hadits')) {
    throw new Error('Leger for Zamzam missing assigned Akhlak or Hadits!');
  }
  console.log('✅ Leger properly hides non-assigned subjects and shows only assigned subjects for Guru Mapel');

  // TEST 4: GURU MAPEL - ASRIL (SKI, Bahasa Arab)
  console.log('\n--- TEST 4: GURU MAPEL - ASRIL (SKI, Bahasa Arab) ---');
  win.loginAsSpecificTeacher('asril');
  console.log('Logged in user:', win.AppState.currentUser.username, '| Role:', win.AppState.currentUser.role);
  const asrilMapels = win.getUserAssignedMapels();
  console.log('Assigned mapels:', asrilMapels);
  if (!asrilMapels.includes('SKI') || !asrilMapels.includes('Bahasa Arab')) {
    throw new Error('Asril missing assigned mapels!');
  }
  if (win.isMapelAssignedToUser('Akhlak') || win.isMapelAssignedToUser('PJOK')) {
    throw new Error('Asril should not have access to Akhlak or PJOK!');
  }
  console.log('✅ Asril mapels properly restricted');

  // TEST 5: SUPER ADMIN - ADMIN (Full Access)
  console.log('\n--- TEST 5: SUPER ADMIN - ADMIN ---');
  win.quickLoginRole('admin');
  console.log('Logged in user:', win.AppState.currentUser.username, '| Role:', win.AppState.currentUser.role);
  if (win.isUserWaliKelas() || win.isUserGuruMapel()) {
    throw new Error('Admin should not be constrained by Wali Kelas or Guru Mapel limits!');
  }
  win.switchView('leger');
  const adminLegerHeaders = doc.getElementById('leger-table-thead')?.textContent || '';
  console.log('Admin Leger headers summary:', adminLegerHeaders.replace(/\s+/g, ' ').substring(0, 100));
  if (!adminLegerHeaders.includes('MTK') || !adminLegerHeaders.includes('Informatika') || !adminLegerHeaders.includes('B.Indo')) {
    throw new Error('Admin Leger missing full 16 subjects!');
  }
  console.log('✅ Super Admin has full unrestricted access to all 16 subjects and all classes');

  // TEST 6: WALI MURID - WALIMURID (Abdillah Zulqarnain - IX Abu Bakar)
  console.log('\n--- TEST 6: WALI MURID - WALIMURID (@walimurid) ---');
  win.loginAsSpecificTeacher('walimurid', 'wali123');
  console.log('Logged in user:', win.AppState.currentUser.username, '| Role:', win.AppState.currentUser.role, '| NIS:', win.AppState.currentUser.nis);
  if (win.AppState.currentUser.role !== 'wali_murid') throw new Error('User role should be wali_murid!');
  if (win.AppState.currentUser.nis !== '242507001') throw new Error('Wali murid NIS mismatch!');

  // Check UI: non-wali elements should be hidden
  const nonWaliEls = Array.from(doc.querySelectorAll('.menu-non-wali'));
  const visibleNonWali = nonWaliEls.filter(el => !el.classList.contains('hidden'));
  if (visibleNonWali.length > 0) throw new Error(`Wali murid should not see non-wali menu elements! Found: ${visibleNonWali.length}`);
  console.log('✅ Prohibited non-wali menus successfully hidden from Wali Murid');

  // Check Rapor menu item is visible for Wali Murid
  const raporNav = doc.getElementById('nav-item-rapor');
  if (!raporNav || raporNav.classList.contains('hidden')) throw new Error('nav-item-rapor should be visible for Wali Murid!');
  const raporLabel = doc.getElementById('nav-label-rapor')?.textContent.trim();
  console.log('Rapor menu label for Wali Murid:', raporLabel);
  if (raporLabel !== 'Rapor Ananda') throw new Error(`Expected label "Rapor Ananda", got "${raporLabel}"`);
  console.log('✅ Rapor menu correctly accessible and renamed to "Rapor Ananda"');

  // Check student isolation in Rapor dropdown
  win.populateMuridDropdowns();
  const raporStudentOptions = Array.from(doc.getElementById('rapor-murid-select')?.options || []);
  console.log('Total students accessible to Wali Murid in Rapor select:', raporStudentOptions.length);
  if (raporStudentOptions.length !== 1 || !raporStudentOptions[0].textContent.includes('ABDILLAH')) {
    throw new Error('Wali Murid should only see their own child in the report dropdown!');
  }
  // TEST 7: WALI MURID LOGIN USING NIS (NIS 262707001 - Aezar El Khazindar Walidain)
  console.log('\n--- TEST 7: WALI MURID DIRECT LOGIN VIA STUDENT NIS ---');
  win.loginAsSpecificTeacher('wali.aezar', 'wali123');
  console.log('Logged in user:', win.AppState.currentUser.username, '| Role:', win.AppState.currentUser.role, '| NIS:', win.AppState.currentUser.nis);
  if (win.AppState.currentUser.role !== 'wali_murid') throw new Error('Role should be wali_murid!');
  if (win.AppState.currentUser.nis !== '262707001') throw new Error('NIS should be 262707001!');
  win.populateMuridDropdowns();
  const aezarOptions = Array.from(doc.getElementById('rapor-murid-select')?.options || []);
  if (aezarOptions.length !== 1 || !aezarOptions[0].textContent.includes('AEZAR')) {
    throw new Error('Aezar parent should only see Aezar El Khazindar Walidain!');
  }
  console.log('✅ Aezar parent successfully isolated to Aezar El Khazindar Walidain');

  // TEST 8: WALI MURID DASHBOARD - ANEKDOT (A-RECORD) & BIMBINGAN KONSELING (BK)
  console.log('\n--- TEST 8: WALI MURID DASHBOARD - ANEKDOT (A-RECORD) & BIMBINGAN KONSELING (BK) ---');
  win.loginAsSpecificTeacher('walimurid', 'wali123');
  win.switchView('dashboard');
  
  const waliDash = doc.getElementById('dashboard-wali-view');
  if (!waliDash || waliDash.classList.contains('hidden')) {
    throw new Error('dashboard-wali-view should be visible for Wali Murid!');
  }
  
  const anekdotList = doc.getElementById('wali-anekdot-list');
  const bkList = doc.getElementById('wali-bk-list');
  if (!anekdotList || !bkList) throw new Error('Anekdot or BK container not found!');
  
  console.log('Anekdot cards count:', anekdotList.children.length);
  if (anekdotList.children.length < 3) {
    throw new Error(`Expected at least 3 Anecdotal record cards for Abdillah, got ${anekdotList.children.length}`);
  }
  
  console.log('BK cards count:', bkList.children.length);
  if (bkList.children.length < 2) {
    throw new Error(`Expected at least 2 BK counseling cards for Abdillah, got ${bkList.children.length}`);
  }

  const anekdotCountBadge = doc.getElementById('badge-anekdot-count')?.textContent.trim();
  const bkCountBadge = doc.getElementById('badge-bk-count')?.textContent.trim();
  console.log('Badges:', { anekdotCountBadge, bkCountBadge });
  if (!anekdotCountBadge.includes('3 Catatan')) throw new Error('Anekdot count badge mismatch');
  if (!bkCountBadge.includes('2 Sesi')) throw new Error('BK count badge mismatch');

  // Test Filter Switcher
  win.filterWaliReportCards('anekdot');
  if (doc.getElementById('section-wali-anekdot').classList.contains('hidden')) throw new Error('Anekdot section should be visible in anekdot filter!');
  if (!doc.getElementById('section-wali-konseling').classList.contains('hidden')) throw new Error('BK section should be hidden in anekdot filter!');

  win.filterWaliReportCards('konseling');
  if (!doc.getElementById('section-wali-anekdot').classList.contains('hidden')) throw new Error('Anekdot section should be hidden in konseling filter!');
  if (doc.getElementById('section-wali-konseling').classList.contains('hidden')) throw new Error('BK section should be visible in konseling filter!');

  win.filterWaliReportCards('all');
  if (doc.getElementById('section-wali-anekdot').classList.contains('hidden') || doc.getElementById('section-wali-konseling').classList.contains('hidden')) {
    throw new Error('Both sections should be visible in all filter!');
  }
  console.log('✅ Filter tabs between All, Anekdot, and BK working seamlessly');

  // Test Printable Modal
  win.openModalAnekdotPrint();
  const printModal = doc.getElementById('modal-wali-anekdot-print');
  if (!printModal || printModal.classList.contains('hidden')) throw new Error('Print modal should be visible after openModalAnekdotPrint!');
  const printName = doc.getElementById('print-anekdot-nama')?.textContent.trim();
  console.log('Print modal student name:', printName);
  if (!printName.includes('ABDILLAH')) throw new Error(`Print modal student name mismatch: ${printName}`);
  win.closeModalAnekdotPrint();
  if (!printModal.classList.contains('hidden')) throw new Error('Print modal should be hidden after closeModalAnekdotPrint!');
  console.log('✅ Official Printable Anekdot Modal verified successfully');

  // TEST 9: WALI MURID UI CLEANUP (Tutorial button, Petunjuk Rapor in Header only, and Tarik/Batal Publish hidden)
  console.log('\n--- TEST 9: WALI MURID UI CLEANUP & PERMISSIONS ---');
  win.loginAsSpecificTeacher('walimurid', 'wali123');
  
  // 1. Tombol Tutorial harus hidden untuk wali murid
  const navTutorialWali = doc.getElementById('nav-btn-tutorial');
  if (navTutorialWali && !navTutorialWali.classList.contains('hidden')) {
    throw new Error('Tombol Tutorial (#nav-btn-tutorial) should be hidden for Wali Murid!');
  }
  console.log('✅ Tombol Tutorial tersembunyi untuk Wali Murid');

  // 1b. Tombol Pemilih Periode T.A. & Semester (nav-btn-academic-year) harus hidden untuk wali murid
  const navYearWali = doc.getElementById('nav-btn-academic-year');
  if (navYearWali && !navYearWali.classList.contains('hidden')) {
    throw new Error('Tombol Periode T.A. & Semester (#nav-btn-academic-year) should be hidden for Wali Murid!');
  }
  console.log('✅ Tombol Periode T.A. & Semester tersembunyi untuk Wali Murid');

  // 1c. Tombol Cetak Rapor di Header (#nav-btn-quick-print) dan Badge Wali Murid (#nav-role-badge-container) harus hidden untuk wali murid
  const navQuickPrintWali = doc.getElementById('nav-btn-quick-print');
  if (navQuickPrintWali && !navQuickPrintWali.classList.contains('hidden')) {
    throw new Error('Tombol Cetak Rapor Header (#nav-btn-quick-print) should be hidden for Wali Murid!');
  }
  const navRoleBadgeWali = doc.getElementById('nav-role-badge-container');
  if (navRoleBadgeWali && !navRoleBadgeWali.classList.contains('hidden')) {
    throw new Error('Badge Peran (#nav-role-badge-container) should be hidden for Wali Murid!');
  }
  console.log('✅ Tombol Cetak Rapor Header dan Badge Peran tersembunyi untuk Wali Murid');

  // Login sebagai Guru: Tombol Tutorial, T.A., Cetak Rapor, dan Badge Walas harus tampil
  win.loginAsSpecificTeacher('dewi');
  const navTutorialTeacher = doc.getElementById('nav-btn-tutorial');
  if (navTutorialTeacher && navTutorialTeacher.classList.contains('hidden')) {
    throw new Error('Tombol Tutorial (#nav-btn-tutorial) should be visible for Guru / Walas!');
  }
  const navYearTeacher = doc.getElementById('nav-btn-academic-year');
  if (navYearTeacher && navYearTeacher.classList.contains('hidden')) {
    throw new Error('Tombol Periode T.A. (#nav-btn-academic-year) should be visible for Guru / Walas!');
  }
  const navQuickPrintTeacher = doc.getElementById('nav-btn-quick-print');
  if (navQuickPrintTeacher && navQuickPrintTeacher.classList.contains('hidden')) {
    throw new Error('Tombol Cetak Rapor Header (#nav-btn-quick-print) should be visible for Guru / Walas!');
  }
  const navRoleBadgeTeacher = doc.getElementById('nav-role-badge-container');
  if (navRoleBadgeTeacher && navRoleBadgeTeacher.classList.contains('hidden')) {
    throw new Error('Badge Peran (#nav-role-badge-container) should be visible for Guru / Walas!');
  }
  console.log('✅ Tombol Tutorial, T.A., Cetak Rapor Header, dan Badge Peran tampil untuk Guru / Walas');

  // Kembali login sebagai Wali Murid
  win.loginAsSpecificTeacher('walimurid', 'wali123');

  // 2. Tombol Petunjuk Rapor harus ada di Header (#nav-btn-petunjuk-rapor) dan tidak ada di sidebar
  const headerPetunjukBtn = doc.getElementById('nav-btn-petunjuk-rapor');
  if (!headerPetunjukBtn) {
    throw new Error('Tombol Petunjuk Rapor di Header (#nav-btn-petunjuk-rapor) must exist!');
  }
  if (headerPetunjukBtn.classList.contains('hidden')) {
    throw new Error('Tombol Petunjuk Rapor di Header should be visible to Wali Murid!');
  }
  const sidebarPetunjuk = doc.getElementById('nav-item-petunjuk');
  if (sidebarPetunjuk) {
    throw new Error('Tombol Petunjuk di sidebar harus sudah dihapus agar hanya ada di Header!');
  }
  console.log('✅ Tombol Petunjuk Rapor tersedia di Header Navbar dan bersih dari sidebar/lokasi lain');

  // 3. Tombol Tarik / Batal Publish Rapor harus tersembunyi bagi Wali Murid
  win.switchView('rapor');
  const btnPublish = doc.getElementById('btn-toggle-publish-rapor');
  const adminPublishActions = doc.getElementById('rapor-publish-admin-actions');
  const publishControlBar = doc.getElementById('rapor-publish-control-bar');
  
  // Test kondisi saat rapor SUDAH dipublish
  win.updatePublishUIState(true, 'IX ABU BAKAR', 'ABDILLAH ZULQARNAIN');
  if (btnPublish && !btnPublish.classList.contains('hidden')) {
    throw new Error('Tombol Tarik / Batal Publish Rapor must be HIDDEN for Wali Murid when published!');
  }
  if (adminPublishActions && !adminPublishActions.classList.contains('hidden')) {
    throw new Error('rapor-publish-admin-actions must be HIDDEN for Wali Murid when published!');
  }
  if (publishControlBar && !publishControlBar.classList.contains('hidden')) {
    throw new Error('rapor-publish-control-bar should be HIDDEN for Wali Murid when published!');
  }

  // Test kondisi saat rapor DRAFT (Belum Dipublish)
  win.updatePublishUIState(false, 'IX ABU BAKAR', 'ABDILLAH ZULQARNAIN');
  if (btnPublish && !btnPublish.classList.contains('hidden')) {
    throw new Error('Tombol Tarik / Batal Publish Rapor must be HIDDEN for Wali Murid when draft!');
  }
  if (adminPublishActions && !adminPublishActions.classList.contains('hidden')) {
    throw new Error('rapor-publish-admin-actions must be HIDDEN for Wali Murid when draft!');
  }
  // 4. Input Pencarian Siswa (filter-rapor-search) harus tersembunyi bagi Wali Murid
  const searchContainerWali = doc.getElementById('filter-rapor-search-container');
  const searchInputWali = doc.getElementById('filter-rapor-search');
  if (searchContainerWali && !searchContainerWali.classList.contains('hidden')) {
    throw new Error('Container Cari Nama Siswa (#filter-rapor-search-container) must be HIDDEN for Wali Murid!');
  }
  if (searchInputWali && !searchInputWali.classList.contains('hidden')) {
    throw new Error('Input Cari Nama Siswa (#filter-rapor-search) must be HIDDEN for Wali Murid!');
  }
  console.log('✅ Input Cari Nama Siswa tersembunyi 100% untuk Wali Murid');

  // Login Guru: Input Pencarian Siswa harus tampil
  win.loginAsSpecificTeacher('dewi');
  win.switchView('rapor');
  const searchContainerTeacher = doc.getElementById('filter-rapor-search-container');
  const searchInputTeacher = doc.getElementById('filter-rapor-search');
  if (searchContainerTeacher && searchContainerTeacher.classList.contains('hidden')) {
    throw new Error('Container Cari Nama Siswa should be VISIBLE for Guru / Walas!');
  }
  if (searchInputTeacher && searchInputTeacher.classList.contains('hidden')) {
    throw new Error('Input Cari Nama Siswa should be VISIBLE for Guru / Walas!');
  }
  console.log('✅ Input Cari Nama Siswa tampil normal untuk Guru / Walas');

  console.log('\n🎉 ALL RBAC, WALI MURID, ANEKDOT & BK VERIFICATION TESTS PASSED 100% SUCCESSFULLY!');
}, 500);
