const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apikey;
    const validApiKey = process.env.API_KEY || 'hive-storage-default-key';
    
    if (!apiKey) {
        return res.status(401).json({
            status: 'error',
            message: 'API Key é obrigatória. Forneça a chave via header "x-api-key" ou query parameter "apikey".',
            error: 'MISSING_API_KEY'
        });
    }
    
    if (apiKey !== validApiKey) {
        return res.status(403).json({
            status: 'error',
            message: 'API Key inválida.',
            error: 'INVALID_API_KEY'
        });
    }
    
    next();
};

// Apply API Key authentication to all routes except health check
router.use((req, res, next) => {
    // Skip authentication for health check endpoint
    if (req.path === '/health') {
        return next();
    }
    return authenticateApiKey(req, res, next);
});

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Path to metadata file
const metadataPath = path.join(dataDir, 'metadata.json');

// Multer setup for file uploads with user folders
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Get username from request body, default to 'default' if not provided
        const username = req.body.username || 'default';
        const userDir = path.join(dataDir, username);
        
        // Create user directory if it doesn't exist
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
            console.log(`📁 Created user directory: ${username}`);
        }
        
        cb(null, userDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4();
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept all file types for now
        cb(null, true);
    }
});

// In-memory store for media metadata (now backed by JSON file)
let mediaStore = [];

// Helper function to validate UUID
const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

// Helper function to get media by ID
const getMediaById = (id) => {
    return mediaStore.find(m => m.id === id);
};

// Helper function to format file size
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Function to load metadata from JSON file
const loadMetadata = () => {
    try {
        if (fs.existsSync(metadataPath)) {
            const data = fs.readFileSync(metadataPath, 'utf8');
            const metadata = JSON.parse(data);
            
            // Validate that files still exist and filter out orphaned metadata
            const validMetadata = metadata.filter(media => {
                if (fs.existsSync(media.path)) {
                    return true;
                } else {
                    console.warn(`File not found, removing metadata: ${media.path}`);
                    return false;
                }
            });
            
            mediaStore = validMetadata;
            console.log(`📂 Loaded ${validMetadata.length} media files from metadata`);
            
            // If we filtered out some files, save the cleaned metadata
            if (validMetadata.length !== metadata.length) {
                saveMetadata();
            }
        } else {
            console.log('📂 No existing metadata file found, starting fresh');
            mediaStore = [];
        }
    } catch (error) {
        console.error('❌ Error loading metadata:', error);
        mediaStore = [];
    }
};

// Function to save metadata to JSON file
const saveMetadata = () => {
    try {
        fs.writeFileSync(metadataPath, JSON.stringify(mediaStore, null, 2), 'utf8');
        console.log(`💾 Metadata saved (${mediaStore.length} items)`);
    } catch (error) {
        console.error('❌ Error saving metadata:', error);
    }
};

// Function to scan data directory for orphaned files and create metadata
const scanForOrphanedFiles = () => {
    try {
        let orphanedCount = 0;
        
        // Function to scan a directory recursively
        const scanDirectory = (dirPath, username = null) => {
            const items = fs.readdirSync(dirPath);
            
            items.forEach(itemName => {
                // Skip metadata.json file
                if (itemName === 'metadata.json') return;
                
                const itemPath = path.join(dirPath, itemName);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    // If it's a directory in the root data folder, treat it as a username
                    if (dirPath === dataDir) {
                        scanDirectory(itemPath, itemName);
                    }
                } else {
                    // It's a file
                    const fileId = path.parse(itemName).name;
                    
                    // Check if metadata already exists for this file
                    const existingMetadata = mediaStore.find(m => m.id === fileId);
                    
                    if (!existingMetadata && isValidUUID(fileId)) {
                        // Create metadata for orphaned file
                        const ext = path.extname(itemName);
                        const originalName = itemName;
                        const displayName = `Recovered File ${fileId.substring(0, 8)}${ext}`;
                        const user = username || 'default';
                        
                        // Try to determine mimetype based on extension
                        let mimetype = 'application/octet-stream';
                        const extLower = ext.toLowerCase();
                        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extLower)) {
                            mimetype = `image/${extLower.substring(1) === 'jpg' ? 'jpeg' : extLower.substring(1)}`;
                        } else if (['.mp4', '.webm', '.mov', '.avi'].includes(extLower)) {
                            mimetype = `video/${extLower.substring(1)}`;
                        } else if (['.mp3', '.wav', '.ogg', '.flac'].includes(extLower)) {
                            mimetype = `audio/${extLower.substring(1)}`;
                        } else if (['.pdf'].includes(extLower)) {
                            mimetype = 'application/pdf';
                        } else if (['.txt'].includes(extLower)) {
                            mimetype = 'text/plain';
                        }
                        
                        const urlFriendlyDisplayName = displayName.replace(/ /g, '%20');
                        
                        const media = {
                            id: fileId,
                            user: user,
                            originalName: originalName,
                            displayName: displayName,
                            filename: itemName,
                            path: itemPath,
                            mimetype: mimetype,
                            size: stats.size,
                            sizeFormatted: formatFileSize(stats.size),
                            url: `/media/${fileId}/${urlFriendlyDisplayName}${ext}`,
                            createdAt: stats.birthtime || stats.mtime,
                            updatedAt: stats.mtime,
                            recovered: true
                        };
                        
                        mediaStore.push(media);
                        orphanedCount++;
                        console.log(`🔄 Recovered orphaned file: ${itemName} (user: ${user})`);
                    }
                }
            });
        };
        
        // Start scanning from the data directory
        scanDirectory(dataDir);
        
        if (orphanedCount > 0) {
            saveMetadata();
            console.log(`✅ Recovered ${orphanedCount} orphaned files`);
        }
    } catch (error) {
        console.error('❌ Error scanning for orphaned files:', error);
    }
};

