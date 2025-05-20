require('dotenv').config(); // Load environment variables

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; // Use port from .env or default to 3000

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, dataDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4();
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware to serve static files (for frontend)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(dataDir)); // Serve media files

// In-memory store for media metadata (can be replaced with a database later)
let mediaStore = [];

// --- API Endpoints ---

// Add media
app.post('/api/media', upload.single('mediaFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const media = {
        id: req.file.filename.split('.')[0], // Use the unique part of the filename as ID
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/data/${req.file.filename}`, // URL to access the media
        createdAt: new Date()
    };
    mediaStore.push(media);
    console.log('Media added:', media);
    res.status(201).json(media);
});

// List media
app.get('/api/media', (req, res) => {
    res.json(mediaStore);
});

// Remove media
app.delete('/api/media/:id', (req, res) => {
    const mediaId = req.params.id;
    const mediaIndex = mediaStore.findIndex(m => m.id === mediaId);

    if (mediaIndex === -1) {
        return res.status(404).send('Media not found.');
    }

    const mediaToRemove = mediaStore[mediaIndex];

    fs.unlink(mediaToRemove.path, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).send('Error deleting media file.');
        }
        mediaStore.splice(mediaIndex, 1);
        console.log('Media removed:', mediaToRemove);
        res.status(200).send('Media removed successfully.');
    });
});

// Generate "signed" URL (for now, just a direct URL)
// In a real-world scenario with cloud storage, this would generate a pre-signed URL.
app.get('/api/media/:id/url', (req, res) => {
    const mediaId = req.params.id;
    const media = mediaStore.find(m => m.id === mediaId);

    if (!media) {
        return res.status(404).send('Media not found.');
    }
    // For local storage, the "signed" URL is just the direct access URL.
    // Add a dummy token for demonstration if needed, or just return the direct URL.
    const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    res.json({ signedUrl: `${baseUrl}${media.url}` });
});


app.listen(port, () => {
    console.log(`Server running on port ${port}. Frontend accessible at ${process.env.FRONTEND_URL || `http://localhost:${port}`}`);
});