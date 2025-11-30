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
            fromLocal: 0,  // NEW: dari browser localStorage
            errors: 0
        };
        
        // LocalStorage cache settings
        this.LOCAL_CACHE_KEY = 'proksi_embeddings_cache';
        this.LOCAL_CACHE_TIMESTAMP_KEY = 'proksi_embeddings_timestamp';
        this.LOCAL_CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 menit
    }
    
    // ==================== LOCAL STORAGE CACHE ====================
    
    /**
     * Check if local cache is valid (exists and not expired)
     */
    isLocalCacheValid() {
        try {
            const timestamp = localStorage.getItem(this.LOCAL_CACHE_TIMESTAMP_KEY);
            if (!timestamp) return false;
            
            const age = Date.now() - parseInt(timestamp);
            return age < this.LOCAL_CACHE_MAX_AGE_MS;
        } catch (e) {
            console.warn('localStorage not available:', e);
            return false;
        }
    }
    
    /**
     * Get embeddings from local cache
     */
    getLocalCache() {
        try {
            const data = localStorage.getItem(this.LOCAL_CACHE_KEY);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) {
            console.warn('Failed to read local cache:', e);
            return null;
        }
    }
    
    /**
     * Save embeddings to local cache
     */
    saveLocalCache(embeddings) {
        try {
            localStorage.setItem(this.LOCAL_CACHE_KEY, JSON.stringify(embeddings));
            localStorage.setItem(this.LOCAL_CACHE_TIMESTAMP_KEY, Date.now().toString());
            console.log(`✅ Saved ${Object.keys(embeddings).length} embeddings to local cache`);
        } catch (e) {
            console.warn('Failed to save local cache (might be full):', e);
        }
    }
    
    /**
     * Clear local cache (for force refresh)
     */
    clearLocalCache() {
        try {
            localStorage.removeItem(this.LOCAL_CACHE_KEY);
            localStorage.removeItem(this.LOCAL_CACHE_TIMESTAMP_KEY);
            console.log('🗑️ Local cache cleared');
        } catch (e) {
            console.warn('Failed to clear local cache:', e);
        }
    }
    
    /**
     * Get cache age in minutes (for display)
     */
    getLocalCacheAge() {
        try {
            const timestamp = localStorage.getItem(this.LOCAL_CACHE_TIMESTAMP_KEY);
            if (!timestamp) return null;
            
            const ageMs = Date.now() - parseInt(timestamp);
            return Math.round(ageMs / 60000); // in minutes
        } catch (e) {
            return null;
        }
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
        console.log(`🔄 Calling API: ${functionName}...`);
        
        // Step 1: POST to initiate call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            console.log(`  → POST to /call/${functionName}`);
            const response = await fetch(`${this.gradioApiUrl}/call/${functionName}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: data }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log(`  → POST response: ${response.status}`);

            if (!response.ok) {
                throw new Error(`API Error ${response.status}`);
            }

            const result = await response.json();
            const eventId = result.event_id;
            console.log(`  → Got event_id: ${eventId}`);

            // Step 2: GET result using event_id (SSE stream) - timeout lebih panjang
            const resultController = new AbortController();
            const resultTimeoutId = setTimeout(() => resultController.abort(), timeoutMs);

            console.log(`  → GET result for ${eventId}...`);
            const resultResponse = await fetch(
                `${this.gradioApiUrl}/call/${functionName}/${eventId}`,
                { signal: resultController.signal }
            );

            console.log(`  → GET response: ${resultResponse.status}`);

            // Read entire SSE stream (safer for large responses like embeddings)
            const reader = resultResponse.body.getReader();
            const decoder = new TextDecoder();
            let chunks = [];
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            
            clearTimeout(resultTimeoutId);
            
            // Combine all chunks and decode at once
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
            }
            const buffer = decoder.decode(combined);
            
            console.log(`  → Stream complete (${buffer.length} chars)`);
            
            // Parse SSE response - find line starting with "data:"
            const lines = buffer.split('\n');
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const jsonStr = line.substring(5).trim();
                    console.log(`  → Parsing data line (${jsonStr.length} chars)...`);
                    const parsedData = JSON.parse(jsonStr);
                    console.log(`  → Parsed successfully`);
                    return parsedData[0];
                }
            }
            
            throw new Error("Invalid response format from Gradio API - no data line found");
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
            console.log('📥 Fetching all embeddings from server...');
            const startTime = Date.now();
            
            // Longer timeout for potentially large data
            const result = await this.callGradioApi('db_get_all_embeddings', [], 60000);
            
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ Fetched embeddings in ${elapsed}s:`, result);
            
            if (result.error) {
                console.error('DB Error:', result.error);
                return [];
            }
            
            const data = result.data || [];
            console.log(`📊 Got ${data.length} embeddings from server`);
            return data;
        } catch (error) {
            console.error('❌ getAllCachedEmbeddings error:', error);
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
     * Optimized: Check local cache → Supabase cache → API
     * @param {boolean} forceRefresh - Skip local cache and fetch from server
     */
    async getEmbeddingsForAllProposals(proposals, onProgress = null, forceRefresh = false) {
        const results = {};
        const totalProposals = proposals.length; // Save original count
        
        // 1. Build map of content hashes
        const hashMap = {};
        proposals.forEach(p => {
            hashMap[p.nim] = this.generateContentHash(p);
        });

        // 2. Check LOCAL cache first (instant!)
        if (!forceRefresh && this.isLocalCacheValid()) {
            const localCache = this.getLocalCache();
            if (localCache) {
                const cacheAge = this.getLocalCacheAge();
                if (onProgress) onProgress(5, `Menggunakan cache lokal (${cacheAge} menit lalu)...`, 'Memeriksa data baru');
                
                // Check if all proposals are in local cache with correct hash
                let allFound = true;
                const missingProposals = [];
                
                for (const proposal of proposals) {
                    const cached = localCache[proposal.nim];
                    if (cached && cached.hash === hashMap[proposal.nim]) {
                        results[proposal.nim] = cached.embeddings;
                        this.stats.fromLocal++;
                    } else {
                        allFound = false;
                        missingProposals.push(proposal);
                    }
                }
                
                // If all found in local cache, we're done!
                if (allFound) {
                    if (onProgress) onProgress(100, `${totalProposals} dari cache lokal`, 'Instant load! ⚡');
                    console.log(`⚡ All ${totalProposals} embeddings loaded from local cache`);
                    return results;
                }
                
                // Some missing - need to fetch from server
                if (onProgress) onProgress(10, `${Object.keys(results).length} dari lokal, ${missingProposals.length} perlu sync...`, '');
                proposals = missingProposals; // Only fetch missing ones
            }
        }

        // 3. Load from Supabase via HF Space
        if (onProgress) onProgress(15, 'Mengambil data dari server...', 'Menghubungi Supabase');
        
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

        // 4. Process each proposal
        const toFetch = [];
        
        for (const proposal of proposals) {
            const key = `${proposal.nim}|${hashMap[proposal.nim]}`;
            
            if (cacheMap[key]) {
                // Found in Supabase cache
                results[proposal.nim] = cacheMap[key];
                this.stats.fromCache++;
            } else {
                // Need to fetch from API
                toFetch.push(proposal);
            }
        }

        if (onProgress) {
            const processed = Object.keys(results).length;
            const cachedPercent = Math.round(processed / totalProposals * 100);
            onProgress(cachedPercent, `${processed} dari cache, ${toFetch.length} perlu diproses`, '');
        }

        // 5. Fetch missing embeddings from API
        if (toFetch.length > 0) {
            for (let i = 0; i < toFetch.length; i++) {
                const proposal = toFetch[i];
                const processed = Object.keys(results).length + i + 1;
                
                if (onProgress) {
                    const overallProgress = Math.round(processed / totalProposals * 100);
                    onProgress(
                        overallProgress,
                        `Menganalisis proposal... (${processed}/${totalProposals})`,
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

        // 5. Save ALL results to local cache for next time
        this.saveResultsToLocalCache(results, hashMap);

        return results;
    }
    
    /**
     * Save results to local cache with hashes for validation
     */
    saveResultsToLocalCache(results, hashMap) {
        const localCache = {};
        for (const nim in results) {
            localCache[nim] = {
                hash: hashMap[nim],
                embeddings: results[nim]
            };
        }
        this.saveLocalCache(localCache);
    }

    // ==================== UTILITY ====================

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    resetStats() {
        this.stats = {
            fromCache: 0,
            fromApi: 0,
            fromLocal: 0,
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