// Initialize metadata on startup
const initializeMetadata = () => {
    console.log('🚀 Initializing media metadata...');
    loadMetadata();
    scanForOrphanedFiles();
    console.log(`📊 Total media files available: ${mediaStore.length}`);
};

// Call initialization
initializeMetadata();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Hive Storage API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

/**
 * @route   GET /api/stats
 * @desc    Get storage statistics
 * @access  Public
 */
router.get('/stats', (req, res) => {
    const totalFiles = mediaStore.length;
    const totalSize = mediaStore.reduce((sum, media) => sum + media.size, 0);
    const fileTypes = {};
    
    mediaStore.forEach(media => {
        const type = media.mimetype.split('/')[0];
        fileTypes[type] = (fileTypes[type] || 0) + 1;
    });

    res.status(200).json({
        status: 'success',
        data: {
            totalFiles,
            totalSize,
            totalSizeFormatted: formatFileSize(totalSize),
            fileTypes,
            lastUpload: mediaStore.length > 0 ? 
                mediaStore[mediaStore.length - 1].createdAt : null
        }
    });
});

/**
 * @route   POST /api/media
 * @desc    Upload a new media file
 * @access  Public
 * @param   {File} mediaFile - The file to upload
 * @param   {String} displayName - Optional custom display name
 */
