const fs = require('fs');

// MAPEL_LIST_16 order:
// 0: Akidah, 1: Akhlak, 2: Hadits, 3: Fikih, 4: SKI, 5: Pendidikan Pancasila,
// 6: Bahasa Indonesia, 7: Bahasa Inggris, 8: Matematika, 9: Ilmu Pengetahuan Alam,
// 10: Ilmu Pengetahuan Sosial, 11: Prakarya, 12: Pendidikan Jasmani, Olahraga, dan Kesehatan,
// 13: Bahasa Sunda, 14: Informatika, 15: Bahasa Arab

const fullRekapData = {
  // 1. IX ABU BAKAR (18 Murid)
  ixAbuBakar: [
    { no: 1, nis: '242507001', nama: 'Abdillah Zulqarnain Arrazi', scores: [92, 91, 83, 89, 93, 87, 89, 94, 85, 86, 94, 93, 85, 91, 89, 83], ekskul: ['Sangat Baik', 'Baik', 'Baik'] },
    { no: 2, nis: '242507002', nama: 'Al-Fattah Ibnu Syam', scores: [86, 89, 83, 83, 83, 86, 85, 81, 81, 84, 88, 91, 86, 84, 88, 86], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 3, nis: '242507003', nama: 'Aldenta Dwika Pradipta', scores: [84, 88, 83, 75, 78, 77, 81, 74, 81, 79, 80, 88, 83, 80, 80, 77], ekskul: ['Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 4, nis: '242507005', nama: 'Azka Wafi Athaya', scores: [87, 89, 84, 81, 78, 79, 83, 75, 80, 76, 80, 87, 85, 77, 84, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 5, nis: '242507006', nama: 'Bimasena Nararya Malikul', scores: [83, 88, 80, 85, 80, 84, 90, 91, 83, 80, 83, 88, 88, 80, 86, 77], ekskul: ['Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 6, nis: '242507007', nama: 'Daffa Rahmat Azami', scores: [93, 90, 83, 95, 86, 89, 94, 91, 95, 90, 90, 88, 92, 92, 84, 88], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 7, nis: '242507008', nama: 'Ghaisan Arfa Ravellio', scores: [96, 90, 83, 93, 93, 92, 95, 93, 92, 91, 92, 89, 92, 96, 90, 90], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 8, nis: '242507009', nama: 'Isa Rafif Nailu', scores: [92, 90, 83, 87, 80, 87, 95, 94, 96, 90, 89, 93, 88, 90, 89, 83], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 9, nis: '242507013', nama: 'Lieve Luthfi', scores: [76, 88, 83, 78, 78, 81, 85, 75, 75, 71, 80, 86, 91, 88, 75, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 10, nis: '242507010', nama: 'Lionel Nagazkha Irawan Tobing', scores: [80, 89, 82, 81, 80, 79, 80, 91, 79, 77, 80, 88, 87, 84, 80, 77], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 11, nis: '242507014', nama: 'Mariq Athalla Muniarto', scores: [88, 91, 82, 82, 83, 80, 92, 96, 86, 80, 86, 88, 81, 80, 91, 83], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 12, nis: '242507012', nama: 'MUHAMMAD AL BAIS SAHID ROKHIM', scores: [91, 91, 82, 93, 83, 87, 91, 83, 90, 91, 89, 87, 86, 87, 88, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 13, nis: '242507017', nama: 'Muhammad Azka Naufal Saputra', scores: [95, 91, 86, 99, 97, 90, 95, 98, 96, 97, 95, 91, 93, 94, 93, 97], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 14, nis: '242507018', nama: 'Muhammad Daffa Hafizhsyach Akbar', scores: [84, 89, 81, 86, 83, 82, 89, 93, 80, 76, 82, 89, 83, 79, 86, 77], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 15, nis: '242507022', nama: 'Muhammad Haikal Furqon Asyraf', scores: [91, 89, 83, 84, 78, 86, 82, 75, 81, 78, 80, 87, 91, 84, 85, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 16, nis: '242507015', nama: 'Muhammad Syabil A\'Zawawi Oktaviansyah', scores: [93, 91, 83, 90, 83, 89, 91, 81, 86, 85, 92, 94, 82, 88, 90, 90], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 17, nis: '242507016', nama: 'Quarto Kenzie Prakoso', scores: [93, 89, 82, 82, 80, 85, 89, 92, 85, 83, 89, 89, 84, 88, 88, 79], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 18, nis: '242507025', nama: 'Raka Prasraya Kayana', scores: [85, 89, 84, 87, 80, 82, 88, 75, 84, 83, 85, 88, 89, 89, 83, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] }
  ],

  // 2. IX UMMU SALAMAH (21 Murid)
  ixUmmuSalamah: [
    { no: 1, nis: '242507019', nama: 'Adela Nolly Riyanto', scores: [93, 90, 88, 96, 90, 90, 96, 98, 95, 95, 93, 91, 91, 94, 95, 98], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 2, nis: '242507020', nama: 'Aidah Huriah Mumtazah Sugito', scores: [87, 90, 87, 85, 80, 86, 88, 83, 76, 76, 89, 92, 84, 78, 82, 77], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 3, nis: '242507021', nama: 'Aisyah Daamiyaa Nur Sa\'adah', scores: [86, 89, 87, 85, 78, 86, 86, 80, 76, 76, 87, 94, 86, 82, 83, 78], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 4, nis: '242507004', nama: 'Alika Ramadina Setiawan', scores: [92, 89, 87, 91, 83, 83, 91, 94, 80, 87, 90, 88, 91, 87, 81, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 5, nis: '242507023', nama: 'Alisha Malaika Arifianto', scores: [87, 91, 87, 82, 80, 83, 93, 96, 80, 82, 90, 89, 91, 80, 87, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 6, nis: '242507024', nama: 'Alisha Priyanka Anindita', scores: [87, 89, 87, 90, 86, 84, 92, 98, 94, 86, 90, 91, 91, 90, 88, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 7, nis: '242507026', nama: 'Chalisa Afiyah Abdi', scores: [91, 89, 87, 91, 86, 88, 89, 96, 85, 87, 89, 88, 90, 87, 86, 79], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 8, nis: '242507027', nama: 'Chayyara Aila Janeeta', scores: [88, 90, 88, 90, 88, 83, 83, 94, 90, 88, 90, 92, 91, 94, 87, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 9, nis: '242507028', nama: 'Eshal Calysta', scores: [94, 91, 88, 96, 90, 86, 88, 95, 91, 89, 92, 90, 91, 88, 97, 90], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 10, nis: '242507029', nama: 'Falisha Jasmine Budiman', scores: [91, 91, 87, 93, 96, 86, 92, 96, 94, 90, 92, 89, 90, 97, 94, 88], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 11, nis: '242507030', nama: 'Firli Oktaviani Hernawan', scores: [97, 90, 87, 88, 88, 85, 94, 95, 89, 88, 92, 90, 91, 97, 92, 86], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 12, nis: '242507031', nama: 'Ghaida Alin Nada', scores: [90, 90, 88, 94, 90, 89, 92, 96, 92, 95, 94, 89, 91, 92, 92, 96], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 13, nis: '242507032', nama: 'Jasmine Alia Putri', scores: [89, 90, 87, 90, 83, 83, 90, 91, 86, 91, 89, 89, 91, 97, 95, 80], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 14, nis: '242507011', nama: 'Jasmine Nadiah Wardhani', scores: [75, 85, 85, 71, 78, 76, 77, 94, 77, 80, 80, 88, 85, 76, 85, 77], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 15, nis: '242507033', nama: 'Jiehan Sekar Maheswari', scores: [75, 86, 85, 73, 78, 75, 75, 71, 72, 72, 75, 84, 83, 75, 72, 77], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 16, nis: '242507034', nama: 'Makaila Khanza A', scores: [87, 90, 88, 90, 83, 88, 93, 90, 85, 91, 90, 89, 93, 93, 93, 88], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 17, nis: '242507035', nama: 'Radella Githa Octaviana', scores: [90, 90, 87, 88, 80, 86, 89, 92, 81, 86, 85, 89, 91, 93, 83, 79], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 18, nis: '242507036', nama: 'Rr. Shofia Puteri Nirwani', scores: [92, 91, 87, 93, 86, 86, 88, 92, 93, 89, 92, 88, 92, 93, 90, 96], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 19, nis: '242507037', nama: 'Sarah Zakiyya Shaleh', scores: [89, 91, 87, 94, 90, 85, 91, 92, 95, 92, 93, 89, 91, 91, 91, 88], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 20, nis: '242507043', nama: 'Seyla Alexandra', scores: [87, 90, 88, 82, 80, 83, 84, 90, 81, 84, 85, 88, 90, 92, 91, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 21, nis: '242507038', nama: 'Syazani Putrigiy', scores: [92, 93, 94, 94, 90, 88, 91, 90, 93, 92, 92, 90, 92, 92, 92, 97], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] }
  ],

  // 3. VII AISYAH (26 Murid)
  viiAisyah: [
    { no: 1, nis: '262707026', nama: 'Akifa Naila Karim', scores: [91, 90, 86, 91, 80, 82, 89, 96, 84, 80, 84, 89, 86, 82, 80, 81], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 2, nis: '262707027', nama: 'Aliya Hasna Safira', scores: [96, 91, 86, 94, 98, 91, 94, 99, 98, 97, 94, 90, 89, 90, 95, 90], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 3, nis: '262707028', nama: 'Arinka Nathania Munardjo', scores: [86, 89, 85, 87, 80, 86, 94, 88, 95, 86, 90, 91, 87, 88, 86, 81], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 4, nis: '262707006', nama: 'Askana Sakhi Hendri', scores: [88, 87, 85, 87, 77, 87, 91, 85, 92, 84, 92, 91, 87, 88, 79, 87], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 5, nis: '262707029', nama: 'Camilia Larissa Zahwa', scores: [90, 90, 86, 91, 88, 83, 90, 98, 85, 83, 87, 88, 86, 84, 84, 85], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 6, nis: '262707030', nama: 'Chylla Khansa Azalia Nasution', scores: [92, 88, 86, 88, 90, 89, 95, 98, 86, 81, 92, 91, 87, 85, 85, 82], ekskul: ['Baik', 'Sangat Baik', 'Baik'] },
    { no: 7, nis: '262707031', nama: 'Dafina Aulia Aini', scores: [91, 88, 86, 89, 83, 86, 89, 96, 81, 76, 91, 91, 86, 84, 82, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 8, nis: '262707032', nama: 'Deliesha Adzkia Putri', scores: [91, 87, 87, 92, 88, 89, 94, 98, 93, 92, 95, 92, 87, 92, 90, 83], ekskul: ['Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 9, nis: '262707033', nama: 'Ghadhira Auryn Giovanni', scores: [92, 90, 89, 93, 96, 90, 91, 90, 89, 90, 95, 89, 86, 87, 87, 89], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 10, nis: '262707034', nama: 'Ghassani Zahila', scores: [89, 91, 87, 86, 80, 82, 94, 92, 86, 82, 90, 88, 87, 89, 85, 79], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 11, nis: '262707035', nama: 'Iftinan Nathifa Defi', scores: [87, 90, 87, 88, 86, 82, 88, 86, 89, 80, 85, 90, 86, 80, 84, 85], ekskul: ['Sangat Baik', 'Baik', 'Baik'] },
    { no: 12, nis: '262707036', nama: 'Kanaya Syahla Adhitya', scores: [91, 92, 89, 93, 98, 88, 92, 91, 91, 93, 95, 92, 85, 84, 92, 87], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 13, nis: '262707037', nama: 'Khalila Nadia Rahmadani', scores: [84, 91, 86, 79, 77, 77, 89, 97, 78, 77, 81, 89, 87, 79, 80, 75], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 14, nis: '262707038', nama: 'Mahira Azzahra Satria', scores: [91, 89, 85, 85, 88, 82, 92, 96, 81, 80, 95, 91, 87, 85, 77, 79], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 15, nis: '262707039', nama: 'Maulidia Mahyani Maudy', scores: [89, 88, 84, 84, 83, 81, 84, 81, 77, 76, 80, 90, 85, 79, 78, 83], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 16, nis: '262707040', nama: 'Nadya Melody Putri', scores: [93, 90, 85, 86, 78, 81, 89, 86, 81, 76, 86, 90, 85, 87, 79, 76], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 17, nis: '262707041', nama: 'Najwa Khaira Wilda', scores: [84, 87, 85, 85, 78, 83, 85, 92, 79, 78, 82, 89, 88, 78, 75, 81], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 18, nis: '262707042', nama: 'Puri Az Zahra Hayfa', scores: [77, 90, 86, 81, 78, 78, 79, 84, 75, 75, 79, 85, 84, 76, 75, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 19, nis: '262707043', nama: 'Queen Nadhira Raisya Qisthi', scores: [90, 90, 86, 85, 80, 81, 90, 98, 81, 81, 91, 88, 85, 87, 89, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 20, nis: '262707044', nama: 'Raisha Kanaya Putri', scores: [94, 89, 86, 90, 83, 86, 89, 96, 92, 83, 90, 89, 85, 87, 88, 83], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 21, nis: '262707045', nama: 'Raisyah Amalia', scores: [85, 88, 85, 88, 78, 78, 89, 91, 85, 77, 87, 89, 85, 86, 77, 77], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 22, nis: '262707047', nama: 'Sakhia Tsabita Al Khanza', scores: [96, 91, 84, 90, 83, 89, 91, 97, 80, 87, 92, 90, 87, 89, 89, 88], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 23, nis: '262707048', nama: 'Sharlynn Tanzeela Audreana', scores: [94, 89, 90, 90, 97, 87, 89, 93, 91, 85, 85, 90, 87, 83, 86, 88], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 24, nis: '262707049', nama: 'Syaqila Aprilia Putri', scores: [85, 91, 84, 87, 90, 88, 91, 95, 80, 83, 90, 87, 85, 80, 79, 88], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 25, nis: '262707050', nama: 'Tricel Angelia Indradi', scores: [87, 85, 86, 85, 77, 82, 86, 77, 82, 78, 81, 89, 85, 78, 75, 88], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 26, nis: '262707051', nama: 'Yumna Laila Faizah', scores: [88, 91, 85, 83, 86, 80, 90, 96, 86, 86, 88, 91, 85, 84, 89, 81], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] }
  ],

  // 4. VII UTSMAN (25 Murid)
  viiUtsman: [
    { no: 1, nis: '262707001', nama: 'Aezar El Khazindar Walidain', scores: [93, 91, 86, 91, 88, 88, 91, 84, 89, 91, 87, 88, 86, 89, 84, 89], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 2, nis: '262707025', nama: 'Agatha Pratama', scores: [95, 91, 86, 93, 93, 81, 88, 80, 80, 81, 89, 88, 86, 83, 84, 86], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 3, nis: '262707002', nama: 'Ahsan Fadhilah', scores: [85, 89, 87, 85, 78, 75, 81, 78, 84, 80, 83, 89, 83, 84, 83, 76], ekskul: ['Baik', 'Sangat Baik', 'Baik'] },
    { no: 4, nis: '262707004', nama: 'Alfarizi Maulana', scores: [85, 90, 87, 81, 78, 79, 82, 85, 82, 78, 87, 86, 85, 83, 79, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 5, nis: '262707005', nama: 'Al-Zidan Alair Permana', scores: [79, 89, 87, 79, 78, 76, 86, 85, 76, 75, 87, 86, 83, 82, 77, 75], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 6, nis: '262707007', nama: 'Azriel Putra Natafa', scores: [90, 92, 87, 89, 86, 86, 85, 87, 87, 78, 85, 87, 86, 85, 87, 84], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 7, nis: '262707008', nama: 'Bastian Arif Abdillah', scores: [87, 89, 87, 88, 78, 83, 84, 83, 92, 85, 89, 86, 86, 80, 83, 78], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 8, nis: '262707009', nama: 'Fathan Atharsyah Athalla', scores: [86, 92, 87, 89, 90, 77, 84, 88, 89, 86, 87, 88, 85, 84, 88, 88], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 9, nis: '262707071', nama: 'Fatih Abdillah Kurniyawan', scores: [87, 91, 87, 89, 80, 80, 88, 93, 84, 78, 88, 86, 91, 88, 81, 83], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 10, nis: '262707010', nama: 'Gibran Harunsyaka Ubaidillah', scores: [85, 90, 87, 84, 90, 83, 88, 93, 96, 88, 91, 90, 84, 85, 89, 89], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 11, nis: '262707011', nama: 'Hafizh Kurnia Styawan', scores: [90, 90, 87, 91, 80, 86, 86, 76, 81, 78, 84, 85, 88, 86, 81, 79], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 12, nis: '262707012', nama: 'Ibrahim Al Aqsa Shaleh', scores: [80, 88, 87, 79, 77, 77, 84, 85, 76, 76, 81, 89, 84, 82, 76, 76], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 13, nis: '262707024', nama: 'Keano Aquilla Sakha Respati', scores: [87, 92, 87, 89, 77, 75, 84, 76, 90, 87, 90, 89, 84, 86, 81, 77], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 14, nis: '262707013', nama: 'Levi Razan Putra Permadi', scores: [86, 89, 87, 88, 79, 78, 82, 83, 80, 77, 82, 87, 86, 84, 80, 85], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 15, nis: '262707020', nama: 'M. Zafran Yudha Alfaridzi', scores: [88, 92, 87, 87, 83, 80, 88, 81, 97, 90, 90, 88, 87, 84, 82, 83], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 16, nis: '262707016', nama: 'Muchamad Wildan Maulana', scores: [84, 90, 87, 86, 77, 76, 81, 75, 77, 75, 79, 87, 83, 79, 76, 76], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 17, nis: '262707017', nama: 'Mufti Anwar Falah', scores: [88, 91, 87, 90, 90, 78, 83, 79, 75, 75, 83, 86, 83, 82, 77, 81], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 18, nis: '262707003', nama: 'Muhammad Ahza Habibi', scores: [91, 90, 87, 89, 78, 76, 84, 91, 93, 75, 86, 85, 83, 82, 78, 82], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 19, nis: '262707018', nama: 'Muhammad Arkhan Al Raziq', scores: [88, 91, 87, 89, 80, 83, 87, 98, 86, 83, 90, 89, 84, 84, 89, 87], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 20, nis: '262707019', nama: 'Muhammad Azka Kamil Hermawan', scores: [93, 91, 87, 94, 86, 82, 86, 82, 92, 80, 91, 90, 87, 84, 85, 87], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 21, nis: '262707014', nama: 'Muhammad Daniel Atharizz Calief', scores: [90, 90, 87, 87, 98, 80, 85, 81, 84, 86, 92, 91, 86, 83, 90, 79], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 22, nis: '262707015', nama: 'Muhammad Yusril Al-Fatih', scores: [89, 90, 87, 87, 80, 83, 86, 93, 86, 86, 90, 92, 85, 83, 88, 83], ekskul: ['Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 23, nis: '262707021', nama: 'Noufal Khairil Hanif', scores: [92, 92, 87, 86, 85, 84, 86, 80, 84, 78, 86, 91, 85, 89, 84, 86], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 24, nis: '262707022', nama: 'Rafiazka Insan Abdullah', scores: [89, 93, 87, 84, 80, 79, 86, 97, 85, 85, 89, 89, 84, 83, 80, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 25, nis: '262707023', nama: 'Zafran Ali Yudityo Ramadhan', scores: [84, 91, 87, 84, 88, 88, 89, 86, 86, 88, 89, 89, 85, 82, 85, 84], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] }
  ],

  // 5. VIII KHODIJAH (18 Murid)
  viiiKhodijah: [
    { no: 1, nis: '252607002', nama: 'Ajeng Putri Kirana', scores: [89, 91, 90, 87, 78, 88, 83, 89, 76, 83, 89, 88, 89, 88, 82, 83], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 2, nis: '252607003', nama: 'Allysha Qiana Zetta', scores: [89, 92, 91, 92, 96, 91, 90, 99, 87, 90, 93, 89, 91, 92, 91, 88], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 3, nis: '252607004', nama: 'Alzena Aila Varisha', scores: [94, 90, 91, 91, 80, 89, 86, 96, 85, 89, 92, 89, 89, 86, 88, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 4, nis: '252607006', nama: 'Annisa Shazia Athifah', scores: [91, 93, 92, 94, 97, 92, 92, 99, 97, 91, 92, 92, 92, 92, 92, 93], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 5, nis: '252607007', nama: 'Dean Sectio Ranya Ariyadi', scores: [90, 93, 93, 94, 96, 93, 90, 93, 97, 95, 94, 90, 91, 92, 89, 98], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 6, nis: '252607008', nama: 'Evelyn Kenivael', scores: [92, 91, 91, 90, 80, 91, 86, 92, 85, 88, 89, 91, 92, 91, 82, 88], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 7, nis: '252607045', nama: 'Garjita Galuh Gunawan', scores: [88, 88, 91, 92, 88, 89, 87, 96, 84, 84, 89, 89, 88, 85, 85, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 8, nis: '252607009', nama: 'Griseldis Radhiya Nur Hazrina', scores: [89, 91, 94, 95, 98, 93, 86, 94, 95, 93, 92, 93, 89, 89, 91, 98], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 9, nis: '252607010', nama: 'Gyzell Prianatasya Putri', scores: [86, 88, 90, 90, 88, 86, 84, 96, 90, 80, 90, 92, 92, 85, 90, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 10, nis: '252607011', nama: 'Kamila Putri Budiman', scores: [89, 92, 93, 89, 98, 92, 91, 98, 94, 96, 93, 93, 91, 93, 90, 98], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 11, nis: '252607013', nama: 'Malika Anindya Adeeva', scores: [84, 89, 89, 85, 80, 85, 84, 92, 80, 80, 89, 90, 87, 90, 84, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 12, nis: '252607016', nama: 'Naylana Khayra Dzahin', scores: [94, 93, 94, 88, 98, 90, 91, 98, 91, 94, 93, 91, 92, 90, 85, 98], ekskul: ['Baik', 'Sangat Baik', 'Baik'] },
    { no: 13, nis: '252607017', nama: 'Rheva Agnezia Putri', scores: [82, 88, 88, 89, 90, 86, 87, 95, 91, 84, 89, 95, 81, 82, 90, 88], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 14, nis: '252607018', nama: 'Sarah Salsabila', scores: [85, 85, 88, 84, 78, 81, 77, 100, 82, 82, 84, 88, 83, 80, 90, 77], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 15, nis: '252607039', nama: 'Shazia Keizaluna Humaira', scores: [93, 92, 92, 91, 88, 88, 91, 99, 87, 88, 92, 93, 91, 89, 92, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 16, nis: '252607043', nama: 'Syafikah Ghalin Alzena', scores: [89, 89, 90, 89, 78, 79, 80, 79, 80, 82, 86, 88, 86, 76, 91, 80], ekskul: ['Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 17, nis: '252607020', nama: 'Talita Lubna Humaira Renleuw', scores: [95, 90, 93, 93, 98, 93, 90, 98, 91, 93, 92, 92, 94, 92, 93, 98], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 18, nis: '252607040', nama: 'Zahira Sarifah Salsabila', scores: [94, 91, 94, 94, 98, 92, 89, 91, 89, 95, 93, 91, 91, 94, 89, 96], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] }
  ],

  // 6. VIII UMAR (15 Murid)
  viiiUmar: [
    { no: 1, nis: '252607038', nama: 'Achmed Syathir Elhayba', scores: [87, 87, 84, 91, 88, 88, 85, 83, 77, 80, 90, 87, 86, 85, 79, 86], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 2, nis: '252607022', nama: 'Ali Zatrio Ikhwantoro', scores: [87, 88, 84, 87, 80, 87, 88, 92, 89, 84, 87, 87, 86, 85, 94, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 3, nis: '252607023', nama: 'Arsa Ardhani Putra Permadi', scores: [89, 88, 84, 90, 80, 88, 85, 92, 85, 81, 90, 91, 88, 88, 85, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 4, nis: '252607025', nama: 'Gerald Lazzaro Nggebu', scores: [80, 90, 84, 79, 78, 77, 83, 87, 75, 75, 79, 88, 86, 80, 82, 78], ekskul: ['Baik', 'Baik', 'Baik'] },
    { no: 5, nis: '252607026', nama: 'Hasan Muzakki', scores: [89, 90, 85, 88, 93, 90, 89, 90, 95, 91, 94, 92, 90, 85, 87, 86], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 6, nis: '252607027', nama: 'Ibrahim Fadhilah Syuja Tambunan', scores: [82, 89, 84, 81, 78, 85, 91, 88, 76, 77, 89, 87, 89, 83, 87, 77], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 7, nis: '252607012', nama: 'Kanaka Arkhan Gaizan', scores: [87, 89, 84, 91, 80, 90, 84, 88, 85, 80, 89, 86, 85, 85, 85, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 8, nis: '252607028', nama: 'Muhamad Fathan Gunawan', scores: [85, 89, 84, 87, 80, 87, 85, 84, 77, 82, 89, 90, 86, 85, 89, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 9, nis: '252607029', nama: 'Muhammad Aydin Arkananta', scores: [88, 90, 84, 87, 80, 89, 87, 83, 78, 80, 85, 89, 88, 85, 84, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 10, nis: '252607030', nama: 'Muhammad Billal Amilusa', scores: [93, 87, 84, 93, 78, 92, 88, 94, 82, 83, 93, 89, 88, 82, 90, 77], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 11, nis: '252607031', nama: 'Nauval Agha Irawan', scores: [91, 90, 85, 95, 96, 92, 88, 81, 88, 86, 90, 90, 90, 90, 84, 88], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 12, nis: '252607032', nama: 'Rafkantara Arifianto', scores: [93, 89, 85, 93, 90, 91, 93, 91, 84, 91, 94, 89, 91, 90, 85, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Baik'] },
    { no: 13, nis: '252607033', nama: 'Ryan Aditya Herlambang Sugema', scores: [84, 89, 84, 90, 80, 83, 85, 87, 79, 79, 84, 93, 89, 90, 82, 78], ekskul: ['Sangat Baik', 'Baik', 'Sangat Baik'] },
    { no: 14, nis: '252607034', nama: 'Teuku Muhammad Zulkarnain', scores: [84, 89, 84, 87, 80, 78, 87, 88, 76, 80, 82, 89, 88, 85, 84, 78], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] },
    { no: 15, nis: '252607036', nama: 'Zamzam Alif', scores: [95, 89, 84, 96, 83, 86, 85, 93, 86, 84, 90, 86, 85, 81, 82, 80], ekskul: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik'] }
  ]
};

const mapelNames = [
  'Akidah', 'Akhlak', 'Hadits', 'Fikih', 'SKI', 'Pendidikan Pancasila',
  'Bahasa Indonesia', 'Bahasa Inggris', 'Matematika', 'Ilmu Pengetahuan Alam',
  'Ilmu Pengetahuan Sosial', 'Prakarya', 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
  'Bahasa Sunda', 'Informatika', 'Bahasa Arab'
];

const mapelKeys = [
  'akidah', 'akhlak', 'hadits', 'fikih', 'ski', 'ppkn',
  'b_indo', 'inggris', 'mtk', 'ipa', 'ips', 'prakarya',
  'pjok', 'b_sunda', 'tik', 'b_arab'
];

module.exports = { fullRekapData, mapelNames, mapelKeys };
console.log('fullRekapData compiled successfully with 123 students and 16 subjects!');
