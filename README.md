# Monitoring Proposal Skripsi - KK E (Ilmu Komputer)

Dashboard web sederhana untuk memantau pengajuan topik dan judul proposal skripsi mahasiswa di lingkungan Kelompok Keahlian (KK) E - Ilmu Komputer, Prodi Teknik Informatika, Universitas Komputer Indonesia.

Website ini mengambil data secara **real-time** dari Google Spreadsheet hasil input Google Form mahasiswa.

---

## 🖥️ Arsitektur Sistem

![Arsitektur Sistem](Monitoring%20Proksi%20-%20Arsitektur%20Sistem%20v2.png)

---

## 🌐 Demo Aplikasi

### Dashboard Utama

![Dashboard](Monitoring%20Proksi%20-%20Dashboard.png)

### TF-IDF Similarity

![TF-IDF Similarity](Monitoring%20Proksi%20-%20TF%20IDF%20Similarity.png)

### Semantic Similarity (AI)

![Semantic Similarity](Monitoring%20Proksi%20-%20Semantic%20Similarity.png)

### LLM Analysis (Gemini)

![Analisis LLM](Monitoring Proksi - LLM Batch.png)

> Halaman baru untuk analisis dengan Google Gemini:
>
> - `llm_similarity.html` - Analisis manual (pilih 2 proposal)
> - `llm_batch.html` - Analisis batch otomatis (semua pairs ≥ threshold)

---

## ✨ Fitur Utama

- **Real-time Data:** Terhubung langsung dengan Google Sheets; data otomatis terupdate setiap kali halaman dimuat.
- **Pencarian Cepat:** Filter data berdasarkan Nama, NIM, atau Kata Kunci Judul.
- **Filter Pembimbing:** Menyaring daftar proposal berdasarkan Dosen Pembimbing tertentu.
- **Visualisasi Data:**
  - Grafik Donat: Distribusi bidang peminatan.
  - Grafik Batang: Beban bimbingan per dosen.
  - Grafik Tren Kata Kunci: Analisis topik yang sedang populer.
- **Monitoring Keterisian:** Menggabungkan data Google Sheets (yang sudah submit) dengan file CSV lokal master mahasiswa untuk menampilkan daftar siapa saja yang belum submit, lengkap dengan pencarian, pagination, dan grafik distribusi per pembimbing.
- **Export Laporan:**
  - 📄 **PDF:** Laporan ringkas daftar absensi/monitoring (Landscape).
  - 📊 **Excel (.xlsx):** Laporan detail lengkap dengan format rapi.
- **Responsive Design:** Tampilan nyaman diakses baik melalui Laptop maupun Smartphone.

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

### 3. LLM Similarity Analysis (`llm_similarity.html`)

Analisis kemiripan berbasis **reasoning AI** menggunakan Google Gemini untuk memberikan penjelasan seperti penilai manusia.

**Fitur:**

- 🤖 Analisis mendalam dengan penjelasan reasoning
- 📊 Skor kemiripan 0-100 dari perspektif akademik
- 🏷️ Verdict (Keputusan): AMAN, PERLU REVIEW, BERMASALAH
- 💡 Saran konkret untuk mahasiswa
- 🎨 Tema warna Orange (berbeda dari halaman lain)
- 📱 Mobile responsive dengan slot-based selection

**Kriteria Akademik:**

- BERMASALAH: Topik + Dataset + Metode **semua sama**
- AMAN: Salah satu berbeda (replikasi dengan variasi = boleh)

