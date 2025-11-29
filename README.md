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
*   **Monitoring Keterisian:** Menggabungkan data Google Sheets (yang sudah submit) dengan file CSV lokal master mahasiswa untuk menampilkan daftar siapa saja yang belum submit, lengkap dengan pencarian, pagination, dan grafik distribusi per pembimbing.
*   **Export Laporan:**
    *   📄 **PDF:** Laporan ringkas daftar absensi/monitoring (Landscape).
    *   📊 **Excel (.xlsx):** Laporan detail lengkap dengan format rapi.
*   **Responsive Design:** Tampilan nyaman diakses baik melalui Laptop maupun Smartphone.

---

## 🔍 Fitur Deteksi Kemiripan Tema

Fitur baru untuk mendeteksi kemiripan antar proposal skripsi, membantu dosen mengidentifikasi tema yang mirip atau berpotensi duplikasi.

### 1. Deteksi Kemiripan TF-IDF (`similarity.html`)

Analisis kemiripan berbasis **frekuensi kata** menggunakan metode TF-IDF (Term Frequency-Inverse Document Frequency).

| Komponen | Bobot |
|----------|-------|
| Judul/Tema | 30% |
| Deskripsi Singkat | 30% |
| Problem Statement | 25% |
| Metode/Pendekatan | 15% |

**Kelebihan:**
- ⚡ Sangat cepat (instan)
- 🌐 Tidak butuh koneksi API
- 💻 Sepenuhnya berjalan di browser

**Akses:** `http://localhost:8000/similarity.html`

---

### 2. Semantic Similarity dengan AI (`semantic_similarity.html`)

Analisis kemiripan berbasis **makna dan konteks** menggunakan model AI Sentence Transformers dari Hugging Face.

**Model:** `paraphrase-multilingual-MiniLM-L12-v2`

**Kelebihan:**
- 🧠 Memahami makna, bukan hanya kata
- 🌍 Mendukung Bahasa Indonesia
- 💾 Smart caching (menyimpan hasil di localStorage)
- 🔄 Otomatis mendeteksi perubahan data

**Cara Kerja:**
1. Data proposal diambil dari Google Sheets
2. Setiap proposal dikonversi menjadi vektor embedding via Hugging Face API
3. Kemiripan dihitung dengan Cosine Similarity
4. Hasil di-cache untuk kunjungan berikutnya (expire 7 hari)

**Catatan:**
- Membutuhkan koneksi internet untuk API
- Loading pertama ~10-30 detik (tergantung jumlah data)
- Kunjungan berikutnya lebih cepat (menggunakan cache)

**Akses:** `http://localhost:8000/semantic_similarity.html`

---

### Perbandingan Kedua Metode

| Aspek | TF-IDF | Semantic (AI) |
|-------|--------|---------------|
| **Akurasi** | ⭐⭐ Berbasis kata | ⭐⭐⭐⭐ Berbasis makna |
| **Kecepatan** | ⚡ Instan | 🕐 10-30 detik |
| **Koneksi Internet** | Tidak perlu | Diperlukan |
| **Sinonim** | ❌ Tidak terdeteksi | ✅ Terdeteksi |
| **Konteks** | ❌ Tidak dipahami | ✅ Dipahami |

**Rekomendasi:**
- Gunakan **TF-IDF** untuk pengecekan cepat
- Gunakan **Semantic** untuk analisis mendalam dan akurat

---

## 💾 Mode Offline & Data Master

1. Simpan file `KK E.xlsx - Mahasiswa Skripsi -TGL-02-10-20.csv` di direktori yang sama dengan `index.html`.
2. Jalankan server lokal agar browser mengizinkan pembacaan file (contoh: `python -m http.server 8000`).
3. Akses `http://localhost:8000` melalui peramban; dashboard akan memuat data Google Sheets dan langsung membandingkannya dengan CSV lokal untuk menampilkan daftar mahasiswa yang belum submit.

> Catatan: Jika file CSV tidak ditemukan, bagian monitoring "Belum Submit" akan menampilkan pesan bahwa data master belum tersedia.

---

## 📁 Struktur File

```
data-proksi/
├── index.html                 # Dashboard utama
├── similarity.html            # Deteksi kemiripan (TF-IDF)
├── semantic_similarity.html   # Deteksi kemiripan (AI/Semantic)
├── KK E.xlsx - ....csv        # Data master mahasiswa
├── README.md                  # Dokumentasi
└── favicon.ico                # Icon website
```

---

## 🛠️ Teknologi

Aplikasi ini dibangun menggunakan teknologi web standar tanpa backend (Serverless/Static Site), sehingga sangat ringan dan cepat.

*   **HTML5 & CSS3**
*   **JavaScript (Vanilla)**
*   **Libraries:**
    *   [PapaParse](https://www.papaparse.com/) (CSV Parsing)
    *   [Chart.js](https://www.chartjs.org/) (Data Visualization)
    *   [ExcelJS](https://github.com/exceljs/exceljs) (Excel Export)
    *   [jsPDF & AutoTable](https://github.com/parallax/jsPDF) (PDF Export)
*   **API:**
    *   [Hugging Face Inference API](https://huggingface.co/inference-api) (Semantic Similarity)

---

## 👨‍💻 Pengembang

**Galih Hermawan**
*   🌐 Website: [galih.eu](https://galih.eu)
*   🏫 Program Studi Teknik Informatika
*   🎓 Universitas Komputer Indonesia (UNIKOM)
*   📅 Terakhir Diperbarui: November 2025

---
*Dibuat untuk memudahkan pengelolaan dan transparansi data proposal skripsi semester Ganjil TA 2025-2026.*