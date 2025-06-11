document.addEventListener('DOMContentLoaded', function() {
    // Authentication elements
    const authModal = document.getElementById('authModal');
    const authButton = document.getElementById('authButton');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const authError = document.getElementById('authError');
    const mainApp = document.getElementById('mainApp');
    
    // Main app elements
    const mediaFileInput = document.getElementById('mediaFile');
    const displayNameInput = document.getElementById('displayName');
    const usernameInput = document.getElementById('username');
    const uploadButton = document.getElementById('uploadButton');
    const uploadStatus = document.getElementById('uploadStatus');
    const mediaListDiv = document.getElementById('mediaList');
    const usersListDiv = document.getElementById('usersList');
    const uploadArea = document.getElementById('uploadArea');
    const emptyState = document.getElementById('emptyState');
    const usersEmptyState = document.getElementById('usersEmptyState');
    const usersSection = document.getElementById('usersSection');
    const mediaSection = document.getElementById('mediaSection');
    const backToUsersBtn = document.getElementById('backToUsers');
    const mediaSectionTitle = document.getElementById('mediaSectionTitle');
    
    let currentView = 'users'; // 'users' or 'media'
    let currentUser = null;
    let apiKey = null;
    
    // Check if user is already authenticated
    const storedApiKey = localStorage.getItem('hive_api_key');
    if (storedApiKey) {
        apiKey = storedApiKey;
        showMainApp();
    } else {
        showAuthModal();
    }
    
    // Authentication functions
    function showAuthModal() {
        authModal.style.display = 'flex';
        mainApp.style.display = 'none';
        apiKeyInput.focus();
    }
    
    function showMainApp() {
        authModal.style.display = 'none';
        mainApp.style.display = 'block';
        showUsersView();
    }
    
    function showAuthError(message) {
        authError.textContent = message;
        authError.classList.add('show');
        setTimeout(() => {
            authError.classList.remove('show');
        }, 5000);
    }
    
    // Authentication event listeners
    authButton.addEventListener('click', authenticateUser);
    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            authenticateUser();
        }
    });
    
    async function authenticateUser() {
        const inputApiKey = apiKeyInput.value.trim();
        
        if (!inputApiKey) {
            showAuthError('Por favor, digite sua API Key');
            return;
        }
        
        // Update button state
        authButton.disabled = true;
        authButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        
        try {
             // Test the API key with the users endpoint
             const response = await fetch('/api/users', {
                 headers: {
                     'x-api-key': inputApiKey
                 }
             });
            
            if (response.ok) {
                // API key is valid
                apiKey = inputApiKey;
                localStorage.setItem('hive_api_key', apiKey);
                apiKeyInput.value = '';
                showMainApp();
            } else if (response.status === 401 || response.status === 403) {
                showAuthError('API Key inválida. Verifique e tente novamente.');
            } else {
                showAuthError('Erro ao verificar API Key. Tente novamente.');
            }
        } catch (error) {
            console.error('Authentication error:', error);
            showAuthError('Erro de conexão. Verifique sua internet e tente novamente.');
        } finally {
            // Reset button state
            authButton.disabled = false;
            authButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Entrar</span>';
        }
    }
    
    // Function to get headers with API key
    function getAuthHeaders() {
        return {
            'x-api-key': apiKey
        };
    }
    
    // Add logout functionality (optional)
    function logout() {
        localStorage.removeItem('hive_api_key');
        apiKey = null;
        showAuthModal();
    }
    
    // Add logout button to header (you can uncomment this if you want a logout button)
    // const header = document.querySelector('.header .container');
    // const logoutBtn = document.createElement('button');
    // logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sair';
    // logoutBtn.className = 'btn btn-secondary';
    // logoutBtn.style.position = 'absolute';
    // logoutBtn.style.top = '1rem';
    // logoutBtn.style.right = '1rem';
    // logoutBtn.addEventListener('click', logout);
    // header.appendChild(logoutBtn);

    // --- Drag & Drop functionality ---
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            mediaFileInput.files = files;
            // Trigger visual feedback
            updateFileSelectedState(files[0]);
        }
    });

    // File input change handler
    mediaFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            updateFileSelectedState(e.target.files[0]);
        }
    });

    function updateFileSelectedState(file) {
        const uploadText = uploadArea.querySelector('.upload-text');
        if (file) {
            uploadText.innerHTML = `Arquivo selecionado: <strong>${file.name}</strong><br><span class="upload-link">Clique para alterar</span>`;
            uploadArea.style.borderColor = 'var(--success-color)';
        }
    }

    // --- Navigation functions ---
    function showUsersView() {
        currentView = 'users';
        currentUser = null;
        usersSection.style.display = 'block';
        mediaSection.style.display = 'none';
        backToUsersBtn.style.display = 'none';
        fetchUsers();
    }
    
    function showMediaView(username) {
        currentView = 'media';
        currentUser = username;
        usersSection.style.display = 'none';
        mediaSection.style.display = 'block';
        backToUsersBtn.style.display = 'inline-flex';
        mediaSectionTitle.textContent = `Mídias de ${username}`;
        fetchUserMedia(username);
    }
    
    // Back button functionality
    backToUsersBtn.addEventListener('click', showUsersView);

    // --- Fetch and display users ---
    async function fetchUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    logout();
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            
            if (result.status === 'success') {
                renderUsersList(result.data);
            } else {
                throw new Error(result.message || 'Erro ao carregar usuários');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            showUsersEmptyState('Erro ao carregar usuários. Tente novamente.');
        }
    }
    
    function renderUsersList(users) {
        usersListDiv.innerHTML = '';
        
        if (users.length === 0) {
            showUsersEmptyState();
            return;
        }
        
        hideUsersEmptyState();
        
        users.forEach((user, index) => {
            const userCard = document.createElement('div');
            userCard.classList.add('user-card');
            userCard.setAttribute('data-username', user.username);
            userCard.style.animationDelay = `${index * 0.1}s`;
            
            const lastUploadDate = user.lastUpload ? 
                new Date(user.lastUpload).toLocaleDateString('pt-BR') : 
                'Nunca';
            
            userCard.innerHTML = `
                <div class="user-icon">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="user-name">${user.username}</div>
                <div class="user-stats">
                    <strong>Arquivos:</strong> ${user.mediaCount}<br>
                    <strong>Tamanho:</strong> ${user.totalSizeFormatted}<br>
                    <strong>Último upload:</strong> ${lastUploadDate}
                </div>
            `;
            
            userCard.addEventListener('click', () => {
                showMediaView(user.username);
            });
            
            usersListDiv.appendChild(userCard);
        });
    }
    
    function showUsersEmptyState(customMessage = null) {
        usersEmptyState.style.display = 'block';
        usersListDiv.style.display = 'none';
        if (customMessage) {
            usersEmptyState.querySelector('p').textContent = customMessage;
        }
    }
    
    function hideUsersEmptyState() {
        usersEmptyState.style.display = 'none';
        usersListDiv.style.display = 'grid';
    }

    // --- Fetch and display user media ---
    async function fetchUserMedia(username) {
        try {
            const response = await fetch(`/api/users/${encodeURIComponent(username)}/media`, {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    logout();
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            
            if (result.status === 'success') {
                renderMediaList(result.data);
            } else {
                throw new Error(result.message || 'Erro ao carregar mídias do usuário');
            }
        } catch (error) {
            console.error('Error fetching user media:', error);
            showEmptyState('Erro ao carregar mídias. Tente novamente.');
        }
    }

    function renderMediaList(mediaItems) {
        mediaListDiv.innerHTML = ''; // Clear existing list
        
        if (mediaItems.length === 0) {
            showEmptyState();
            return;
        }

        hideEmptyState();

        mediaItems.forEach((media, index) => {
            const mediaItemDiv = document.createElement('div');
            mediaItemDiv.classList.add('media-item');
            mediaItemDiv.setAttribute('data-id', media.id);
            
            // Add animation delay for staggered appearance
            mediaItemDiv.style.animationDelay = `${index * 0.1}s`;

            // Media preview container
            const previewDiv = document.createElement('div');
            previewDiv.classList.add('media-preview');

            let previewElement;
            if (media.mimetype.startsWith('image/')) {
                previewElement = document.createElement('img');
                previewElement.src = media.url;
                previewElement.alt = media.displayName || media.originalName;
                previewElement.loading = 'lazy';
            } else if (media.mimetype.startsWith('video/')) {
                previewElement = document.createElement('video');
                previewElement.src = media.url;
                previewElement.controls = true;
                previewElement.preload = 'metadata';
            } else if (media.mimetype.startsWith('audio/')) {
                previewElement = document.createElement('audio');
                previewElement.src = media.url;
                previewElement.controls = true;
                previewElement.preload = 'metadata';
            } else {
                previewElement = document.createElement('div');
                previewElement.innerHTML = '<i class="fas fa-file-alt file-icon"></i>';
                previewElement.style.display = 'flex';
                previewElement.style.alignItems = 'center';
                previewElement.style.justifyContent = 'center';
                previewElement.style.height = '100%';
            }

            previewDiv.appendChild(previewElement);

            // Media info container
            const infoDiv = document.createElement('div');
            infoDiv.classList.add('media-info');

            const nameDiv = document.createElement('div');
            nameDiv.classList.add('media-name');
            nameDiv.textContent = media.displayName || media.originalName;

            const detailsDiv = document.createElement('div');
            detailsDiv.classList.add('media-details');
            detailsDiv.innerHTML = `
                <strong>ID:</strong> ${media.id}<br>
                <strong>Tipo:</strong> ${media.mimetype}<br>
                <strong>Data:</strong> ${new Date(media.createdAt).toLocaleDateString('pt-BR')}
            `;

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('media-actions');

            const urlButton = document.createElement('button');
            urlButton.innerHTML = '<i class="fas fa-link"></i> URL';
            urlButton.classList.add('btn', 'btn-success');
            urlButton.onclick = () => getSignedUrl(media.id);

            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i> Excluir';
            deleteButton.classList.add('btn', 'btn-danger');
            deleteButton.onclick = () => deleteMedia(media.id);

            actionsDiv.appendChild(urlButton);
            actionsDiv.appendChild(deleteButton);

            infoDiv.appendChild(nameDiv);
            infoDiv.appendChild(detailsDiv);
            infoDiv.appendChild(actionsDiv);

            mediaItemDiv.appendChild(previewDiv);
            mediaItemDiv.appendChild(infoDiv);

            mediaListDiv.appendChild(mediaItemDiv);
        });
    }

    function showEmptyState(customMessage = null) {
        emptyState.style.display = 'block';
        mediaListDiv.style.display = 'none';
        if (customMessage) {
            emptyState.querySelector('p').textContent = customMessage;
        }
    }

    function hideEmptyState() {
        emptyState.style.display = 'none';
        mediaListDiv.style.display = 'grid';
    }

    // --- Upload media ---
    uploadButton.addEventListener('click', async () => {
        const file = mediaFileInput.files[0];
        const displayName = displayNameInput.value.trim();
        const username = usernameInput.value.trim();

        if (!file) {
            showUploadStatus('Por favor, selecione um arquivo para upload.', 'error');
            return;
        }
        
        if (!username) {
            showUploadStatus('Por favor, insira um nome de usuário.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('mediaFile', file);
        formData.append('username', username);
        if (displayName) {
            formData.append('displayName', displayName);
        }

        // Update UI state
        uploadButton.disabled = true;
        uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fazendo Upload...';
        showUploadStatus('Fazendo upload...', 'loading');

        try {
            const response = await fetch('/api/media', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    logout();
                    return;
                }
                throw new Error(result.message || `Upload falhou: ${response.status}`);
            }
            
            if (result.status !== 'success') {
                throw new Error(result.message || 'Upload falhou');
            }

            showUploadStatus(result.message || `Upload realizado com sucesso: ${result.data.displayName || result.data.originalName}`, 'success');
            
            // Reset form
            mediaFileInput.value = '';
            displayNameInput.value = '';
            usernameInput.value = '';
            resetUploadArea();
            
            // Refresh the appropriate view
            if (currentView === 'users') {
                fetchUsers();
            } else if (currentView === 'media' && currentUser === username) {
                fetchUserMedia(currentUser);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            showUploadStatus(`Erro: ${error.message}`, 'error');
        } finally {
            // Reset button state
            uploadButton.disabled = false;
            uploadButton.innerHTML = '<i class="fas fa-upload"></i> <span>Fazer Upload</span>';
        }
    });

    function showUploadStatus(message, type) {
        uploadStatus.textContent = message;
        uploadStatus.className = `upload-status show ${type}`;
        
        // Auto hide after 5 seconds for success/error messages
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                uploadStatus.classList.remove('show');
            }, 5000);
        }
    }

    function resetUploadArea() {
        const uploadText = uploadArea.querySelector('.upload-text');
        uploadText.innerHTML = 'Arraste e solte seus arquivos aqui ou <span class="upload-link">clique para selecionar</span>';
        uploadArea.style.borderColor = '';
    }

    // --- Delete media ---
    async function deleteMedia(mediaId) {
        if (!confirm('Tem certeza que deseja excluir esta mídia?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/media/${mediaId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    logout();
                    return;
                }
                throw new Error(result.message || `Falha ao excluir mídia: ${response.status}`);
            }
            
            if (result.status !== 'success') {
                throw new Error(result.message || 'Falha ao excluir mídia');
            }
            
            console.log('Media deleted:', mediaId);
            
            // Add fade out animation to the item
            const mediaItem = document.querySelector(`[data-id="${mediaId}"]`);
            if (mediaItem) {
                mediaItem.style.transition = 'all 0.3s ease';
                mediaItem.style.opacity = '0';
                mediaItem.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    // Refresh the appropriate view
                    if (currentView === 'users') {
                        fetchUsers();
                    } else if (currentView === 'media' && currentUser) {
                        fetchUserMedia(currentUser);
                    }
                }, 300);
            }
        } catch (error) {
            console.error('Error deleting media:', error);
            alert('Erro ao excluir mídia: ' + error.message);
        }
    }

    // --- Get Signed URL ---
    async function getSignedUrl(mediaId) {
        try {
            const response = await fetch(`/api/media/${mediaId}/url`, {
                headers: getAuthHeaders()
            });
            const result = await response.json();
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    logout();
                    return;
                }
                throw new Error(result.message || `Falha ao obter URL: ${response.status}`);
            }
            
            if (result.status !== 'success') {
                throw new Error(result.message || 'Falha ao obter URL');
            }
            
            showSignedUrlModal(result.data.signedUrl);
        } catch (error) {
            console.error('Error getting signed URL:', error);
            alert('Erro ao obter URL: ' + error.message);
        }
    }

    // --- Modal for Signed URL ---
    function showSignedUrlModal(url) {
        const modal = document.getElementById('urlModal');
        const signedUrlInput = document.getElementById('signedUrl');
        const copyBtn = document.getElementById('copyUrlBtn');
        const closeBtn = document.getElementById('closeModal');

        signedUrlInput.value = url;
        modal.style.display = 'block';
        
        // Add show class for animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Copy URL functionality
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(url);
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                copyBtn.style.background = 'var(--success-color)';
                
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar URL';
                    copyBtn.style.background = '';
                }, 2000);
            } catch (err) {
                // Fallback for older browsers
                signedUrlInput.select();
                signedUrlInput.setSelectionRange(0, 99999);
                try {
                    document.execCommand('copy');
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                    copyBtn.style.background = 'var(--success-color)';
                } catch (e) {
                    alert('Não foi possível copiar automaticamente. Por favor, copie manualmente.');
                }
            }
        };

        // Close modal functionality
        function closeModal() {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }

        closeBtn.onclick = closeModal;

        // Close modal if user clicks outside of it
        modal.onclick = function(event) {
            if (event.target === modal) {
                closeModal();
            }
        };

        // Close modal with ESC key
        document.addEventListener('keydown', function escKeyHandler(event) {
            if (event.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escKeyHandler);
            }
        });
    }

    // Initial load
    showUsersView();
});