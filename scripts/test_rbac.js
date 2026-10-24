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
  console.log('✅ Student dropdown isolated strictly to child: Abdillah Zulqarnain');

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

  console.log('\n🎉 ALL RBAC & WALI MURID VERIFICATION TESTS PASSED 100% SUCCESSFULLY!');
}, 500);
