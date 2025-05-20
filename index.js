require('dotenv').config(); // Load environment variables

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
// const slugify = require('slugify'); // Not using slugify anymore for this

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
// We will serve files through a custom route now, so direct static serving of /data is commented out.
// app.use('/data', express.static(dataDir));

// In-memory store for media metadata (can be replaced with a database later)
let mediaStore = [];

// --- API Endpoints ---

// Add media
app.post('/api/media', upload.single('mediaFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const id = req.file.filename.split('.')[0]; // UUID part of the filename
    const displayName = req.body.displayName || req.file.originalname;
    // Preserve case and replace spaces with %20 for the URL path segment
    const urlFriendlyDisplayName = displayName.replace(/ /g, '%20');
    const fileExtension = path.extname(req.file.originalname);

    const media = {
        id: id,
        originalName: req.file.originalname,
        displayName: displayName,
        filename: req.file.filename, // The actual UUID-based filename on disk (e.g., uuid.ext)
        path: req.file.path,       // Full path to the file on disk
        mimetype: req.file.mimetype,
        size: req.file.size,
        // URL format: /media/uuid/Display%20Name.extension
        url: `/media/${id}/${urlFriendlyDisplayName}${fileExtension}`,
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

// New route to serve media files using the user-friendly URL
// Example: GET /media/a1b2c3d4/My%20Cool%20Picture.jpg
// The :displayNameWithExtension part will be URL-decoded by Express automatically
app.get('/media/:mediaId/:displayNameWithExtension', (req, res) => {
    const { mediaId, displayNameWithExtension } = req.params; // mediaId is the UUID

    // We find media primarily by ID, as it's unique.
    // The displayNameWithExtension in the path is for user-friendliness and SEO,
    // but the lookup is based on the unique mediaId.
    const media = mediaStore.find(m => m.id === mediaId);

    if (media) {
        // Security check: an attacker could try to manipulate the slug to access other files
        // if we weren't careful. Here, we rely on the `media.path` which was set securely
        // during upload and is based on the UUID filename.
        if (fs.existsSync(media.path)) {
            // Optional: Set Content-Disposition to suggest original filename for download
            // res.setHeader('Content-Disposition', `inline; filename="${media.originalName}"`);
            res.sendFile(media.path);
        } else {
            console.error('File not found on disk for ID:', mediaId, media.path);
            res.status(404).send('File not found on disk.');
        }
    } else {
        console.log('Media metadata not found for ID:', mediaId);
        res.status(404).send('Media not found.');
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}. Frontend accessible at ${process.env.FRONTEND_URL || `http://localhost:${port}`}`);
});
