# Aplikasi Web Rapor Tengah Semester MBU (MVC Architecture)

Sistem Informasi Manajemen Rapor Tengah Semester Holistik berbasis **Google Apps Script (GAS)** dengan pola **Model-View-Controller (MVC)**, terintegrasi dengan **Google Sheets** sebagai Database Engine, serta siap dideploy ke **GitHub** dan **Vercel**.

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Arsitektur & Pola MVC](#-arsitektur--pola-mvc)
3. [Struktur Direktori Proyek](#-struktur-direktori-proyek)
4. [Skema Database Google Sheets](#-skema-database-google-sheets)
5. [Panduan Instalasi & Deployment](#-panduan-instalasi--deployment)
   - [Metode 1: Google Apps Script Web App via Clasp CLI](#metode-1-deploy-ke-google-apps-script-via-clasp-cli)
   - [Metode 2: Deploy ke GitHub & Vercel](#metode-2-deploy-ke-github--vercel)
   - [Metode 3: Pemasangan Manual di Google Sheets Editor](#metode-3-pemasangan-manual-di-google-sheets-editor)
6. [Panduan Penggunaan Modul CMS & SaaS](#-panduan-penggunaan-modul-cms--saas)

---

## 🌟 Fitur Utama

### 1. Tiga Pilar Dashboard Penilaian Terpadu
1. **Dashboard Akademik**:
   - Pengelolaan nilai mata pelajaran umum: Tugas Harian (bobot 40%), UTS (bobot 60%), Nilai Akhir Otomatis, dan Predikat (A/B/C/D).
   - Filter dinamis berdasarkan kelas (7A, 7B, 8A, 8B, 9A, 9B) dan mata pelajaran.
   - Form input & edit nilai interaktif dengan pratinjau kalkulasi seketika.
2. **Dashboard Kepemimpinan**:
   - Evaluasi aspek Kedisiplinan, Keorganisasian, Karakter & Adab, serta Inisiatif/Kemandirian Santri Asrama.
   - Catatan wali kelas dan pembina karakter.
3. **Dashboard Diniyah & Tahfidz**:
   - Pencatatan target dan capaian hafalan Al-Qur'an baru (**Ziyadah**) serta kelancaran hafalan (**Muroja'ah Mutqin**).
   - Penilaian Adab Harian, Ibadah Harian (Mumtaz, Jayyid Jiddan, Jayyid, Maqbul), dan Bahasa Arab.

### 2. Dashboard CMS & SaaS Multi-Tenant Ready
- **Appearance & Branding**:
  * Penggantian URL Logo Sekolah (Default Logo Al-Imam).
  * Color Picker dinamis untuk mengubah Warna Primer, Sekunder, dan Aksen tema aplikasi secara realtime.
  * Kustomisasi Nama Lembaga, Alamat, Telepon, Situs Web, dan Motto Footer.
- **Manajemen User & Role**:
  * Role Admin/CMS, Guru Akademik, Pembina Kepemimpinan, Pembina Diniyah, dan Santri/Orang Tua.
- **Pengaturan Periode & Tanda Tangan**:
  * Konfigurasi Tahun Ajaran, Semester Aktif (Ganjil/Genap), Titimangsa Rapor, Nama Kepala Sekolah, NIP, serta Tanda Tangan Digital.

### 3. Cetak Rapor Tengah Semester Resmi (Format A4 Bahasa Indonesia)
- Menggabungkan ketiga pilar (Akademik, Kepemimpinan, Diniyah) secara proporsional dalam 1 lembar cetak standar A4 / PDF.
- Dilengkapi Kop Surat resmi sekolah dinamis, tabel nilai rapi bergaris tegas, deskripsi kemajuan belajar, serta 3 kolom tanda tangan (Orang Tua, Wali Kelas/Pembina, dan Kepala Sekolah).

---

## 🏛️ Arsitektur & Pola MVC

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VIEW (HTML/CSS/JS)                             │
│  src/views/Index.html          : Layout wrapper utama                        │
│  src/views/Styles.html         : Tailwind CDN + Variabel Warna CSS CMS      │
│  src/views/Navbar.html         : Header navigasi & switcher role simulasi   │
│  src/views/Sidebar.html        : Menu navigasi modular                      │
│  src/views/DashboardHome.html  : Ringkasan statistik & metrik 3 pilar       │
│  src/views/AkademikView.html   : Tabel & modal nilai akademik               │
│  src/views/KepemimpinanView.html : Tabel & modal nilai kepemimpinan         │
│  src/views/DiniyahView.html    : Tabel & modal tahfidz & diniyah            │
│  src/views/SantriView.html     : Master data santri & kelas                 │
│  src/views/CMSView.html        : Panel konfigurasi branding & user SaaS     │
│  src/views/CetakRapor.html     : Lembar dokumen rapor cetak A4 terpadu      │
│  src/views/Scripts.html        : Client-side state store & AJAX bridge      │
├─────────────────────────────────────────────────────────────────────────────┤
│                              CONTROLLER (Apps Script)                       │
│  src/Code.gs                   : doGet, doPost, include, API Router         │
│  src/AuthService.gs            : Autentikasi user & pengecekan hak akses    │
│  src/RaporService.gs           : Agregator sintesis rapor 3 aspek & metrik  │
├─────────────────────────────────────────────────────────────────────────────┤
│                              MODEL (Google Sheets)                          │
│  src/Database.gs               : ORM CRUD, Auto-Inisialisasi Sheet & Seed   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Struktur Direktori Proyek

```
App Rapor SMP/
├── .clasp.json                 # Konfigurasi Google Apps Script Clasp CLI
├── appsscript.json             # Manifest Apps Script (Timezone Asia/Jakarta, V8)
├── package.json                # Script Clasp & dependencies
├── vercel.json                 # Routing & CORS configuration untuk Vercel
├── .gitignore                  # Git ignore rules
├── README.md                   # Panduan Lengkap Instalasi & Deployment
├── src/
│   ├── Code.gs                 # Controller Utama & Web Server (doGet/doPost/API)
│   ├── Database.gs             # Model Google Sheets (Auto Init & CRUD)
│   ├── AuthService.gs          # Layanan Autentikasi, Role Guard & Session
│   ├── RaporService.gs         # Layanan Agregasi Data Rapor 3 Aspek
│   └── views/
│       ├── Index.html          # Entrypoint Template HTML
│       ├── Styles.html         # CSS Modular, Tailwind & Dynamic Variables
│       ├── Navbar.html         # Navigasi Atas & Role Switcher
│       ├── Sidebar.html        # Menu Samping
│       ├── DashboardHome.html  # Beranda Statistik & Ringkasan Metrik
│       ├── AkademikView.html   # Dashboard & Form Nilai Akademik
│       ├── KepemimpinanView.html # Dashboard & Form Nilai Kepemimpinan
│       ├── DiniyahView.html    # Dashboard & Form Nilai Diniyah/Tahfidz
│       ├── SantriView.html     # Master Data Santri & Rombel
│       ├── CMSView.html        # Konfigurasi CMS, Branding & User SaaS
│       ├── CetakRapor.html     # Template Cetak Rapor Standar A4
│       └── Scripts.html        # Client Controller, AJAX & Dynamic Theme
└── public/
    └── index.html              # Vercel Standalone Client (Dual Deployment)
```

---

## 📊 Skema Database Google Sheets

Sistem memiliki fitur **Auto-Migration & Seeding** otomatis saat pertama kali dijalankan atau saat tombol *Sinkron / Reset Data Awal* ditekan.

1. **`Settings_CMS`**:
   - Kolom: `key`, `value`, `category`, `description`
   - Menyimpan logo sekolah, warna tema, nama sekolah, kontak, semester aktif, titimangsa rapor, dan data kepala sekolah.
2. **`Users`**:
   - Kolom: `id`, `username`, `password_hash`, `nama_lengkap`, `role`, `status`, `created_at`
   - Role yang didukung: `admin`, `guru_akademik`, `pembina_kepemimpinan`, `pembina_diniyah`, `santri`.
3. **`Santri`**:
   - Kolom: `nis`, `nisn`, `nama_santri`, `kelas`, `jenis_kelamin`, `nama_wali`, `kontak_wali`, `status`
4. **`Nilai_Akademik`**:
   - Kolom: `id`, `nis`, `semester`, `tahun_ajaran`, `mata_pelajaran`, `nilai_tugas`, `nilai_uts`, `nilai_akhir`, `predikat`, `catatan_guru`
5. **`Nilai_Kepemimpinan`**:
   - Kolom: `id`, `nis`, `semester`, `tahun_ajaran`, `kedisiplinan`, `organisasi`, `karakter_adab`, `inisiatif_kemandirian`, `catatan_pembina`
6. **`Nilai_Diniyah`**:
   - Kolom: `id`, `nis`, `semester`, `tahun_ajaran`, `ziyadah_juz`, `murojaah_juz`, `nilai_tahfidz`, `adab_harian`, `ibadah_harian`, `bahasa_arab`, `catatan_musyrif`

---

## 🚀 Panduan Instalasi & Deployment

### Metode 1: Deploy ke Google Apps Script via Clasp CLI

1. **Pastikan Node.js dan Clasp terinstal**:
   ```bash
   npm install -g @google/clasp
   ```
2. **Login ke Akun Google**:
   ```bash
   clasp login
   ```
3. **Hubungkan Script ID Google Apps Script**:
   - Buka Google Sheets Anda -> Klik **Ekstensi** -> **Apps Script**.
   - Buka **Project Settings** (ikon gerigi) -> Salin **Script ID**.
   - Buka file `.clasp.json` dan ganti `YOUR_APPS_SCRIPT_PROJECT_ID_HERE` dengan Script ID Anda.
4. **Push Kode ke Google Apps Script**:
   ```bash
   npm run push
   # atau clasp push
   ```
5. **Deploy Web App**:
   - Di Google Apps Script Editor -> Klik **Deploy** -> **New Deployment**.
   - Pilih tipe **Web App**.
   - Set *Execute as*: **Me (akun Anda)**.
   - Set *Who has access*: **Anyone**.
   - Klik **Deploy** dan salin URL Web App yang dihasilkan.

---

### Metode 2: Deploy ke GitHub & Vercel

Aplikasi ini dilengkapi konfigurasi `vercel.json` dan client statis di folder `public/`.

1. **Inisialisasi Git & Push ke GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: complete mvc rapor mbu gas app"
   git remote add origin https://github.com/USERNAME/app-rapor-smp.git
   git branch -M main
   git push -u origin main
   ```
2. **Import ke Vercel**:
   - Masuk ke [vercel.com](https://vercel.com) dan hubungkan akun GitHub Anda.
   - Pilih repositori `app-rapor-smp`.
   - Vercel akan secara otomatis mendeteksi konfigurasi `vercel.json` dan folder `public/`.
   - Klik **Deploy**.
3. **Hubungkan Vercel Client ke Google Apps Script**:
   - Buka website Vercel yang sudah live.
   - Klik tombol **Set Apps Script URL** di navbar.
   - Masukkan URL Web App Google Apps Script Anda (akhiran `/exec`).
   - Selesai! Frontend di Vercel sekarang terhubung langsung ke Google Sheets Database Anda.

---

### Metode 3: Pemasangan Manual di Google Sheets Editor

Jika tidak menggunakan Clasp/CLI:
1. Buat Google Spreadsheet baru di Google Drive.
2. Klik menu **Ekstensi** -> **Apps Script**.
3. Buat file script (`.gs`):
   - `Code.gs` -> salin isi dari [src/Code.gs](file:///Users/faikbajsair/Downloads/App%20Rapor%20SMP/src/Code.gs)
   - `Database.gs` -> salin isi dari [src/Database.gs](file:///Users/faikbajsair/Downloads/App%20Rapor%20SMP/src/Database.gs)
   - `AuthService.gs` -> salin isi dari [src/AuthService.gs](file:///Users/faikbajsair/Downloads/App%20Rapor%20SMP/src/AuthService.gs)
   - `RaporService.gs` -> salin isi dari [src/RaporService.gs](file:///Users/faikbajsair/Downloads/App%20Rapor%20SMP/src/RaporService.gs)
4. Buat file HTML (`.html`) di dalam editor Apps Script:
   - Buat file `views/Index.html`, `views/Styles.html`, `views/Navbar.html`, `views/Sidebar.html`, `views/DashboardHome.html`, `views/AkademikView.html`, `views/KepemimpinanView.html`, `views/DiniyahView.html`, `views/SantriView.html`, `views/CMSView.html`, `views/CetakRapor.html`, `views/Scripts.html`.
5. Jalankan fungsi `initDatabase()` di dropdown fungsi untuk membuat seluruh sheet dan data demo pertama kali.
6. Klik **Deploy** -> **New Deployment** -> Tipe **Web App**.

---

## ⚙️ Panduan Penggunaan Modul CMS & SaaS

1. **Kustomisasi Logo & Warna**:
   - Masuk ke menu **Pengaturan CMS & SaaS** -> Tab **Tampilan & Branding**.
   - Ubah URL Logo atau klik tombol *Default Al-Imam* untuk menggunakan logo resmi.
   - Klik color picker untuk memilih warna identitas lembaga (misal: Hijau Emerald, Biru Navy, dsb). Warna aplikasi akan berubah seketika.
2. **Penetapan Periode & Tanda Tangan**:
   - Tab **Semester & TTD Rapor**: Tentukan Tahun Ajaran (misal `2025/2026`), Semester aktif, Tanggal pembagian rapor, Nama Kepala Sekolah, dan NIP.
3. **Mencetak Rapor**:
   - Buka menu **Cetak Rapor Terpadu** atau klik tombol cetak pada data santri.
   - Pilih nama santri pada dropdown.
   - Klik **Cetak / Simpan PDF** atau gunakan pintasan keyboard `Ctrl+P` / `Cmd+P` untuk mencetak atau menyimpan dokumen PDF berformat A4.

---

*Dikembangkan untuk SMP Al-Imam Islamic School (AI IS) - Development by Al-Imam EduTech*