**Akses:** [llm_similarity.html](https://galih-hermawan-unikom.github.io/monitoring-proksi/llm_similarity.html)

---

### 4. LLM Batch Analysis (`llm_batch.html`)

Analisis otomatis untuk **semua pasangan** dengan kemiripan embedding di atas threshold.

**Fitur:**

- ⚙️ Threshold konfigurasi (default 60%)
- 📦 Cache-first approach (cek Supabase dulu)
- 🔄 Progressive rendering (hasil muncul bertahap)
- 📄 Pagination dengan sorting
- 🎯 Filter by verdict + search NIM/Nama
- 📊 Summary cards (AMAN/REVIEW/BERMASALAH)
- 📖 Collapsible cards (auto-expand untuk non-AMAN)
- 📋 Legend/keterangan informatif

**Akses:** [llm_batch.html](https://galih-hermawan-unikom.github.io/monitoring-proksi/llm_batch.html)

---

### Perbandingan Semua Metode

| Aspek | TF-IDF | Semantic (AI) | LLM (Gemini) |
|-------|--------|---------------|--------------|
| **Akurasi** | ⭐⭐⭐ Kata + stemming | ⭐⭐⭐⭐ Makna | ⭐⭐⭐⭐⭐ Reasoning |
| **Kecepatan** | ⚡ Instan | 🕐 5-30 detik | 🕐 8+ detik/pair |
| **Penjelasan** | ❌ Tidak ada | ❌ Tidak ada | ✅ Detail |
| **Saran** | ❌ Tidak ada | ❌ Tidak ada | ✅ Ada |
| **Biaya** | 💚 Gratis | 💚 Gratis | 💛 Free tier |
| **Pencarian** | ✅ NIM/Nama | ✅ NIM/Nama | ✅ NIM/Nama |

**Rekomendasi:**

- Gunakan **TF-IDF** untuk pengecekan cepat
- Gunakan **Semantic** untuk screening awal
- Gunakan **LLM** untuk analisis mendalam yang butuh penjelasan

---

### 🎨 Tema Warna Halaman

Setiap halaman memiliki identitas warna yang berbeda untuk memudahkan navigasi:

| Halaman | Warna | Kode |
|---------|-------|------|
| Dashboard | Dark Blue | #2c3e50 |
| TF-IDF | Google Blue | #1a73e8 |
| Semantic | Purple | #7c3aed |
| LLM Manual | Orange | #ea580c |
| LLM Batch | Green | #059669 |

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
├── llm_similarity.html        # Analisis LLM (manual selection)
├── llm_batch.html             # Analisis LLM (batch otomatis)
├── config.js                  # Konfigurasi URL & kolom CSV
├── embedding-service.js       # Service untuk embedding API
├── supabase_schema.sql        # Database schema untuk Supabase
├── KK E.xlsx - ....csv        # Data master mahasiswa
├── README.md                  # Dokumentasi
├── .github/workflows/
│   └── keep-alive.yml         # GitHub Actions keep-alive
├── Semantic_Similarity/       # Kode HF Space (Gradio)
│   ├── app.py                 # API endpoint + Gemini integration
│   ├── requirements.txt       # Dependencies
│   └── .env                   # API keys (local only)
└── Monitoring Proksi - *.png  # Infografis sistem
```

---

## 🗃️ Database Schema (Supabase)

Aplikasi menggunakan 2 tabel di Supabase untuk caching:

### Tabel: `proposal_embeddings`

Menyimpan embedding vektor untuk setiap proposal.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| nim | VARCHAR(20) | NIM mahasiswa |
| content_hash | VARCHAR(32) | MD5 hash konten proposal |
| embedding_combined | FLOAT8[] | Embedding gabungan (384 dim) |
| embedding_judul | FLOAT8[] | Embedding judul |
| embedding_deskripsi | FLOAT8[] | Embedding deskripsi |
| embedding_problem | FLOAT8[] | Embedding problem |
| embedding_metode | FLOAT8[] | Embedding metode |
| nama | VARCHAR(255) | Nama mahasiswa |
| judul | TEXT | Judul proposal |

### Tabel: `llm_analysis`

Menyimpan hasil analisis LLM untuk pasangan proposal.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| pair_hash | VARCHAR(32) | MD5 hash pasangan (unique) |
| proposal1_judul | TEXT | Judul proposal 1 |
| proposal2_judul | TEXT | Judul proposal 2 |
| similarity_score | INTEGER | Skor kemiripan 0-100 |
| verdict | VARCHAR(50) | AMAN/PERLU_REVIEW/BERMASALAH |
| reasoning | TEXT | Penjelasan dari LLM |
| saran | TEXT | Saran dari LLM |
| similar_aspects | JSONB | Aspek yang mirip |
| differentiator | TEXT | Pembeda utama |
| model_used | VARCHAR(100) | Model yang digunakan |

> File SQL lengkap: [`supabase_schema.sql`](supabase_schema.sql)

---

## 🛠️ Teknologi

Aplikasi ini dibangun menggunakan teknologi web standar tanpa backend (Serverless/Static Site), sehingga sangat ringan dan cepat.

- **HTML5 & CSS3**
- **JavaScript (Vanilla)**
- **Libraries:**
  - [PapaParse](https://www.papaparse.com/) (CSV Parsing)
  - [Chart.js](https://www.chartjs.org/) (Data Visualization)
  - [ExcelJS](https://github.com/exceljs/exceljs) (Excel Export)
  - [jsPDF & AutoTable](https://github.com/parallax/jsPDF) (PDF Export)
  - [stopwords-iso](https://github.com/stopwords-iso) (Stopwords ID+EN via jsDelivr GitHub CDN)
- **API & Services:**
  - [Hugging Face Space](https://huggingface.co/spaces/galihboy/semantic-embedding-api) (AI Embedding + LLM Proxy)
  - [Supabase](https://supabase.com/) (PostgreSQL Cache Database)
  - [Google Gemini API](https://ai.google.dev/) (LLM Analysis)
  - [GitHub Actions](https://github.com/features/actions) (Keep-alive Scheduler)

---

## 📡 Gradio API Reference

### Format Endpoint (Gradio 4.x+)

Aplikasi menggunakan Gradio sebagai API backend di HF Space. Penting untuk menggunakan format endpoint yang benar:

| Gradio Version | Format Lama ❌ | Format Baru ✅ |
|----------------|----------------|----------------|
| < 4.0 | `/gradio_api/call/{name}` | - |
| ≥ 4.0 | - | `/call/{name}` |
| Info endpoint | `/gradio_api/info` | `/info` |

### Daftar API Endpoints

| Endpoint | Fungsi | Input |
|----------|--------|-------|
| `/call/get_embedding` | Generate embedding single text | `text` |
| `/call/get_embeddings_batch` | Generate embeddings batch | `texts_json` |
| `/call/calculate_similarity` | Hitung cosine similarity | `text1`, `text2` |
| `/call/db_check_connection` | Cek koneksi Supabase | - |
| `/call/db_get_all_embeddings` | Ambil semua cache | - |
| `/call/db_get_embedding` | Ambil embedding by NIM | `nim`, `content_hash` |
| `/call/db_save_embedding` | Simpan embedding (API only) | `data_json` |
| `/call/llm_check_status` | Cek status Gemini | - |
| `/call/llm_analyze_simple` | Analisis quick (judul+metode) | `judul1`, `judul2`, `metode1`, `metode2` |
| `/call/llm_analyze_pair` | Analisis full proposal | `proposal1_json`, `proposal2_json`, `use_cache` |

### Cara Memanggil API (JavaScript)

```javascript
// 1. POST untuk memulai request
const response = await fetch(`${GRADIO_URL}/call/get_embedding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: ["teks yang ingin di-embed"] })
});
const { event_id } = await response.json();

// 2. GET untuk mengambil hasil
const resultResponse = await fetch(`${GRADIO_URL}/call/get_embedding/${event_id}`);
const resultText = await resultResponse.text();

// 3. Parse hasil (format: "data: [...]")
const lines = resultText.trim().split('\n');
const dataLine = lines.find(l => l.startsWith('data:'));
const result = JSON.parse(dataLine.substring(5));
```

### Catatan Penting

1. **Gunakan `api_name` di Gradio** - Setiap `.click()` di `app.py` harus punya `api_name` eksplisit
2. **Two-step request** - POST untuk mulai, GET untuk ambil hasil (async pattern)
3. **Event ID** - Response POST berisi `event_id` yang digunakan untuk GET
4. **Data format** - Response GET dalam format Server-Sent Events (`data: ...`)

---

## 👨‍💻 Pengembang

**Galih Hermawan**

- 🌐 Website: [galih.eu](https://galih.eu)
- 🏫 Program Studi Teknik Informatika
- 🎓 Universitas Komputer Indonesia (UNIKOM)
- 📅 Terakhir Diperbarui: 30 November 2025

---
*Dibuat untuk memudahkan pengelolaan dan transparansi data proposal skripsi semester Ganjil TA 2025-2026.*
