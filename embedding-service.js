// =====================================================
// EMBEDDING SERVICE
// Service untuk get/save embeddings via HF Space (Supabase proxy)
// =====================================================

class EmbeddingService {
    constructor(gradioApiUrl) {
        this.gradioApiUrl = gradioApiUrl;
        this.isAwake = false;  // Track jika space sudah di-wake up
        this.stats = {
            fromCache: 0,
            fromApi: 0,
            errors: 0
        };
    }

    // ==================== HASH FUNCTION ====================

    /**
     * Generate content hash untuk detect perubahan
     */
    generateContentHash(proposal) {
        const content = `${proposal.nim}|${proposal.judul}|${proposal.deskripsi}|${proposal.problem}|${proposal.metode}`;
        // Simple hash menggunakan btoa
        return btoa(encodeURIComponent(content)).substring(0, 50);
    }

    // ==================== GRADIO API HELPERS ====================

    /**
     * Wake up HF Space jika sedang idle (cold start)
     * Return: true jika berhasil, false jika gagal
     */
    async wakeUpSpace(onStatusChange = null) {
        const maxAttempts = 5;
        const delayBetweenAttempts = 10000; // 10 detik

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                if (onStatusChange) {
                    onStatusChange(`🔄 Membangunkan server... (percobaan ${attempt}/${maxAttempts})`);
                }

                // Simple health check - panggil endpoint dengan timeout panjang
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 detik timeout

                const response = await fetch(`${this.gradioApiUrl}/call/get_embedding`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ data: ["test"] }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const result = await response.json();
                    // Consume the result to complete the request
                    if (result.event_id) {
                        await fetch(`${this.gradioApiUrl}/call/get_embedding/${result.event_id}`);
                    }
                    
                    if (onStatusChange) {
                        onStatusChange('✅ Server aktif!');
                    }
                    this.isAwake = true;
                    return true;
                }
            } catch (error) {
                console.log(`Wake up attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxAttempts) {
                    if (onStatusChange) {
                        onStatusChange(`⏳ Server sedang start up, menunggu ${delayBetweenAttempts/1000} detik...`);
                    }
                    await this.delay(delayBetweenAttempts);
                }
            }
        }

        if (onStatusChange) {
            onStatusChange('❌ Server tidak merespons. Coba refresh halaman.');
        }
        return false;
    }

    /**
     * Check apakah space sudah aktif
     */
    async checkSpaceStatus() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${this.gradioApiUrl}`, {
                method: "HEAD",
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Call Gradio API dan parse SSE response
     * Dengan timeout yang lebih panjang untuk handle cold start
     */
    async callGradioApi(functionName, data = [], timeoutMs = 30000) {
        // Step 1: POST to initiate call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(`${this.gradioApiUrl}/call/${functionName}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: data }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API Error ${response.status}`);
            }

            const result = await response.json();
            const eventId = result.event_id;

            // Step 2: GET result using event_id (SSE stream) - timeout lebih panjang
            const resultController = new AbortController();
            const resultTimeoutId = setTimeout(() => resultController.abort(), timeoutMs);

            const resultResponse = await fetch(
                `${this.gradioApiUrl}/call/${functionName}/${eventId}`,
                { signal: resultController.signal }
            );

            clearTimeout(resultTimeoutId);

            const resultText = await resultResponse.text();

            // Parse SSE response - find line starting with "data:"
            const lines = resultText.split('\n');
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const jsonStr = line.substring(5).trim();
                    const parsedData = JSON.parse(jsonStr);
                    // Gradio returns array, first element is our result
                    return parsedData[0];
                }
            }

            throw new Error("Invalid response format from Gradio API");
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - server mungkin sedang cold start');
            }
            throw error;
        }
    }

    // ==================== EMBEDDING API ====================

    /**
     * Get embedding dari Gradio API
     */
    async getEmbeddingFromApi(text, retryCount = 0) {
        try {
            const result = await this.callGradioApi('get_embedding', [text]);
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            return result.embedding;
        } catch (error) {
            if (retryCount < 3) {
                await this.delay(2000);
                return this.getEmbeddingFromApi(text, retryCount + 1);
            }
            throw error;
        }
    }

    /**
     * Combine text untuk combined embedding
     */
    combineText(proposal) {
        const parts = [
            proposal.judul,
            proposal.judul, // Extra weight for title
            proposal.deskripsi,
            proposal.problem,
            proposal.metode
        ].filter(Boolean);

        return parts.join(". ").substring(0, 1000);
    }

    // ==================== DATABASE API (via HF Space proxy) ====================

    /**
     * Check Supabase connection via HF Space
     */
    async checkDbConnection() {
        try {
            const result = await this.callGradioApi('db_check_connection', []);
            return result;
        } catch (error) {
            return { connected: false, error: error.message };
        }
    }

    /**
     * Get all embeddings from Supabase via HF Space
     */
    async getAllCachedEmbeddings() {
        try {
            const result = await this.callGradioApi('db_get_all_embeddings', []);
            
            if (result.error) {
                console.error('DB Error:', result.error);
                return [];
            }
            
            return result.data || [];
        } catch (error) {
            console.error('getAllCachedEmbeddings error:', error);
            return [];
        }
    }

    /**
     * Get single embedding from Supabase via HF Space
     */
    async getCachedEmbedding(nim, contentHash) {
        try {
            const result = await this.callGradioApi('db_get_embedding', [nim, contentHash]);
            
            if (result.error || !result.found) {
                return null;
            }
            
            return result.data;
        } catch (error) {
            console.error('getCachedEmbedding error:', error);
            return null;
        }
    }

    /**
     * Save embedding to Supabase via HF Space
     */
    async saveEmbedding(data) {
        try {
            const payload = JSON.stringify({
                nim: data.nim,
                content_hash: data.contentHash,
                embedding_combined: data.embeddings.combined,
                embedding_judul: data.embeddings.judul || null,
                embedding_deskripsi: data.embeddings.deskripsi || null,
                embedding_problem: data.embeddings.problem || null,
                embedding_metode: data.embeddings.metode || null,
                nama: data.nama || null,
                judul: data.judul || null
            });

            const result = await this.callGradioApi('db_save_embedding', [payload]);
            
            return result.success || false;
        } catch (error) {
            console.error('saveEmbedding error:', error);
            return false;
        }
    }

    // ==================== MAIN FUNCTIONS ====================

    /**
     * Get embeddings untuk satu proposal
     * Flow: Check HF Space (Supabase) → Call Embedding API if not found → Save via HF Space
     */
    async getEmbeddingsForProposal(proposal) {
        const contentHash = this.generateContentHash(proposal);

        // 1. Check cache via HF Space proxy
        const cached = await this.getCachedEmbedding(proposal.nim, contentHash);
        
        if (cached) {
            this.stats.fromCache++;
            return {
                combined: cached.embedding_combined,
                judul: cached.embedding_judul,
                deskripsi: cached.embedding_deskripsi,
                problem: cached.embedding_problem,
                metode: cached.embedding_metode
            };
        }

        // 2. Not in cache, fetch from Embedding API
        try {
            const embeddings = {};
            
            // Combined embedding
            const combinedText = this.combineText(proposal);
            embeddings.combined = await this.getEmbeddingFromApi(combinedText);
            
            // Per-field embeddings
            if (proposal.judul) {
                embeddings.judul = await this.getEmbeddingFromApi(proposal.judul);
                await this.delay(50);
            }
            if (proposal.deskripsi) {
                embeddings.deskripsi = await this.getEmbeddingFromApi(proposal.deskripsi.substring(0, 500));
                await this.delay(50);
            }
            if (proposal.problem) {
                embeddings.problem = await this.getEmbeddingFromApi(proposal.problem.substring(0, 500));
                await this.delay(50);
            }
            if (proposal.metode) {
                embeddings.metode = await this.getEmbeddingFromApi(proposal.metode.substring(0, 500));
                await this.delay(50);
            }

            // 3. Save to Supabase via HF Space
            await this.saveEmbedding({
                nim: proposal.nim,
                contentHash: contentHash,
                embeddings: embeddings,
                nama: proposal.nama,
                judul: proposal.judul
            });

            this.stats.fromApi++;
            return embeddings;
        } catch (error) {
            console.error(`Error getting embeddings for ${proposal.nim}:`, error);
            this.stats.errors++;
            return null;
        }
    }

    /**
     * Get embeddings untuk semua proposals (batch)
     * Optimized: Load all from cache first, then only API call for missing
     */
    async getEmbeddingsForAllProposals(proposals, onProgress = null) {
        const results = {};
        
        // 1. Build map of content hashes
        const hashMap = {};
        proposals.forEach(p => {
            hashMap[p.nim] = this.generateContentHash(p);
        });

        // 2. Load all existing embeddings from Supabase via HF Space
        if (onProgress) onProgress(0, 'Mengambil data dari cache server...', '');
        
        const existingEmbeddings = await this.getAllCachedEmbeddings();
        
        // Build lookup map: nim+hash -> embeddings
        const cacheMap = {};
        existingEmbeddings.forEach(e => {
            const key = `${e.nim}|${e.content_hash}`;
            cacheMap[key] = {
                combined: e.embedding_combined,
                judul: e.embedding_judul,
                deskripsi: e.embedding_deskripsi,
                problem: e.embedding_problem,
                metode: e.embedding_metode
            };
        });

        // 3. Process each proposal
        const toFetch = [];
        
        for (const proposal of proposals) {
            const key = `${proposal.nim}|${hashMap[proposal.nim]}`;
            
            if (cacheMap[key]) {
                // Found in cache
                results[proposal.nim] = cacheMap[key];
                this.stats.fromCache++;
            } else {
                // Need to fetch from API
                toFetch.push(proposal);
            }
        }

        if (onProgress) {
            const cachedPercent = Math.round((proposals.length - toFetch.length) / proposals.length * 100);
            onProgress(cachedPercent, `${proposals.length - toFetch.length} dari cache, ${toFetch.length} perlu diproses`, '');
        }

        // 4. Fetch missing embeddings from API
        if (toFetch.length > 0) {
            for (let i = 0; i < toFetch.length; i++) {
                const proposal = toFetch[i];
                
                if (onProgress) {
                    const overallProgress = Math.round(
                        ((proposals.length - toFetch.length + i + 1) / proposals.length) * 100
                    );
                    onProgress(
                        overallProgress,
                        `Menganalisis proposal... (${proposals.length - toFetch.length + i + 1}/${proposals.length})`,
                        proposal.nama
                    );
                }

                const embeddings = await this.getEmbeddingsForProposal(proposal);
                if (embeddings) {
                    results[proposal.nim] = embeddings;
                }

                await this.delay(100); // Rate limiting
            }
        }

        return results;
    }

    // ==================== UTILITY ====================

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    resetStats() {
        this.stats = {
            fromCache: 0,
            fromApi: 0,
            errors: 0
        };
    }

    getStats() {
        return { ...this.stats };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmbeddingService;
}
