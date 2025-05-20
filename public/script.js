document.addEventListener('DOMContentLoaded', () => {
    const mediaFileInput = document.getElementById('mediaFile');
    const displayNameInput = document.getElementById('displayName');
    const uploadButton = document.getElementById('uploadButton');
    const uploadStatus = document.getElementById('uploadStatus');
    const mediaListDiv = document.getElementById('mediaList');

    // --- Fetch and display media ---
    async function fetchMedia() {
        try {
            const response = await fetch('/api/media');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const mediaItems = await response.json();
            renderMediaList(mediaItems);
        } catch (error) {
            console.error('Error fetching media:', error);
            mediaListDiv.innerHTML = '<p>Error loading media. Please try again.</p>';
        }
    }

    function renderMediaList(mediaItems) {
        mediaListDiv.innerHTML = ''; // Clear existing list

        if (mediaItems.length === 0) {
            mediaListDiv.innerHTML = '<p>No media files stored yet.</p>';
            return;
        }

        mediaItems.forEach(media => {
            const mediaItemDiv = document.createElement('div');
            mediaItemDiv.classList.add('media-item');
            mediaItemDiv.setAttribute('data-id', media.id);

            let previewElement;
            if (media.mimetype.startsWith('image/')) {
                previewElement = document.createElement('img');
                previewElement.src = media.url;
                previewElement.alt = media.displayName || media.originalName;
            } else if (media.mimetype.startsWith('video/')) {
                previewElement = document.createElement('video');
                previewElement.src = media.url;
                previewElement.controls = true;
            } else if (media.mimetype.startsWith('audio/')) {
                previewElement = document.createElement('audio');
                previewElement.src = media.url;
                previewElement.controls = true;
            } else {
                previewElement = document.createElement('p');
                previewElement.textContent = `📄`; // File icon
                const link = document.createElement('a');
                link.href = media.url;
                link.textContent = media.displayName || media.originalName;
                link.target = "_blank";
                previewElement.appendChild(document.createElement('br'));
                previewElement.appendChild(link);
            }

            const nameP = document.createElement('p');
            nameP.innerHTML = `<strong>Name:</strong> ${media.displayName || media.originalName}`;

            const idAndDateP = document.createElement('p');
            idAndDateP.innerHTML = `<strong>ID:</strong> ${media.id}<br><strong>Uploaded:</strong> ${new Date(media.createdAt).toLocaleString()}`;


            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('actions');

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-btn');
            deleteButton.onclick = () => deleteMedia(media.id);

            const urlButton = document.createElement('button');
            urlButton.textContent = 'Get URL';
            urlButton.classList.add('url-btn');
            urlButton.onclick = () => getSignedUrl(media.id);

            actionsDiv.appendChild(deleteButton);
            actionsDiv.appendChild(urlButton);

            mediaItemDiv.appendChild(previewElement);
            mediaItemDiv.appendChild(nameP);
            mediaItemDiv.appendChild(idAndDateP);
            mediaItemDiv.appendChild(actionsDiv);

            mediaListDiv.appendChild(mediaItemDiv);
        });
    }

    // --- Upload media ---
    uploadButton.addEventListener('click', async () => {
        const file = mediaFileInput.files[0];
        const displayName = displayNameInput.value.trim();

        if (!file) {
            uploadStatus.textContent = 'Please select a file to upload.';
            uploadStatus.style.color = 'red';
            return;
        }

        const formData = new FormData();
        formData.append('mediaFile', file);
        if (displayName) {
            formData.append('displayName', displayName);
        }

        uploadStatus.textContent = 'Uploading...';
        uploadStatus.style.color = 'orange';

        try {
            const response = await fetch('/api/media', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            uploadStatus.textContent = `Successfully uploaded: ${result.displayName || result.originalName}`;
            uploadStatus.style.color = 'green';
            mediaFileInput.value = ''; // Clear the file input
            displayNameInput.value = ''; // Clear the display name input
            fetchMedia(); // Refresh the list
        } catch (error) {
            console.error('Error uploading file:', error);
            uploadStatus.textContent = `Error: ${error.message}`;
            uploadStatus.style.color = 'red';
        }
    });

    // --- Delete media ---
    async function deleteMedia(mediaId) {
        if (!confirm('Are you sure you want to delete this media?')) {
            return;
        }
        try {
            const response = await fetch(`/api/media/${mediaId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error(`Failed to delete media: ${response.status}`);
            }
            console.log('Media deleted:', mediaId);
            fetchMedia(); // Refresh list
        } catch (error) {
            console.error('Error deleting media:', error);
            alert('Error deleting media: ' + error.message);
        }
    }

    // --- Get Signed URL ---
    async function getSignedUrl(mediaId) {
        try {
            const response = await fetch(`/api/media/${mediaId}/url`);
            if (!response.ok) {
                throw new Error(`Failed to get URL: ${response.status}`);
            }
            const data = await response.json();
            showSignedUrlModal(data.signedUrl);
        } catch (error) {
            console.error('Error getting signed URL:', error);
            alert('Error getting URL: ' + error.message);
        }
    }

    // --- Modal for Signed URL ---
    function showSignedUrlModal(url) {
        // Remove existing modal if any
        const existingModal = document.getElementById('signedUrlModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'signedUrlModal';
        modal.classList.add('modal');

        const modalContent = document.createElement('div');
        modalContent.classList.add('modal-content');

        const closeBtn = document.createElement('span');
        closeBtn.classList.add('close-btn');
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            modal.remove();
        };

        const title = document.createElement('h3');
        title.textContent = 'Media URL';

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = url;
        urlInput.readOnly = true;
        urlInput.onclick = () => { // Select text on click
            urlInput.select();
            urlInput.setSelectionRange(0, 99999); // For mobile devices
            try {
                document.execCommand('copy'); // Copy to clipboard (older method)
                alert('URL copied to clipboard!');
            } catch (err) {
                // Fallback for browsers that don't support execCommand
                // Or use Clipboard API if available and preferred
                console.warn('Could not copy URL automatically. Please copy manually.');
            }
        };


        const copyInstruction = document.createElement('p');
        copyInstruction.textContent = 'Click the URL to copy it.';
        copyInstruction.style.fontSize = '0.9em';
        copyInstruction.style.color = '#555';


        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(urlInput);
        modalContent.appendChild(copyInstruction);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        modal.style.display = 'block';

        // Close modal if user clicks outside of it
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
                modal.remove();
            }
        }
    }

    // Initial load
    fetchMedia();
});