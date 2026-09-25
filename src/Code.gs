/**
 * ============================================================================
 * CODE.GS - Controller Utama & Router API Web App (MVC Pattern)
 * Aplikasi Rapor Tengah Semester SMP Al-Imam (AI IS)
 * ============================================================================
 */

/**
 * Entrypoint Web Application (GET Request)
 */
function doGet(e) {
  // Jika parameter API dipanggil (untuk Vercel/Client eksternal via GET)
  if (e && e.parameter && e.parameter.api === 'true') {
    return handleRestApiGet(e.parameter);
  }
  
  // Render View HTML Utama (Mendukung Index_Complete, views/Index, dan Index)
  let template;
  try {
    template = HtmlService.createTemplateFromFile('Index_Complete');
  } catch (err0) {
    try {
      template = HtmlService.createTemplateFromFile('views/Index');
    } catch (err1) {
      try {
        template = HtmlService.createTemplateFromFile('Index');
      } catch (err2) {
        return HtmlService.createHtmlOutput(
          '<div style="font-family:sans-serif;padding:30px;max-width:600px;margin:auto;text-align:center;">' +
          '<h2 style="color:#e11d48;">File View HTML Belum Ditambahkan</h2>' +
          '<p style="color:#475569;">Pastikan Anda telah membuat file HTML bernama <code>Index_Complete</code> atau <code>Index</code> di editor Apps Script.</p>' +
          '</div>'
        ).setTitle('Rapor Tengah Semester SMP Al-Imam (AI IS)');
      }
    }
  }
  
  // Load settings awal untuk injected metadata
  try {
    template.cmsSettings = getSettings();
  } catch (err) {
    // Jika sheet belum terinisialisasi
    template.cmsSettings = {
      school_name: 'SMP Al-Imam Islamic School (AI IS)',
      school_logo_url: 'https://alimamischool.com/wp-content/uploads/2020/08/Al-Imam-Islamic-School-alimamischool.com-sekolah-sunnah-logo.png',
      theme_primary_color: '#1e3a8a',
      theme_secondary_color: '#0284c7',
      theme_accent_color: '#10b981'
    };
  }
  
  return template.evaluate()
    .setTitle('Rapor Tengah Semester SMP Al-Imam (AI IS)')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Entrypoint POST Request (REST API Endpoint untuk Vercel / Client Eksternal)
 */
function doPost(e) {
  try {
    let requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }
    const result = dispatchApiAction(requestData.action, requestData.payload || {});
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Gagal memproses permintaan POST: ' + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper untuk menyertakan partial HTML modular di Apps Script (Resilient include)
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e1) {
    try {
      if (filename.indexOf('views/') === 0) {
        return HtmlService.createHtmlOutputFromFile(filename.replace('views/', '')).getContent();
      } else {
        return HtmlService.createHtmlOutputFromFile('views/' + filename).getContent();
      }
    } catch (e2) {
      return '<!-- Gagal memuat komponen: ' + filename + ' -->';
    }
  }
}

/**
 * Handler REST API GET
 */
