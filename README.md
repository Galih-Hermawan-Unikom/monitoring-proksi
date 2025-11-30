# Monitoring Proposal Skripsi - KK E (Ilmu Komputer)

Dashboard web sederhana untuk memantau pengajuan topik dan judul proposal skripsi mahasiswa di lingkungan Kelompok Keahlian (KK) E - Ilmu Komputer, Prodi Teknik Informatika, Universitas Komputer Indonesia.

Website ini mengambil data secara **real-time** dari Google Spreadsheet hasil input Google Form mahasiswa.

## 🌐 Demo Aplikasi

Akses website monitoring secara online melalui tautan berikut:

### [👉 Buka Website Monitoring](https://galih-hermawan-unikom.github.io/monitoring-proksi/)

---

## 📊 Infografis Sistem

### Dashboard
![Dashboard](Monitoring%20Proksi%20-%20Dashboard.png)

### Deteksi Kemiripan TF-IDF
![TF-IDF Similarity](Monitoring%20Proksi%20-%20TF%20IDF%20Similarity.png)

### Semantic Similarity (AI)
![Semantic Similarity](Monitoring%20Proksi%20-%20Semantic%20Similarity.png)

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

**Text Preprocessing:**
- 📚 **Stopwords dari CDN** - ~1400 kata (Indonesian + English) dari [stopwords-iso](https://github.com/stopwords-iso)
- 🔤 **Domain Stopwords** - Kata umum skripsi (sistem, aplikasi, metode, dll)
- ✂️ **Conservative Stemming** - Indonesian (prefix/suffix) + English dengan protected words
- 🛡️ **Invalid Stems Blocklist** - Mencegah hasil stem yang salah

**Fitur:**
- ⚡ Sangat cepat (instan)
- 🌐 Tidak butuh koneksi API eksternal
- 💻 Sepenuhnya berjalan di browser
- 🔍 Pencarian berdasarkan NIM/Nama
- 🏷️ Kata kunci yang sama (dari judul)

**Akses:** [similarity.html](https://galih-hermawan-unikom.github.io/monitoring-proksi/similarity.html)

---

### 2. Semantic Similarity dengan AI (`semantic_similarity.html`)

Analisis kemiripan berbasis **makna dan konteks** menggunakan model AI Sentence Transformers.

**Arsitektur:**
```
Browser → HF Space (AI + Proxy) → Supabase (Cache Database)
```

**Model:** `paraphrase-multilingual-MiniLM-L12-v2` (384 dimensi, multilingual)

**Komponen:**
| Komponen | Fungsi |
|----------|--------|
| GitHub Pages | Hosting website |
| Google Sheets | Sumber data proposal |
| HF Space | AI model + API proxy |
| Supabase | Shared cache database |
| GitHub Actions | Keep-alive ping (14 menit) |

**Kelebihan:**
- 🧠 Memahami makna, bukan hanya kata
- 🌍 Mendukung Bahasa Indonesia
- 💾 Shared cache (Supabase) - user berikutnya lebih cepat
- 🔒 API key aman di server (tidak terekspos ke browser)
- 🔄 Keep-alive otomatis via GitHub Actions
- 💰 100% Gratis (semua layanan free tier)

**Cara Kerja:**
1. Data proposal diambil dari Google Sheets
2. Cek cache di Supabase (via HF Space proxy)
3. Jika tidak ada, generate embedding via AI model
4. Simpan ke Supabase untuk user berikutnya
5. Hitung Cosine Similarity di browser
6. Tampilkan hasil dengan detail per komponen

**Waktu Proses:**
| Skenario | Waktu |
|----------|-------|
| User pertama (cold start) | ~2-3 menit |
| User berikutnya (warm + cache) | ~5 detik |

**Akses:** [semantic_similarity.html](https://galih-hermawan-unikom.github.io/monitoring-proksi/semantic_similarity.html)

---

### Perbandingan Kedua Metode

| Aspek | TF-IDF | Semantic (AI) |
|-------|--------|---------------|
| **Akurasi** | ⭐⭐⭐ Berbasis kata + stemming | ⭐⭐⭐⭐ Berbasis makna |
| **Kecepatan** | ⚡ Instan | 🕐 10-30 detik |
| **Koneksi Internet** | Hanya untuk stopwords CDN | Diperlukan |
| **Sinonim** | ⚠️ Terbatas (via stemming) | ✅ Terdeteksi |
| **Konteks** | ❌ Tidak dipahami | ✅ Dipahami |
| **Pencarian** | ✅ NIM/Nama | ✅ NIM/Nama |

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
├── config.js                  # Konfigurasi HF Space URL
├── embedding-service.js       # Service untuk embedding API
├── KK E.xlsx - ....csv        # Data master mahasiswa
├── README.md                  # Dokumentasi
├── .github/workflows/
│   └── keep-alive.yml         # GitHub Actions keep-alive
└── Monitoring Proksi - *.png  # Infografis sistem
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
*   **API & Services:**
    *   [Hugging Face Space](https://huggingface.co/spaces/galihboy/semantic-embedding-api) (AI Embedding API)
    *   [Supabase](https://supabase.com/) (PostgreSQL Cache Database)
    *   [GitHub Actions](https://github.com/features/actions) (Keep-alive Scheduler)

---

## 👨‍💻 Pengembang

**Galih Hermawan**
*   🌐 Website: [galih.eu](https://galih.eu)
*   🏫 Program Studi Teknik Informatika
*   🎓 Universitas Komputer Indonesia (UNIKOM)
*   📅 Terakhir Diperbarui: 30 November 2025

---
*Dibuat untuk memudahkan pengelolaan dan transparansi data proposal skripsi semester Ganjil TA 2025-2026.*