# Monitoring Proposal Skripsi - KK E (Ilmu Komputer)

Dashboard web sederhana untuk memantau pengajuan topik dan judul proposal skripsi mahasiswa di lingkungan Kelompok Keahlian (KK) E - Ilmu Komputer, Universitas Komputer Indonesia.

Website ini mengambil data secara **real-time** dari Google Spreadsheet hasil input Google Form mahasiswa.

## 🌐 Demo Aplikasi

Akses website monitoring secara online melalui tautan berikut:

### [👉 Buka Website Monitoring](https://galih-hermawan-unikom.github.io/monitoring-proksi/)

---

## ✨ Fitur Utama

*   **Real-time Data:** Terhubung langsung dengan Google Sheets; data otomatis terupdate setiap kali halaman dimuat.
*   **Pencarian Cepat:** Filter data berdasarkan Nama, NIM, atau Kata Kunci Judul.
*   **Filter Pembimbing:** Menyaring daftar proposal berdasarkan Dosen Pembimbing tertentu.
*   **Visualisasi Data:**
    *   Grafik Donat: Distribusi bidang peminatan.
    *   Grafik Batang: Beban bimbingan per dosen.
    *   Grafik Tren Kata Kunci: Analisis topik yang sedang populer.
*   **Export Laporan:**
    *   📄 **PDF:** Laporan ringkas daftar absensi/monitoring (Landscape).
    *   📊 **Excel (.xlsx):** Laporan detail lengkap dengan format rapi.
*   **Responsive Design:** Tampilan nyaman diakses baik melalui Laptop maupun Smartphone.

## 🛠️ Teknologi

Aplikasi ini dibangun menggunakan teknologi web standar tanpa backend (Serverless/Static Site), sehingga sangat ringan dan cepat.

*   **HTML5 & CSS3**
*   **JavaScript (Vanilla)**
*   **Libraries:**
    *   [PapaParse](https://www.papaparse.com/) (CSV Parsing)
    *   [Chart.js](https://www.chartjs.org/) (Data Visualization)
    *   [ExcelJS](https://github.com/exceljs/exceljs) (Excel Export)
    *   [jsPDF & AutoTable](https://github.com/parallax/jsPDF) (PDF Export)

## 👨‍💻 Pengembang

**Galih Hermawan**
*   🌐 Website: [galih.eu](https://galih.eu)
*   🏫 Program Studi Teknik Informatika
*   🎓 Universitas Komputer Indonesia (UNIKOM)
*   📅 Terakhir Diperbarui: November 2025

---
*Dibuat untuk memudahkan pengelolaan dan transparansi data proposal skripsi semester Ganjil TA 2025-2026.*