function handleRestApiGet(params) {
  const action = params.action || 'ping';
  let payload = {};
  if (params.payload) {
    try {
      payload = JSON.parse(params.payload);
    } catch (e) {
      payload = params;
    }
  } else {
    payload = params;
  }
  
  const result = dispatchApiAction(action, payload);
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Central API Action Dispatcher (Digunakan oleh google.script.run dan REST API)
 */
function dispatchApiAction(action, payload) {
  try {
    switch (action) {
      // Inisialisasi
      case 'initDatabase':
        return initDatabase();
        
      // Autentikasi
      case 'login':
        return authenticateUser(payload.username, payload.password);
        
      // Pengaturan CMS
      case 'getSettings':
        return { success: true, data: getSettings() };
      case 'updateSettings':
        return updateSettings(payload);
        
      // Dashboard Summary
      case 'getSummaryStats':
        return getDashboardSummaryStats();
        
      // Santri
      case 'getSantri':
        return { success: true, data: getAllSantri(payload.kelas) };
      case 'saveSantri':
        return saveSantri(payload);
      case 'deleteSantri':
        return deleteSantri(payload.nis);
        
      // Users
      case 'getUsers':
        return { success: true, data: getAllUsers() };
      case 'saveUser':
        return saveUser(payload);
      case 'deleteUser':
        return deleteUser(payload.id);
      case 'changePassword':
        return changeUserPassword(payload.userId, payload.oldPassword, payload.newPassword);
        
      // Nilai Akademik
      case 'getNilaiAkademik':
        return { success: true, data: getNilaiAkademikList(payload) };
      case 'saveNilaiAkademik':
        return saveNilaiAkademik(payload);
      case 'deleteNilaiAkademik':
        return deleteNilaiAkademik(payload.id);
        
      // Nilai Kepemimpinan
      case 'getNilaiKepemimpinan':
        return { success: true, data: getNilaiKepemimpinanList(payload) };
      case 'saveNilaiKepemimpinan':
        return saveNilaiKepemimpinan(payload);
      case 'deleteNilaiKepemimpinan':
        return deleteNilaiKepemimpinan(payload.id);
        
      // Nilai Diniyah
      case 'getNilaiDiniyah':
        return { success: true, data: getNilaiDiniyahList(payload) };
      case 'saveNilaiDiniyah':
        return saveNilaiDiniyah(payload);
      case 'deleteNilaiDiniyah':
        return deleteNilaiDiniyah(payload.id);
        
      // Rapor Lengkap
      case 'getSantriReport':
        return getSantriReportData(payload.nis);
        
      default:
        return { success: false, message: 'Action API tidak dikenali: ' + action };
    }
  } catch (err) {
    return { success: false, message: 'Error Server: ' + err.toString() };
  }
}

/**
 * ============================================================================
 * EXPOSED FUNCTIONS FOR google.script.run (Direct Client-Side Bridge)
 * ============================================================================
 */
function apiInitDatabase() { return dispatchApiAction('initDatabase', {}); }
function apiLogin(username, password) { return dispatchApiAction('login', { username: username, password: password }); }
function apiGetSettings() { return dispatchApiAction('getSettings', {}); }
function apiUpdateSettings(settings) { return dispatchApiAction('updateSettings', settings); }
function apiGetSummaryStats() { return dispatchApiAction('getSummaryStats', {}); }

function apiGetSantri(kelas) { return dispatchApiAction('getSantri', { kelas: kelas }); }
function apiSaveSantri(data) { return dispatchApiAction('saveSantri', data); }
function apiDeleteSantri(nis) { return dispatchApiAction('deleteSantri', { nis: nis }); }

function apiGetUsers() { return dispatchApiAction('getUsers', {}); }
function apiSaveUser(data) { return dispatchApiAction('saveUser', data); }
function apiDeleteUser(id) { return dispatchApiAction('deleteUser', { id: id }); }
function apiChangePassword(userId, oldPass, newPass) { return dispatchApiAction('changePassword', { userId: userId, oldPassword: oldPass, newPassword: newPass }); }

function apiGetNilaiAkademik(filters) { return dispatchApiAction('getNilaiAkademik', filters || {}); }
function apiSaveNilaiAkademik(data) { return dispatchApiAction('saveNilaiAkademik', data); }
function apiDeleteNilaiAkademik(id) { return dispatchApiAction('deleteNilaiAkademik', { id: id }); }

function apiGetNilaiKepemimpinan(filters) { return dispatchApiAction('getNilaiKepemimpinan', filters || {}); }
function apiSaveNilaiKepemimpinan(data) { return dispatchApiAction('saveNilaiKepemimpinan', data); }
function apiDeleteNilaiKepemimpinan(id) { return dispatchApiAction('deleteNilaiKepemimpinan', { id: id }); }

function apiGetNilaiDiniyah(filters) { return dispatchApiAction('getNilaiDiniyah', filters || {}); }
function apiSaveNilaiDiniyah(data) { return dispatchApiAction('saveNilaiDiniyah', data); }
function apiDeleteNilaiDiniyah(id) { return dispatchApiAction('deleteNilaiDiniyah', { id: id }); }

function apiGetSantriReport(nis) { return dispatchApiAction('getSantriReport', { nis: nis }); }
