// =====================================================
// KONFIGURASI - Edit sesuai dengan setup Anda
// =====================================================

const CONFIG = {
    // ===================
    // GRADIO API CONFIG (HF Space)
    // ===================
    // Semua operasi (embedding + database) melalui HF Space
    // Untuk testing lokal: http://127.0.0.1:7860
    // Untuk production: URL Hugging Face Space Anda
    GRADIO_API_URL: "https://galihboy-semantic-embedding-api.hf.space",

    // ===================
    // DATA SOURCE
    // ===================
    // URL Google Sheets (published as CSV)
    CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTByDo6WQAT0rQMEVcL24WyJdm4gMKm4Zfjm6RYQ-prEaLvEcruqmRXKKNWXesxReA-nPqyhmH_BMAg/pub?gid=14519582&single=true&output=csv",

    // Column indices in CSV (0-based)
    CSV_COLUMNS: {
        NIM: 1,
        NAMA: 2,
        JUDUL: 3,
        DESKRIPSI: 5,
        PROBLEM: 6,
        METODE: 7
    },

    // ===================
    // APP SETTINGS
    // ===================
    DEFAULT_THRESHOLD: 40,  // Default similarity threshold (%)
    ITEMS_PER_PAGE: 10,     // Pagination
    API_DELAY_MS: 100,      // Delay between API calls to avoid rate limiting
    MAX_TEXT_LENGTH: 500    // Max chars per field for embedding
};

// Note: Supabase credentials are now stored securely in HF Space Secrets
// Browser never sees the API key!

// Export untuk digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
