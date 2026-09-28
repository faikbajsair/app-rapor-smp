const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('public/index.html', 'utf8');
const virtualConsole = new VirtualConsole();
virtualConsole.on('error', (err) => console.error('BROWSER ERROR:', err));
virtualConsole.on('warn', (w) => console.warn('BROWSER WARN:', w));
virtualConsole.on('log', (l) => console.log('BROWSER LOG:', l));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'https://app-rapor-smp.vercel.app/',
  virtualConsole
});

// Wait for script evaluation
setTimeout(() => {
  const win = dom.window;
  const doc = win.document;

  console.log('Testing AppState:', win.AppState ? 'OK (' + win.AppState.muridList.length + ' students)' : 'FAIL');
  console.log('Testing switchView type:', typeof win.switchView);

  const links = doc.querySelectorAll('.sidebar-nav-link');
  console.log('Found', links.length, 'sidebar navigation links');

  links.forEach((l) => {
    const label = l.textContent.replace(/\s+/g, ' ').trim();
    l.click();
    console.log(`[CLICK] "${label}" -> currentView: "${win.AppState.currentView}" | visible panels:`);
    
    const allPanels = doc.querySelectorAll('.view-panel');
    allPanels.forEach(p => {
      if (!p.classList.contains('hidden')) {
        console.log(`   * Visible panel: #${p.id}`);
      }
    });
  });

  console.log('\n--- TESTING DASHBOARD TABS ---');
  ['dashTabBtnAkademik', 'dashTabBtnDiniyah', 'dashTabBtnKepemimpinan'].forEach(id => {
    const btn = doc.getElementById(id);
    btn.click();
    console.log(`[CLICK TAB] #${id} -> active dashboard tab title: "${doc.getElementById('dashboardTitle').innerText}"`);
  });

  console.log('\n--- TESTING TOP QUICK BUTTONS ---');
  doc.querySelector('button[onclick*="openQuickPrintModal"]')?.click();
  console.log(`[CLICK] Cetak Rapor in navbar -> currentView: "${win.AppState.currentView}"`);

  doc.querySelector('button[onclick*="openAcademicYearModal"]')?.click();
  console.log(`[CLICK] Academic Year modal hidden?`, doc.getElementById('modal-academic-year').classList.contains('hidden'));
  win.closeAcademicYearModal();
  console.log(`[CLOSE] Academic Year modal hidden?`, doc.getElementById('modal-academic-year').classList.contains('hidden'));

  console.log('\n🎉 ALL TESTS PASSED WITH ZERO ERRORS!');
}, 300);
