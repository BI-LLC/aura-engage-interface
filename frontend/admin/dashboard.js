// Admin Dashboard Handler
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!localStorage.getItem('aura_token')) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize dashboard
    initializeDashboard();
});

async function initializeDashboard() {
    // Load system status
    await refreshStatus();
    
    // Load documents
    await loadDocuments();
    
    // Setup event listeners
    setupEventListeners();
    
    // Auto-refresh status every 30 seconds
    setInterval(refreshStatus, 30000);
}

function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async function() {
        await AuraAPI.logout();
        window.location.href = 'index.html';
    });

    // File upload area
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    // Click to upload
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', handleFileUpload);

    // Drag and drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });
}

async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

async function handleFiles(files) {
    if (files.length === 0) return;

    showToast('Uploading files...', 'info');

    for (const file of files) {
        try {
            await AuraAPI.uploadDocument(file);
            showToast(`✅ ${file.name} uploaded successfully!`, 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showToast(`❌ Failed to upload ${file.name}`, 'error');
        }
    }

    // Reload documents
    await loadDocuments();
}

async function loadDocuments() {
    const fileList = document.getElementById('fileList');
    
    try {
        const documents = await AuraAPI.getDocuments();
        
        if (documents.length === 0) {
            fileList.innerHTML = '<div class="empty-state">No documents uploaded yet</div>';
            return;
        }

        fileList.innerHTML = documents.map(doc => `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-name">${doc.filename}</div>
                    <div class="file-meta">${formatFileSize(doc.size)} • ${formatDate(doc.uploaded_at)}</div>
                </div>
                <div class="file-actions">
                    <button class="btn-delete" onclick="deleteDocument(${doc.id})">Delete</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading documents:', error);
        fileList.innerHTML = '<div class="error">Failed to load documents</div>';
    }
}

async function deleteDocument(fileId) {
    if (!confirm('Are you sure you want to delete this document?')) {
        return;
    }

    try {
        await AuraAPI.deleteDocument(fileId);
        showToast('Document deleted successfully!', 'success');
        await loadDocuments();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete document', 'error');
    }
}

async function refreshStatus() {
    try {
        const status = await AuraAPI.getSystemStatus();
        
        document.getElementById('backendStatus').textContent = status.backend ? 'Online' : 'Offline';
        document.getElementById('voiceStatus').textContent = status.voice ? 'Active' : 'Inactive';
        document.getElementById('activeCalls').textContent = status.active_calls || 0;

        // Update status icons
        const backendIcon = document.querySelector('.status-card:nth-child(1) .status-icon');
        const voiceIcon = document.querySelector('.status-card:nth-child(2) .status-icon');
        
        backendIcon.textContent = status.backend ? '🟢' : '🔴';
        voiceIcon.textContent = status.voice ? '🎤' : '🔇';

    } catch (error) {
        console.error('Status error:', error);
        document.getElementById('backendStatus').textContent = 'Error';
        document.getElementById('voiceStatus').textContent = 'Error';
    }
}

// Quick action functions
async function testVoiceCall() {
    showToast('Opening voice call test...', 'info');
    window.open('../widget/index.html', '_blank');
}

function exportData() {
    showToast('Export feature coming soon!', 'info');
}

// Utility functions
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}