router.post('/media', upload.single('mediaFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'Nenhum arquivo foi enviado.',
                error: 'NO_FILE_UPLOADED'
            });
        }

        const id = req.file.filename.split('.')[0]; // UUID part of the filename
        const displayName = req.body.displayName || req.file.originalname;
        const username = req.body.username || 'default';
        const urlFriendlyDisplayName = displayName.replace(/ /g, '%20');
        const fileExtension = path.extname(req.file.originalname);

        const media = {
            id: id,
            user: username,
            originalName: req.file.originalname,
            displayName: displayName,
            filename: req.file.filename,
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
            sizeFormatted: formatFileSize(req.file.size),
            url: `/media/${id}/${urlFriendlyDisplayName}${fileExtension}`,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        mediaStore.push(media);
        saveMetadata(); // Save metadata to file
        console.log('Media uploaded:', { id: media.id, name: media.displayName });

        res.status(201).json({
            status: 'success',
            message: 'Arquivo enviado com sucesso.',
            data: media
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro interno do servidor durante o upload.',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/users
 * @desc    Get all users (folders) with their media count
 * @access  Public
 */
router.get('/users', (req, res) => {
    try {
        const users = {};
        
        // Group media by user and count
        mediaStore.forEach(media => {
            const user = media.user || 'default';
            if (!users[user]) {
                users[user] = {
                    username: user,
                    mediaCount: 0,
                    totalSize: 0,
                    lastUpload: null
                };
            }
            users[user].mediaCount++;
            users[user].totalSize += media.size;
            
            if (!users[user].lastUpload || new Date(media.createdAt) > new Date(users[user].lastUpload)) {
                users[user].lastUpload = media.createdAt;
            }
        });
        
        // Convert to array and add formatted size
        const usersList = Object.values(users).map(user => ({
            ...user,
            totalSizeFormatted: formatFileSize(user.totalSize)
        }));
        
        res.status(200).json({
            status: 'success',
            data: usersList
        });
        
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro ao buscar usuários.',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/users/:username/media
 * @desc    Get all media files for a specific user with optional filtering and pagination
 * @access  Public
 * @param   {String} username - Username to filter by
 * @query   {String} type - Filter by file type (image, video, audio, application)
 * @query   {Number} page - Page number for pagination (default: 1)
 * @query   {Number} limit - Items per page (default: 20, max: 100)
 * @query   {String} search - Search in file names
 * @query   {String} sort - Sort by field (createdAt, name, size) (default: createdAt)
 * @query   {String} order - Sort order (asc, desc) (default: desc)
 */
router.get('/users/:username/media', (req, res) => {
    try {
        const { username } = req.params;
        let { type, page = 1, limit = 20, search, sort = 'createdAt', order = 'desc' } = req.query;
        
        // Validate and sanitize query parameters
        page = Math.max(1, parseInt(page) || 1);
        limit = Math.max(1, Math.min(100, parseInt(limit) || 20));
        
        // Filter by user first
        let filteredMedia = mediaStore.filter(media => media.user === username);

        // Filter by type
        if (type) {
            filteredMedia = filteredMedia.filter(media => 
                media.mimetype.toLowerCase().startsWith(type.toLowerCase())
            );
        }

        // Search functionality
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredMedia = filteredMedia.filter(media =>
                media.displayName.toLowerCase().includes(searchTerm) ||
                media.originalName.toLowerCase().includes(searchTerm)
            );
        }

        // Sort functionality
        filteredMedia.sort((a, b) => {
            let aValue, bValue;
            
            switch (sort) {
                case 'name':
                    aValue = a.displayName.toLowerCase();
                    bValue = b.displayName.toLowerCase();
                    break;
                case 'size':
                    aValue = a.size;
                    bValue = b.size;
                    break;
                case 'createdAt':
                default:
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                    break;
            }

            if (order === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedMedia = filteredMedia.slice(startIndex, endIndex);

        const totalItems = filteredMedia.length;
        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            status: 'success',
            data: paginatedMedia,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            user: username
        });

    } catch (error) {
        console.error('Error fetching user media:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro ao buscar arquivos de mídia do usuário.',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/media
 * @desc    Get all media files with optional filtering and pagination
 * @access  Public
 * @query   {String} type - Filter by file type (image, video, audio, application)
 * @query   {String} user - Filter by username
 * @query   {Number} page - Page number for pagination (default: 1)
 * @query   {Number} limit - Items per page (default: 20, max: 100)
 * @query   {String} search - Search in file names
 * @query   {String} sort - Sort by field (createdAt, name, size) (default: createdAt)
 * @query   {String} order - Sort order (asc, desc) (default: desc)
 */
router.get('/media', (req, res) => {
    try {
        let { type, user, page = 1, limit = 20, search, sort = 'createdAt', order = 'desc' } = req.query;
        
        // Validate and sanitize query parameters
        page = Math.max(1, parseInt(page) || 1);
        limit = Math.max(1, Math.min(100, parseInt(limit) || 20));
        
        let filteredMedia = [...mediaStore];

        // Filter by user
        if (user) {
            filteredMedia = filteredMedia.filter(media => media.user === user);
        }

        // Filter by type
        if (type) {
            filteredMedia = filteredMedia.filter(media => 
                media.mimetype.toLowerCase().startsWith(type.toLowerCase())
            );
        }

        // Search functionality
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredMedia = filteredMedia.filter(media =>
                media.displayName.toLowerCase().includes(searchTerm) ||
                media.originalName.toLowerCase().includes(searchTerm)
            );
        }

        // Sort functionality
        filteredMedia.sort((a, b) => {
            let aValue, bValue;
            
            switch (sort) {
                case 'name':
                    aValue = a.displayName.toLowerCase();
                    bValue = b.displayName.toLowerCase();
                    break;
                case 'size':
                    aValue = a.size;
                    bValue = b.size;
                    break;
                case 'createdAt':
                default:
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                    break;
            }

            if (order === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedMedia = filteredMedia.slice(startIndex, endIndex);

        const totalItems = filteredMedia.length;
        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            status: 'success',
            data: paginatedMedia,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching media:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro ao buscar arquivos de mídia.',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/media/:id
 * @desc    Get a specific media file by ID
 * @access  Public
 * @param   {String} id - Media ID (UUID)
 */
router.get('/media/:id', (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                status: 'error',
                message: 'ID de mídia inválido.',
                error: 'INVALID_UUID'
            });
        }

        const media = getMediaById(id);

        if (!media) {
            return res.status(404).json({
                status: 'error',
                message: 'Mídia não encontrada.',
                error: 'MEDIA_NOT_FOUND'
            });
        }

        res.status(200).json({
            status: 'success',
            data: media
        });

    } catch (error) {
        console.error('Error fetching media by ID:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro interno do servidor.',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/media/:id
 * @desc    Update media metadata (display name only)
 * @access  Public
 * @param   {String} id - Media ID (UUID)
 * @param   {String} displayName - New display name
 */
router.put('/media/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { displayName } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                status: 'error',
                message: 'ID de mídia inválido.',
                error: 'INVALID_UUID'
            });
        }

        if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
            return res.status(400).json({
                status: 'error',
                message: 'Nome de exibição é obrigatório.',
                error: 'INVALID_DISPLAY_NAME'
            });
        }

        const mediaIndex = mediaStore.findIndex(m => m.id === id);

        if (mediaIndex === -1) {
            return res.status(404).json({
                status: 'error',
                message: 'Mídia não encontrada.',
                error: 'MEDIA_NOT_FOUND'
            });
        }

        // Update media metadata
        const oldDisplayName = mediaStore[mediaIndex].displayName;
        mediaStore[mediaIndex].displayName = displayName.trim();
        mediaStore[mediaIndex].updatedAt = new Date();

        // Update URL with new display name
        const urlFriendlyDisplayName = displayName.trim().replace(/ /g, '%20');
        const fileExtension = path.extname(mediaStore[mediaIndex].originalName);
        mediaStore[mediaIndex].url = `/media/${id}/${urlFriendlyDisplayName}${fileExtension}`;

        saveMetadata(); // Save metadata to file
        console.log('Media updated:', { 
            id, 
            oldName: oldDisplayName, 
            newName: displayName.trim() 
        });

        res.status(200).json({
            status: 'success',
            message: 'Mídia atualizada com sucesso.',
            data: mediaStore[mediaIndex]
        });

    } catch (error) {
        console.error('Error updating media:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro interno do servidor.',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/media/:id
 * @desc    Delete a media file
 * @access  Public
 * @param   {String} id - Media ID (UUID)
 */
router.delete('/media/:id', (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                status: 'error',
                message: 'ID de mídia inválido.',
                error: 'INVALID_UUID'
            });
        }

        const mediaIndex = mediaStore.findIndex(m => m.id === id);

        if (mediaIndex === -1) {
            return res.status(404).json({
                status: 'error',
                message: 'Mídia não encontrada.',
                error: 'MEDIA_NOT_FOUND'
            });
        }

        const mediaToRemove = mediaStore[mediaIndex];

        // Delete physical file
        fs.unlink(mediaToRemove.path, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Erro ao deletar arquivo físico.',
                    error: 'FILE_DELETE_ERROR'
                });
            }

            // Remove from memory store
            mediaStore.splice(mediaIndex, 1);
            saveMetadata(); // Save metadata to file
            console.log('Media deleted:', { 
                id: mediaToRemove.id, 
                name: mediaToRemove.displayName 
            });

            res.status(200).json({
                status: 'success',
                message: 'Mídia removida com sucesso.',
                data: { id: mediaToRemove.id }
            });
        });

    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro interno do servidor.',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/media/:id/url
 * @desc    Get signed URL for a media file
 * @access  Public
 * @param   {String} id - Media ID (UUID)
 * @query   {Number} expires - Expiration time in seconds (default: 3600)
 */
router.get('/media/:id/url', (req, res) => {
    try {
        const { id } = req.params;
        const { expires = 3600 } = req.query;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                status: 'error',
                message: 'ID de mídia inválido.',
                error: 'INVALID_UUID'
            });
        }

        const media = getMediaById(id);

        if (!media) {
            return res.status(404).json({
                status: 'error',
                message: 'Mídia não encontrada.',
                error: 'MEDIA_NOT_FOUND'
            });
        }

        // For local storage, generate a simple signed URL
        const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
        const signedUrl = `${baseUrl}${media.url}`;
        const expiresAt = new Date(Date.now() + (parseInt(expires) * 1000));

        res.status(200).json({
            status: 'success',
            data: {
                signedUrl,
                expiresAt,
                expiresIn: parseInt(expires)
            }
        });

    } catch (error) {
        console.error('Error generating signed URL:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro ao gerar URL assinada.',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/media/:id/download
 * @desc    Download a media file with proper headers
 * @access  Public
 * @param   {String} id - Media ID (UUID)
 */
router.get('/media/:id/download', (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                status: 'error',
                message: 'ID de mídia inválido.',
                error: 'INVALID_UUID'
            });
        }

        const media = getMediaById(id);

        if (!media) {
            return res.status(404).json({
                status: 'error',
                message: 'Mídia não encontrada.',
                error: 'MEDIA_NOT_FOUND'
            });
        }

        if (!fs.existsSync(media.path)) {
            return res.status(404).json({
                status: 'error',
                message: 'Arquivo físico não encontrado.',
                error: 'FILE_NOT_FOUND'
            });
        }

        // Set download headers
        res.setHeader('Content-Disposition', `attachment; filename="${media.displayName}"`);
        res.setHeader('Content-Type', media.mimetype);
        res.setHeader('Content-Length', media.size);

        // Stream the file
        const fileStream = fs.createReadStream(media.path);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error downloading media:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro ao baixar arquivo.',
            error: error.message
        });
    }
});

// Export both router and mediaStore for use in main app
module.exports = {
    router,
    mediaStore
};