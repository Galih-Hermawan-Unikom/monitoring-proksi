-- ============================================================
-- Supabase Schema untuk Monitoring Proposal Skripsi
-- KK E (Ilmu Komputer) - Prodi Teknik Informatika - UNIKOM
-- ============================================================

-- ============================================================
-- TABEL 1: proposal_embeddings
-- Menyimpan embedding vektor untuk setiap proposal
-- ============================================================

CREATE TABLE IF NOT EXISTS proposal_embeddings (
    id BIGSERIAL PRIMARY KEY,
    nim VARCHAR(20) NOT NULL,
    content_hash VARCHAR(32) NOT NULL,
    
    -- Embedding vectors (384 dimensi untuk paraphrase-multilingual-MiniLM-L12-v2)
    embedding_combined FLOAT8[] NOT NULL,
    embedding_judul FLOAT8[],
    embedding_deskripsi FLOAT8[],
    embedding_problem FLOAT8[],
    embedding_metode FLOAT8[],
    
    -- Metadata untuk referensi
    nama VARCHAR(255),
    judul TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: satu NIM + content_hash = satu record
    UNIQUE(nim, content_hash)
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_proposal_embeddings_nim ON proposal_embeddings(nim);
CREATE INDEX IF NOT EXISTS idx_proposal_embeddings_content_hash ON proposal_embeddings(content_hash);

-- Enable Row Level Security (opsional, untuk production)
-- ALTER TABLE proposal_embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABEL 2: llm_analysis
-- Menyimpan hasil analisis LLM (Gemini) untuk pasangan proposal
-- ============================================================

CREATE TABLE IF NOT EXISTS llm_analysis (
    id BIGSERIAL PRIMARY KEY,
    pair_hash VARCHAR(32) NOT NULL UNIQUE,
    
    -- Referensi judul proposal (untuk debugging/review)
    proposal1_judul TEXT,
    proposal2_judul TEXT,
    
    -- Hasil analisis LLM
    similarity_score INTEGER,          -- Skor kemiripan 0-100
    verdict VARCHAR(50),               -- AMAN, PERLU_REVIEW, BERMASALAH
    reasoning TEXT,                    -- Penjelasan dari LLM
    saran TEXT,                        -- Saran dari LLM
    similar_aspects JSONB,             -- Array aspek yang mirip
    differentiator TEXT,               -- Pembeda utama
    
    -- Metadata
    model_used VARCHAR(100),           -- Model yang digunakan (e.g., gemini-2.5-pro)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_llm_analysis_pair_hash ON llm_analysis(pair_hash);
CREATE INDEX IF NOT EXISTS idx_llm_analysis_verdict ON llm_analysis(verdict);
CREATE INDEX IF NOT EXISTS idx_llm_analysis_created_at ON llm_analysis(created_at);

-- Enable Row Level Security (opsional, untuk production)
-- ALTER TABLE llm_analysis ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNCTIONS (Opsional - untuk maintenance)
-- ============================================================

-- Function untuk membersihkan cache embedding lama (>30 hari)
CREATE OR REPLACE FUNCTION cleanup_old_embeddings(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM proposal_embeddings 
    WHERE updated_at < NOW() - (days_old || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function untuk membersihkan cache LLM lama (>90 hari)
CREATE OR REPLACE FUNCTION cleanup_old_llm_analysis(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM llm_analysis 
    WHERE created_at < NOW() - (days_old || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEWS (Opsional - untuk analytics)
-- ============================================================

-- View: Ringkasan LLM Analysis
CREATE OR REPLACE VIEW llm_analysis_summary AS
SELECT 
    verdict,
    COUNT(*) as count,
    AVG(similarity_score) as avg_score,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM llm_analysis
GROUP BY verdict;

-- View: Recent LLM Analysis
CREATE OR REPLACE VIEW recent_llm_analysis AS
SELECT 
    pair_hash,
    proposal1_judul,
    proposal2_judul,
    similarity_score,
    verdict,
    model_used,
    created_at
FROM llm_analysis
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================
-- POLICIES (Untuk Row Level Security - Production)
-- Uncomment jika menggunakan RLS
-- ============================================================

-- Policy untuk read access (public)
-- CREATE POLICY "Allow public read" ON proposal_embeddings FOR SELECT USING (true);
-- CREATE POLICY "Allow public read" ON llm_analysis FOR SELECT USING (true);

-- Policy untuk write access (dengan service role key)
-- CREATE POLICY "Allow service write" ON proposal_embeddings FOR ALL USING (auth.role() = 'service_role');
-- CREATE POLICY "Allow service write" ON llm_analysis FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- NOTES
-- ============================================================
-- 
-- 1. content_hash di proposal_embeddings:
--    - MD5 hash dari: nim|judul|deskripsi|problem|metode
--    - Digunakan untuk mendeteksi perubahan konten proposal
--    - Jika konten berubah, embedding akan di-regenerate
--
-- 2. pair_hash di llm_analysis:
--    - MD5 hash dari kombinasi 2 proposal
--    - Sorted agar A vs B = B vs A (tidak perlu cache 2x)
--    - Format: hash(sorted([hash(proposal1), hash(proposal2)]))
--
-- 3. Embedding dimensions:
--    - Model: paraphrase-multilingual-MiniLM-L12-v2
--    - Output: 384 dimensi float
--    - Storage: FLOAT8[] (PostgreSQL array)
--

