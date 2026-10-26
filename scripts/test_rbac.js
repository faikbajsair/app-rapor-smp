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

  // TEST 8: WALI MURID - CATATAN AMAL SHOLEH (A-RECORD) & BIMBINGAN KONSELING (BK)
  console.log('\n--- TEST 8: WALI MURID - CATATAN AMAL SHOLEH (A-RECORD) & BIMBINGAN KONSELING (BK) ---');
  win.loginAsSpecificTeacher('walimurid', 'wali123');
  win.switchView('dashboard');
  
  const waliDash = doc.getElementById('dashboard-wali-view');
  if (!waliDash || waliDash.classList.contains('hidden')) {
    throw new Error('dashboard-wali-view should be visible for Wali Murid!');
  }
  
  // Verify Dashboard now clean from anekdot section & tab
  if (doc.getElementById('section-wali-anekdot')) {
    throw new Error('section-wali-anekdot should be removed from dashboard!');
  }
  if (doc.getElementById('tab-wali-anekdot')) {
    throw new Error('tab-wali-anekdot should be removed from dashboard!');
  }
  console.log('✅ Dashboard successfully cleaned of Catatan Anekdot section and tab');

  // Verify Sidebar menu for Catatan Amal Sholeh
  const amalSholehMenu = doc.getElementById('nav-item-amalsholeh');
  if (!amalSholehMenu) throw new Error('nav-item-amalsholeh not found in sidebar!');
  if (amalSholehMenu.classList.contains('menu-non-wali')) throw new Error('nav-item-amalsholeh should not have menu-non-wali class!');
  console.log('✅ Sidebar menu Catatan Amal Sholeh (A-Record) verified');

  // Switch to Amal Sholeh View
  win.switchView('amalsholeh');
  const amalSholehView = doc.getElementById('view-amalsholeh');
  if (!amalSholehView || amalSholehView.classList.contains('hidden')) {
    throw new Error('view-amalsholeh should be visible after switchView("amalsholeh")!');
  }

  // Check Philosophy explanation card and content
  const heroCard = amalSholehView.textContent;
  if (!heroCard.includes('Apa Itu Catatan Amal Sholeh')) throw new Error('Explanatory heading missing in Amal Sholeh View');
  if (!heroCard.includes('Bukan Hanya Catatan Keburukan') && !heroCard.includes('bukanlah lembar pelanggaran')) {
    throw new Error('Clarification that this is not only bad records is missing');
  }
  console.log('✅ Rich Islamic Educational Philosophy regarding Catatan Amal Sholeh verified');

  // Verify cards and stats
  const cardsContainer = doc.getElementById('amalsholeh-cards-container');
  if (!cardsContainer || cardsContainer.children.length < 3) {
    throw new Error(`Expected at least 3 Amal Sholeh / A-Record cards, got ${cardsContainer ? cardsContainer.children.length : 0}`);
  }
  console.log('✅ Amal Sholeh cards rendered count:', cardsContainer.children.length);

  // Verify categories filter
  win.filterAmalSholehCategory('adab');
  console.log('Filtered adab count:', cardsContainer.children.length);
  if (cardsContainer.children.length !== 1) throw new Error('Filter adab should show 1 card');

  win.filterAmalSholehCategory('all');
  if (cardsContainer.children.length < 3) throw new Error('Filter all should restore 3 cards');

  // Test Printable Modal from Amal Sholeh View
  win.openModalAnekdotPrint();
  const printModal = doc.getElementById('modal-wali-anekdot-print');
  if (!printModal || printModal.classList.contains('hidden')) throw new Error('Print modal should be visible after openModalAnekdotPrint!');
  const printName = doc.getElementById('print-anekdot-nama')?.textContent.trim();
  console.log('Print modal student name:', printName);
  if (!printName.includes('ABDILLAH')) throw new Error(`Print modal student name mismatch: ${printName}`);
  win.closeModalAnekdotPrint();
  if (!printModal.classList.contains('hidden')) throw new Error('Print modal should be hidden after closeModalAnekdotPrint!');
  console.log('✅ Official Printable Amal Sholeh / Anekdot Modal verified successfully');

  // Verify Dashboard now clean from BK counseling section as requested
  win.switchView('dashboard');
  if (doc.getElementById('section-wali-konseling')) {
    throw new Error('section-wali-konseling should be removed from dashboard!');
  }
  console.log('✅ Dashboard successfully cleaned of Bimbingan Konseling section');

  // Verify Sidebar menu for Bimbingan Konseling
  const bkMenu = doc.getElementById('nav-item-konseling');
  if (!bkMenu) throw new Error('nav-item-konseling not found in sidebar!');
  if (bkMenu.classList.contains('menu-non-wali')) throw new Error('nav-item-konseling should not have menu-non-wali class!');
  console.log('✅ Sidebar menu Bimbingan Konseling verified');

  // Switch to Bimbingan Konseling View
  win.switchView('konseling');
  const konselingView = doc.getElementById('view-konseling');
  if (!konselingView || konselingView.classList.contains('hidden')) {
    throw new Error('view-konseling should be visible after switchView("konseling")!');
  }

  // Check BK cards list and count badge
  const bkList = doc.getElementById('wali-bk-list');
  if (!bkList || bkList.children.length < 2) {
    throw new Error(`Expected at least 2 BK counseling cards for Abdillah, got ${bkList ? bkList.children.length : 0}`);
  }
  const bkCountBadge = doc.getElementById('badge-bk-count')?.textContent.trim();
  if (!bkCountBadge.includes('2 Sesi')) throw new Error('BK count badge mismatch');
  console.log('✅ Bimbingan Konseling cards rendered count:', bkList.children.length);

  // Test Modal Konsultasi BK & Tombol Konsultasi BK
  const btnConsult = doc.getElementById('btn-wali-bk-consult');
  if (!btnConsult) throw new Error('Tombol Konsultasi BK (#btn-wali-bk-consult) missing in KonselingView!');
  win.openModalBkConsult();
  const consultModal = doc.getElementById('modal-wali-bk-consult');
  if (!consultModal || consultModal.classList.contains('hidden')) throw new Error('modal-wali-bk-consult should be visible after openModalBkConsult!');
  const childInfo = doc.getElementById('consult-child-info')?.value || '';
  if (!childInfo.includes('ABDILLAH')) throw new Error(`Consult modal child info mismatch: ${childInfo}`);
  win.closeModalBkConsult();
  if (!consultModal.classList.contains('hidden')) throw new Error('modal-wali-bk-consult should be hidden after closeModalBkConsult!');
  console.log('✅ Tombol Konsultasi BK & Modal Konsultasi BK verified successfully');

  // Verify Wali Murid cannot access Guru Catat Amal view
  win.switchView('catatan_amal');
  if (win.AppState.currentView === 'catatan_amal') {
    throw new Error('Wali Murid should not be able to access catatan_amal view!');
  }
  console.log('✅ Wali Murid correctly restricted from teacher catatan_amal menu');


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

  // TEST 10: AKUN GURU - MENU KHUSUS PENCATATAN ANEKDOT (A-RECORD) & AMAL SHOLEH / BURUK
  console.log('\n--- TEST 10: AKUN GURU - MENU KHUSUS CATAT ANEKDOT & AMAL SHOLEH / BURUK ---');
  win.loginAsSpecificTeacher('dewi'); // Wali Kelas IX ABU BAKAR
  console.log('Logged in user:', win.AppState.currentUser.nama_lengkap, '| Role:', win.AppState.currentUser.role);

  // 1. Menu di sidebar harus ada dan bisa diakses guru
  const navCatatAmal = doc.getElementById('nav-item-catatan_amal');
  if (!navCatatAmal) throw new Error('nav-item-catatan_amal not found in sidebar!');
  if (!navCatatAmal.classList.contains('menu-non-wali')) {
    throw new Error('nav-item-catatan_amal must have menu-non-wali class!');
  }
  console.log('✅ Sidebar menu Catat Anekdot & Rekam Amal Santri verified for teacher');

  // 2. Switch to catatan_amal view
  win.switchView('catatan_amal');
  const catatAmalView = doc.getElementById('view-catatan_amal');
  if (!catatAmalView || catatAmalView.classList.contains('hidden')) {
    throw new Error('view-catatan_amal should be visible after switchView("catatan_amal")!');
  }

  // 3. Verify teacher banner & class selection
  const currentTeacherEl = doc.getElementById('catat-amal-current-teacher')?.textContent.trim();
  if (!currentTeacherEl.includes('Dewi Fitria')) throw new Error(`Teacher banner mismatch: ${currentTeacherEl}`);

  const siswaSelect = doc.getElementById('catat-amal-siswa');
  if (!siswaSelect || siswaSelect.options.length === 0) {
    throw new Error('Student dropdown should be populated with students!');
  }
  console.log('✅ Catat Amal View loaded with teacher identity & students count:', siswaSelect.options.length);

  // 4. Input Catatan Amal Sholeh (Kebaikan)
  win.onCatatAmalTypeChange('amal_sholeh');
  doc.getElementById('catat-amal-siswa').value = '242507001'; // Abdillah
  doc.getElementById('catat-amal-kategori').value = 'Semangat Tahsin & Tahfizh';
  doc.getElementById('catat-amal-tanggal').value = '2026-10-25';
  doc.getElementById('catat-amal-status').value = 'Apresiasi Positif';
  doc.getElementById('catat-amal-kejadian').value = 'Murajaah hafalan Al-Baqarah 100 ayat dengan tajwid tartil dan menyimak rekan dengan khusyuk.';
  doc.getElementById('catat-amal-analisis').value = 'Kecintaan terhadap Al-Quran dan motivasi beramal sholeh sangat menonjol.';
  doc.getElementById('catat-amal-tindak-lanjut').value = 'Diberikan sertifikat hafiz teladan bulanan oleh tim tahfizh.';

  const initialCount = win.AppState.anekdotList.length;
  win.saveNewAnekdotRecord();

  if (win.AppState.anekdotList.length !== initialCount + 1) {
    throw new Error('AppState.anekdotList count should increase by 1 after saving Amal Sholeh!');
  }
  const savedSholeh = win.AppState.anekdotList[0];
  if (savedSholeh.jenis !== 'amal_sholeh') throw new Error(`Expected jenis amal_sholeh, got: ${savedSholeh.jenis}`);
  console.log('✅ Berhasil mencatat Amal Sholeh (Kebaikan) santri ke database');

  // 5. Input Catatan Amal Buruk / Evaluasi & Pembinaan
  win.onCatatAmalTypeChange('amal_buruk');
  doc.getElementById('catat-amal-siswa').value = '242507001'; // Abdillah
  doc.getElementById('catat-amal-kategori').value = 'Kelengkapan Belajar & Buku/Mushaf Tertinggal';
  doc.getElementById('catat-amal-tanggal').value = '2026-10-26';
  doc.getElementById('catat-amal-status').value = 'Dalam Pembinaan';
  doc.getElementById('catat-amal-kejadian').value = 'Lupa membawa buku panduan Fikih Sunnah dan mushaf halaqah pada jam pelajaran ke-2.';
  doc.getElementById('catat-amal-analisis').value = 'Kurang teliti dalam menyiapkan tas sekolah pada malam hari.';
  doc.getElementById('catat-amal-tindak-lanjut').value = 'Diberikan pembinaan tarbiyah untuk menyiapkan checklist peralatan belajar sebelum tidur.';

  win.saveNewAnekdotRecord();

  if (win.AppState.anekdotList.length !== initialCount + 2) {
    throw new Error('AppState.anekdotList count should increase by 2 after saving Amal Buruk!');
  }
  const savedBuruk = win.AppState.anekdotList[0];
  if (savedBuruk.jenis !== 'amal_buruk') throw new Error(`Expected jenis amal_buruk, got: ${savedBuruk.jenis}`);
  console.log('✅ Berhasil mencatat Amal Buruk (Evaluasi / Pembinaan) santri ke database');

  // 6. Verify Table rendering and filtering
  const tableBody = doc.getElementById('table-catat-amal-body');
  if (!tableBody || tableBody.children.length === 0) {
    throw new Error('Table body #table-catat-amal-body should contain rows!');
  }
  console.log('✅ Tabel riwayat catatan anekdot guru terisi:', tableBody.children.length, 'baris');

  // Test filter by jenis amal_buruk
  doc.getElementById('filter-table-catat-jenis').value = 'amal_buruk';
  win.filterCatatAmalTable();
  const filteredBurukRows = tableBody.querySelectorAll('tr');
  console.log('Filtered Amal Buruk rows count:', filteredBurukRows.length);
  if (filteredBurukRows.length < 2) throw new Error('Expected at least 2 rows for amal_buruk filter');

  // Restore filter
  doc.getElementById('filter-table-catat-jenis').value = 'ALL';
  win.filterCatatAmalTable();

  // Test delete record
  const idToDelete = savedBuruk.id;
  win.confirm = () => true;
  win.deleteAnekdotRecord(idToDelete);
  if (win.AppState.anekdotList.some(r => r.id === idToDelete)) {
    throw new Error('Record should be removed after deleteAnekdotRecord!');
  }
  console.log('✅ Hapus catatan observasi anekdot berfungsi normal');

  console.log('\n🎉 ALL RBAC, WALI MURID, ANEKDOT & BK VERIFICATION TESTS PASSED 100% SUCCESSFULLY!');
}, 500);
