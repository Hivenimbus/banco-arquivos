require('dotenv').config(); // Load environment variables

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import API routes
const { router: apiRouter, mediaStore } = require('./routes/api');

const app = express();
const port = process.env.PORT || 3000;

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Create routes directory if it doesn't exist
const routesDir = path.join(__dirname, 'routes');
if (!fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir);
}

// CORS Configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to serve static files (for frontend)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRouter);

// Route to serve media files using the user-friendly URL
// Example: GET /media/a1b2c3d4/My%20Cool%20Picture.jpg
app.get('/media/:mediaId/:displayNameWithExtension', (req, res) => {
    const { mediaId, displayNameWithExtension } = req.params;

    // Find media primarily by ID
    const media = mediaStore.find(m => m.id === mediaId);

    if (media) {
        // Security check: verify file exists and serve it
        if (fs.existsSync(media.path)) {
            // Set appropriate headers for media serving
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
            res.setHeader('Content-Type', media.mimetype);
            
            // Optional: Set Content-Disposition for download suggestion
            // res.setHeader('Content-Disposition', `inline; filename="${media.originalName}"`);
            
            res.sendFile(path.resolve(media.path));
        } else {
            console.error('File not found on disk for ID:', mediaId, media.path);
            res.status(404).json({
                status: 'error',
                message: 'Arquivo não encontrado no disco.',
                error: 'FILE_NOT_FOUND'
            });
        }
    } else {
        console.log('Media metadata not found for ID:', mediaId);
        res.status(404).json({
            status: 'error',
            message: 'Mídia não encontrada.',
            error: 'MEDIA_NOT_FOUND'
        });
    }
});

// Root route - serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint da API não encontrado.',
        error: 'ENDPOINT_NOT_FOUND',
        availableEndpoints: [
            'GET /api/health',
            'GET /api/stats',
            'GET /api/users',
            'GET /api/users/:username/media',
            'GET /api/media',
            'POST /api/media',
            'GET /api/media/:id',
            'PUT /api/media/:id',
            'DELETE /api/media/:id',
            'GET /api/media/:id/url',
            'GET /api/media/:id/download'
        ]
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor.',
        error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_SERVER_ERROR'
    });
});

// Start server
app.listen(port, () => {
    const baseUrl = process.env.FRONTEND_URL || `http://localhost:${port}`;
    console.log('🚀 Hive Storage Server Started!');
    console.log(`📱 Frontend: ${baseUrl}`);
    console.log(`🔗 API Base URL: ${baseUrl}/api`);
    console.log(`📚 API Documentation: Available in API_DOCUMENTATION.md`);
    console.log(`🏥 Health Check: ${baseUrl}/api/health`);
    console.log(`📊 Stats: ${baseUrl}/api/stats`);
    console.log('');
    console.log('📋 Available API Endpoints:');
    console.log('  GET    /api/health          - Health check');
    console.log('  GET    /api/stats           - Storage statistics');
    console.log('  GET    /api/users           - List all users/folders');
    console.log('  GET    /api/users/:username/media - List user media');
    console.log('  GET    /api/media           - List all media (with filters)');
    console.log('  POST   /api/media           - Upload new media');
    console.log('  GET    /api/media/:id       - Get specific media');
    console.log('  PUT    /api/media/:id       - Update media name');
    console.log('  DELETE /api/media/:id       - Delete media');
    console.log('  GET    /api/media/:id/url   - Get signed URL');
    console.log('  GET    /api/media/:id/download - Download media');
    console.log('');
});
