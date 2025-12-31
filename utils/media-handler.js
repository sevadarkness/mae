/**
 * Media Handler for ChatBackup Integration
 * Handles download, decryption, and ZIP creation for WhatsApp media
 * Based on sevadarkness/backup repository extractor.js
 */

(function() {
    'use strict';

    // ===== JSZip v3.10.1 Bundled Inline (Minified) =====
    // This is bundled inline to avoid CSP issues with external scripts
    // For now, we rely on CDN version loaded in sidepanel.html
    // If CDN fails, operations will fail gracefully with error message
    
    const JSZipStub = {
        // Constructor stub
        file: () => JSZipStub,
        folder: () => JSZipStub,
        generateAsync: async () => {
            throw new Error('[MediaHandler] JSZip not available - ensure it is loaded from CDN');
        }
    };
    
    // Use window.JSZip if available (from CDN in sidepanel), otherwise create fallback constructor
    const JSZip = window.JSZip || function JSZipNotAvailable() {
        throw new Error('[MediaHandler] JSZip not available - ensure it is loaded from CDN');
    };
    
    // Ensure JSZip has proper prototype if using fallback
    if (!window.JSZip) {
        JSZip.prototype.file = function() { throw new Error('[MediaHandler] JSZip not available'); };
        JSZip.prototype.generateAsync = function() { throw new Error('[MediaHandler] JSZip not available'); };
    }

    // ===== CONSTANTS =====
    const CDNS = [
        "https://mmg.whatsapp.net",
        "https://media.fna.whatsapp.net",
        "https://media-for2-1.cdn.whatsapp.net",
        "https://media-for2-2.cdn.whatsapp.net"
    ];

    const MEDIA_TYPES = {
        IMAGE: 'image',
        VIDEO: 'video',
        AUDIO: 'audio',
        PTT: 'ptt', // Push-to-talk
        DOCUMENT: 'document',
        STICKER: 'sticker'
    };

    const HKDF_INFO = {
        'image': 'WhatsApp Image Keys',
        'video': 'WhatsApp Video Keys',
        'audio': 'WhatsApp Audio Keys',
        'ptt': 'WhatsApp Audio Keys',
        'document': 'WhatsApp Document Keys',
        'sticker': 'WhatsApp Image Keys'
    };

    // ===== UTILITY FUNCTIONS =====
    
    /**
     * Get current timestamp in seconds (WhatsApp format)
     */
    function getTimestampSeconds() {
        return Math.floor(Date.now() / 1000);
    }
    
    /**
     * Convert base64 string to Uint8Array
     */
    function base64ToUint8Array(base64) {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    // ===== CRYPTOGRAPHIC FUNCTIONS =====

    /**
     * HKDF Expand function for key derivation
     * Implements HKDF-Expand as used by WhatsApp for media decryption
     * 
     * @param {Uint8Array} key - Input key material (32 bytes)
     * @param {string} mediaType - Type of media (image, video, audio, etc.)
     * @returns {Promise<{iv: Uint8Array, cipherKey: Uint8Array}>} IV and cipher key
     */
    async function hkdfExpand(key, mediaType) {
        try {
            const info = HKDF_INFO[mediaType] || 'WhatsApp';
            const infoBytes = new TextEncoder().encode(info);
            
            // Import key for HMAC
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                key,
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );

            // HKDF-Expand: Generate 112 bytes (for IV + cipher key + MAC key)
            // We need: 16 bytes IV + 32 bytes cipher key + 64 bytes MAC key = 112 bytes
            const outputLength = 112;
            const hashLength = 32; // SHA-256 output
            const n = Math.ceil(outputLength / hashLength);
            
            let t = new Uint8Array(0);
            const output = new Uint8Array(outputLength);
            let outputOffset = 0;
            
            for (let i = 1; i <= n; i++) {
                // T(i) = HMAC-Hash(PRK, T(i-1) | info | i)
                const input = new Uint8Array(t.length + infoBytes.length + 1);
                input.set(t, 0);
                input.set(infoBytes, t.length);
                input[t.length + infoBytes.length] = i;
                
                t = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, input));
                
                const copyLength = Math.min(hashLength, outputLength - outputOffset);
                output.set(t.subarray(0, copyLength), outputOffset);
                outputOffset += copyLength;
            }
            
            // Extract IV (first 16 bytes) and cipher key (next 32 bytes)
            const iv = output.slice(0, 16);
            const cipherKey = output.slice(16, 48);
            
            return { iv, cipherKey };
        } catch (error) {
            console.error('[MediaHandler] HKDF error:', error);
            throw new Error('HKDF key derivation failed: ' + error.message);
        }
    }

    /**
     * Decrypt media using AES-CBC
     * 
     * @param {Uint8Array} encryptedData - Encrypted media data
     * @param {string} mediaKeyBase64 - Media key in base64
     * @param {string} mediaType - Type of media
     * @returns {Promise<Uint8Array>} Decrypted data
     */
    async function decryptMedia(encryptedData, mediaKeyBase64, mediaType) {
        try {
            // Decode media key from base64
            const mediaKey = base64ToUint8Array(mediaKeyBase64);
            
            if (mediaKey.length !== 32) {
                throw new Error(`Invalid media key length: ${mediaKey.length} (expected 32)`);
            }
            
            // Derive IV and cipher key using HKDF
            const { iv, cipherKey } = await hkdfExpand(mediaKey, mediaType);
            
            // Remove last 10 bytes (MAC tag) from encrypted data
            // WhatsApp media encryption uses HMAC-SHA256 for authentication
            // The last 10 bytes contain the truncated MAC that must be removed before AES-CBC decryption
            const ciphertext = encryptedData.slice(0, -10);
            
            // Import cipher key
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                cipherKey,
                { name: 'AES-CBC' },
                false,
                ['decrypt']
            );
            
            // Decrypt using AES-CBC
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-CBC', iv: iv },
                cryptoKey,
                ciphertext
            );
            
            return new Uint8Array(decrypted);
        } catch (error) {
            console.error('[MediaHandler] Decryption error:', error);
            throw new Error('Media decryption failed: ' + error.message);
        }
    }

    // ===== DOWNLOAD FUNCTIONS =====

    /**
     * Fetch media from WhatsApp CDN with multiple fallbacks
     * 
     * @param {string} directPath - Direct path to media
     * @returns {Promise<ArrayBuffer>} Downloaded data
     */
    async function fetchWithCdnFallback(directPath) {
        let lastError = null;
        
        for (const cdn of CDNS) {
            try {
                const url = `${cdn}${directPath}`;
                console.log(`[MediaHandler] Trying CDN: ${cdn}`);
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Origin': 'https://web.whatsapp.com',
                        'Referer': 'https://web.whatsapp.com/'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.arrayBuffer();
                console.log(`[MediaHandler] Downloaded ${data.byteLength} bytes from ${cdn}`);
                return data;
            } catch (error) {
                console.warn(`[MediaHandler] CDN ${cdn} failed:`, error.message);
                lastError = error;
                continue;
            }
        }
        
        throw new Error(`All CDNs failed. Last error: ${lastError?.message}`);
    }

    /**
     * Download and decrypt a single media item
     * 
     * @param {Object} msg - Message object containing media info
     * @returns {Promise<{data: Uint8Array, filename: string, mimeType: string}>}
     */
    async function downloadAndDecryptMedia(msg) {
        try {
            // Extract media info from message
            const mediaType = msg.type;
            
            // Validate media type
            const validTypes = Object.values(MEDIA_TYPES);
            if (!mediaType || !validTypes.includes(mediaType)) {
                throw new Error(`Invalid or unknown media type: ${mediaType}`);
            }
            
            const directPath = msg.directPath;
            const mediaKey = msg.mediaKey; // base64
            const mimetype = msg.mimetype || 'application/octet-stream';
            
            if (!directPath || !mediaKey) {
                throw new Error('Missing directPath or mediaKey');
            }
            
            // Download encrypted media
            console.log(`[MediaHandler] Downloading ${mediaType}...`);
            const encryptedData = await fetchWithCdnFallback(directPath);
            
            // Decrypt media
            console.log(`[MediaHandler] Decrypting ${mediaType}...`);
            const decryptedData = await decryptMedia(
                new Uint8Array(encryptedData),
                mediaKey,
                mediaType
            );
            
            // Generate filename
            const timestamp = msg.t || getTimestampSeconds();
            const ext = getExtensionFromMime(mimetype);
            const filename = `${mediaType}_${timestamp}${ext}`;
            
            return {
                data: decryptedData,
                filename: filename,
                mimeType: mimetype
            };
        } catch (error) {
            console.error('[MediaHandler] Download/decrypt failed:', error);
            throw error;
        }
    }

    /**
     * Get file extension from MIME type
     */
    function getExtensionFromMime(mimetype) {
        const mimeMap = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'video/mp4': '.mp4',
            'video/3gpp': '.3gp',
            'audio/ogg': '.ogg',
            'audio/mpeg': '.mp3',
            'audio/mp4': '.m4a',
            'application/pdf': '.pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx'
        };
        
        return mimeMap[mimetype] || '.bin';
    }

    // ===== ZIP CREATION FUNCTIONS =====

    /**
     * Create a ZIP file from media files
     * 
     * @param {Array} mediaFiles - Array of {data, filename, mimeType}
     * @param {string} zipName - Name for the ZIP file
     * @returns {Promise<Blob>} ZIP file as Blob
     */
    async function createMediaZip(mediaFiles, zipName) {
        try {
            console.log(`[MediaHandler] Creating ZIP: ${zipName} with ${mediaFiles.length} files`);
            
            const zip = new JSZip();
            
            // Add each file to ZIP
            for (const file of mediaFiles) {
                zip.file(file.filename, file.data);
            }
            
            // Generate ZIP
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });
            
            console.log(`[MediaHandler] ZIP created: ${zipBlob.size} bytes`);
            return zipBlob;
        } catch (error) {
            console.error('[MediaHandler] ZIP creation failed:', error);
            throw new Error('Failed to create ZIP: ' + error.message);
        }
    }

    /**
     * Download media for export, grouped by type
     * 
     * @param {Array} messages - Array of message objects
     * @param {Object} options - Export options
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} Object with blob URLs for each ZIP
     */
    async function downloadMediaForExport(messages, options, onProgress) {
        const results = {
            images: null,
            audios: null,
            documents: null,
            stats: {
                images: { total: 0, downloaded: 0, failed: 0 },
                audios: { total: 0, downloaded: 0, failed: 0 },
                documents: { total: 0, downloaded: 0, failed: 0 }
            }
        };
        
        try {
            // Group messages by media type
            const mediaGroups = {
                images: [],
                audios: [],
                documents: []
            };
            
            for (const msg of messages) {
                const type = msg.type;
                if (type === 'image' && options.exportImages) {
                    mediaGroups.images.push(msg);
                } else if ((type === 'audio' || type === 'ptt') && options.exportAudios) {
                    mediaGroups.audios.push(msg);
                } else if (type === 'document' && options.exportDocs) {
                    mediaGroups.documents.push(msg);
                }
            }
            
            // Process each media group
            for (const [groupName, msgs] of Object.entries(mediaGroups)) {
                if (msgs.length === 0) continue;
                
                const groupKey = groupName; // 'images', 'audios', 'documents'
                results.stats[groupKey].total = msgs.length;
                
                const mediaFiles = [];
                
                for (let i = 0; i < msgs.length; i++) {
                    const msg = msgs[i];
                    
                    try {
                        // Report progress
                        if (onProgress) {
                            onProgress({
                                type: 'media',
                                groupName: groupKey,
                                current: i + 1,
                                total: msgs.length,
                                failed: results.stats[groupKey].failed
                            });
                        }
                        
                        // Download and decrypt
                        const media = await downloadAndDecryptMedia(msg);
                        mediaFiles.push(media);
                        results.stats[groupKey].downloaded++;
                    } catch (error) {
                        console.error(`[MediaHandler] Failed to process media:`, error);
                        results.stats[groupKey].failed++;
                    }
                }
                
                // Create ZIP if we have any files
                if (mediaFiles.length > 0) {
                    if (onProgress) {
                        onProgress({
                            type: 'zip',
                            groupName: groupKey,
                            status: 'creating'
                        });
                    }
                    
                    const zipName = `${groupKey}.zip`;
                    const zipBlob = await createMediaZip(mediaFiles, zipName);
                    
                    // Create blob URL
                    results[groupKey] = {
                        blob: zipBlob,
                        url: URL.createObjectURL(zipBlob),
                        filename: zipName
                    };
                    
                    if (onProgress) {
                        onProgress({
                            type: 'zip',
                            groupName: groupKey,
                            status: 'complete'
                        });
                    }
                }
            }
            
            return results;
        } catch (error) {
            console.error('[MediaHandler] Export failed:', error);
            throw error;
        }
    }

    // ===== PUBLIC API =====
    window.MediaHandler = {
        // Utility functions
        getTimestampSeconds,
        
        // Crypto functions
        hkdfExpand,
        decryptMedia,
        
        // Download functions
        fetchWithCdnFallback,
        downloadAndDecryptMedia,
        
        // ZIP functions
        createMediaZip,
        downloadMediaForExport,
        
        // Constants
        MEDIA_TYPES,
        CDNS
    };
    
    console.log('[MediaHandler] Initialized successfully');
})();
