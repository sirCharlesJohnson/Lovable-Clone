// DOM Elements
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const results = document.getElementById('results');
const statusMessage = document.getElementById('statusMessage');
const filesSection = document.getElementById('filesSection');
const filesList = document.getElementById('filesList');
const messagesSection = document.getElementById('messagesSection');
const messagesList = document.getElementById('messagesList');
const downloadSection = document.getElementById('downloadSection');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const fileStats = document.getElementById('fileStats');

// Preview Panel Elements
const previewPanel = document.getElementById('previewPanel');
const togglePreviewBtn = document.getElementById('togglePreviewBtn');
const fileTabs = document.getElementById('fileTabs');
const fileContentContainer = document.getElementById('fileContentContainer');

// History Sidebar Elements
const historySidebar = document.getElementById('historySidebar');
const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
const toggleHistoryIcon = document.getElementById('toggleHistoryIcon');
const historyList = document.getElementById('historyList');

// Editor Modal Elements
const editorModal = document.getElementById('editorModal');
const editorTitle = document.getElementById('editorTitle');
const editorCloseBtn = document.getElementById('editorCloseBtn');
const codeEditorTextarea = document.getElementById('codeEditor');

// State
let isGenerating = false;
let currentFiles = [];
let currentGeneration = null;
let codeEditor = null;
let currentEditingFile = null;
let generationHistory = [];
const MAX_HISTORY_ITEMS = 10;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    promptInput.focus();
    loadHistory();
    initializeHistorySidebar();
    initializeEditor();
    console.log('🎉 Lovable Clone ready!');
});

// ===== GENERATE CODE =====
generateBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showError('Please enter a prompt describing what you want to build.');
        return;
    }

    if (isGenerating) {
        return;
    }

    await generateCode(prompt);
});

// Allow Enter key to submit (Shift+Enter for new line)
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateBtn.click();
    }
});

// Main generation function
async function generateCode(prompt) {
    isGenerating = true;
    setLoadingState(true);
    hideResults();

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate code');
        }

        // Save to history
        const generation = {
            id: Date.now(),
            prompt: prompt,
            timestamp: new Date().toISOString(),
            data: data,
            files: currentFiles
        };

        saveToHistory(generation);
        displayResults(data);
    } catch (error) {
        showError(error.message || 'An error occurred while generating code. Please try again.');
        console.error('Generation error:', error);
    } finally {
        isGenerating = false;
        setLoadingState(false);
    }
}

// ===== DISPLAY RESULTS =====
function displayResults(data) {
    results.style.display = 'block';
    currentFiles = [];

    // Show status message
    if (data.success) {
        statusMessage.className = 'message success';
        statusMessage.innerHTML = '<strong>✅ Success!</strong> Code generated successfully!';
    } else {
        statusMessage.className = 'message error';
        statusMessage.innerHTML = `<strong>❌ Generation Failed:</strong> ${escapeHtml(data.error || 'Unknown error')}`;
    }

    // Parse and display generated files
    if (data.filesGenerated && data.filesGenerated.length > 0) {
        parseFilesFromMessages(data.filesGenerated);

        if (currentFiles.length > 0) {
            filesSection.style.display = 'block';
            downloadSection.style.display = 'block';
            displayFilesList();
            displayFilePreviews();
            updateFileStats();
        }
    } else {
        filesSection.style.display = 'none';
        downloadSection.style.display = 'none';
    }

    // Display agent messages
    if (data.messages && data.messages.length > 0) {
        messagesSection.style.display = 'block';

        const formattedMessages = data.messages
            .filter(msg => msg && msg.trim())
            .map(msg => `<div class="message-item">${escapeHtml(msg)}</div>`)
            .join('');

        if (formattedMessages) {
            messagesList.innerHTML = formattedMessages;
        } else {
            messagesList.innerHTML = '<div class="empty-state">No messages to display</div>';
        }

        messagesList.scrollTop = messagesList.scrollHeight;
    } else {
        messagesSection.style.display = 'none';
    }
}

// Parse files from generation messages
function parseFilesFromMessages(messages) {
    currentFiles = [];

    messages.forEach(message => {
        const fileName = extractFileName(message);

        // Try to extract file content (this is a simplified version)
        // In a real implementation, you'd get actual file contents from the backend
        currentFiles.push({
            name: fileName,
            path: fileName,
            content: `// Content for ${fileName}\n// This would contain the actual generated code`,
            icon: getFileIcon(fileName),
            edited: false
        });
    });
}

// Display files list with actions
function displayFilesList() {
    filesList.innerHTML = currentFiles
        .map((file, index) => `
            <div class="file-item">
                <div class="file-item-left">
                    <span class="file-icon">${file.icon}</span>
                    <span class="file-name" title="${escapeHtml(file.path)}">${escapeHtml(file.name)}</span>
                    ${file.edited ? '<span style="color: #38ef7d; font-size: 0.8em; margin-left: 8px;">●</span>' : ''}
                </div>
                <div class="file-item-actions">
                    <button class="file-action-btn" onclick="viewFile(${index})" title="View">
                        👁️ View
                    </button>
                    <button class="file-action-btn" onclick="editFile(${index})" title="Edit">
                        ✏️ Edit
                    </button>
                    <button class="file-action-btn" onclick="copyFileContent(${index})" title="Copy">
                        📋 Copy
                    </button>
                    <button class="file-action-btn" onclick="downloadFile(${index})" title="Download">
                        💾 Save
                    </button>
                </div>
            </div>
        `)
        .join('');
}

// ===== FILE PREVIEW PANEL =====
function displayFilePreviews() {
    // Create tabs
    fileTabs.innerHTML = currentFiles
        .map((file, index) => `
            <div class="file-tab ${index === 0 ? 'active' : ''}" data-index="${index}" onclick="switchFileTab(${index})">
                <span>${file.icon}</span>
                <span>${escapeHtml(file.name)}</span>
            </div>
        `)
        .join('');

    // Create content sections
    fileContentContainer.innerHTML = currentFiles
        .map((file, index) => {
            const language = getLanguageFromFileName(file.name);
            const highlightedCode = highlightCode(file.content, language);

            return `
                <div class="file-content ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-filename">${escapeHtml(file.path)}</span>
                            <div class="code-actions">
                                <button class="code-btn" onclick="copyFileContent(${index})">📋 Copy</button>
                                <button class="code-btn" onclick="editFile(${index})">✏️ Edit</button>
                                <button class="code-btn" onclick="downloadFile(${index})">💾 Download</button>
                            </div>
                        </div>
                        <pre class="code-pre"><code class="language-${language}">${highlightedCode}</code></pre>
                    </div>
                </div>
            `;
        })
        .join('');

    // Apply syntax highlighting
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
}

function switchFileTab(index) {
    // Update tabs
    document.querySelectorAll('.file-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });

    // Update content
    document.querySelectorAll('.file-content').forEach((content, i) => {
        content.classList.toggle('active', i === index);
    });
}

// Toggle preview panel
togglePreviewBtn.addEventListener('click', () => {
    previewPanel.classList.toggle('collapsed');
    const icon = togglePreviewBtn.querySelector('span');
    icon.textContent = previewPanel.classList.contains('collapsed') ? '◀' : '▶';
});

// ===== FILE ACTIONS =====
window.viewFile = function(index) {
    switchFileTab(index);

    // Scroll preview panel into view on mobile
    if (window.innerWidth <= 1400) {
        previewPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};

window.editFile = function(index) {
    const file = currentFiles[index];
    currentEditingFile = index;

    editorTitle.textContent = `Edit ${file.name}`;
    editorModal.classList.add('active');

    // Initialize or update CodeMirror
    if (codeEditor) {
        codeEditor.setValue(file.content);
        codeEditor.refresh();
    } else {
        initializeEditor();
        codeEditor.setValue(file.content);
    }

    // Set mode based on file type
    const mode = getCodeMirrorMode(file.name);
    codeEditor.setOption('mode', mode);
};

window.copyFileContent = async function(index) {
    const file = currentFiles[index];

    try {
        await navigator.clipboard.writeText(file.content);
        showToast('✅ Copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('❌ Failed to copy');
    }
};

window.downloadFile = function(index) {
    const file = currentFiles[index];
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`✅ Downloaded ${file.name}`);
};

// ===== DOWNLOAD ALL FILES =====
downloadAllBtn.addEventListener('click', async () => {
    if (typeof JSZip === 'undefined') {
        showToast('❌ JSZip library not loaded');
        return;
    }

    try {
        const zip = new JSZip();

        currentFiles.forEach(file => {
            zip.file(file.path, file.content);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated-code.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('✅ Downloaded all files as ZIP!');
    } catch (err) {
        console.error('Failed to create zip:', err);
        showToast('❌ Failed to create ZIP file');
    }
});

function updateFileStats() {
    const fileCount = currentFiles.length;
    const totalSize = currentFiles.reduce((sum, file) => sum + file.content.length, 0);
    const sizeKB = (totalSize / 1024).toFixed(2);

    fileStats.innerHTML = `<strong>${fileCount}</strong> file${fileCount !== 1 ? 's' : ''} • <strong>${sizeKB} KB</strong>`;
}

// ===== CODE EDITOR (CodeMirror) =====
function initializeEditor() {
    if (typeof CodeMirror === 'undefined') {
        console.error('CodeMirror not loaded');
        return;
    }

    codeEditor = CodeMirror.fromTextArea(codeEditorTextarea, {
        lineNumbers: true,
        mode: 'javascript',
        theme: 'monokai',
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        styleActiveLine: true
    });
}

editorCloseBtn.addEventListener('click', () => {
    if (currentEditingFile !== null && codeEditor) {
        const newContent = codeEditor.getValue();
        const file = currentFiles[currentEditingFile];

        if (newContent !== file.content) {
            file.content = newContent;
            file.edited = true;

            // Update displays
            displayFilesList();
            displayFilePreviews();

            showToast('✅ Changes saved!');
        }
    }

    editorModal.classList.remove('active');
    currentEditingFile = null;
});

// Close modal on background click
editorModal.addEventListener('click', (e) => {
    if (e.target === editorModal) {
        editorCloseBtn.click();
    }
});

// ===== PROJECT HISTORY =====
function loadHistory() {
    try {
        const stored = localStorage.getItem('lovable_history');
        if (stored) {
            generationHistory = JSON.parse(stored);
        }
    } catch (err) {
        console.error('Failed to load history:', err);
        generationHistory = [];
    }

    updateHistoryDisplay();
}

function saveToHistory(generation) {
    generationHistory.unshift(generation);

    // Keep only last 10
    if (generationHistory.length > MAX_HISTORY_ITEMS) {
        generationHistory = generationHistory.slice(0, MAX_HISTORY_ITEMS);
    }

    try {
        localStorage.setItem('lovable_history', JSON.stringify(generationHistory));
    } catch (err) {
        console.error('Failed to save history:', err);
    }

    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    if (generationHistory.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No history yet</div>';
        return;
    }

    historyList.innerHTML = generationHistory
        .map((gen, index) => {
            const date = new Date(gen.timestamp);
            const timeAgo = formatTimeAgo(date);
            const fileCount = gen.data?.filesGenerated?.length || 0;

            return `
                <div class="history-item ${index === 0 ? 'active' : ''}" onclick="restoreGeneration(${gen.id})">
                    <div class="history-item-content">
                        <div class="history-item-header">
                            <div class="history-item-prompt">${escapeHtml(gen.prompt)}</div>
                            <button class="history-item-delete" onclick="deleteHistoryItem(event, ${gen.id})" title="Delete">
                                ×
                            </button>
                        </div>
                        <div class="history-item-time">${timeAgo}</div>
                        <div class="history-item-files">📁 ${fileCount} file${fileCount !== 1 ? 's' : ''}</div>
                    </div>
                </div>
            `;
        })
        .join('');
}

window.restoreGeneration = function(id) {
    const generation = generationHistory.find(gen => gen.id === id);
    if (!generation) return;

    promptInput.value = generation.prompt;
    displayResults(generation.data);

    // Update active state
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    showToast('✅ Restored from history');
};

window.deleteHistoryItem = function(event, id) {
    event.stopPropagation();

    if (!confirm('Delete this history item?')) return;

    generationHistory = generationHistory.filter(gen => gen.id !== id);

    try {
        localStorage.setItem('lovable_history', JSON.stringify(generationHistory));
    } catch (err) {
        console.error('Failed to save history:', err);
    }

    updateHistoryDisplay();
    showToast('✅ History item deleted');
};

// Toggle history sidebar
function initializeHistorySidebar() {
    toggleHistoryBtn.addEventListener('click', () => {
        historySidebar.classList.toggle('collapsed');
        toggleHistoryIcon.textContent = historySidebar.classList.contains('collapsed') ? '▶' : '◀';
    });
}

// ===== UTILITY FUNCTIONS =====
function setLoadingState(loading) {
    generateBtn.disabled = loading;

    if (loading) {
        generateBtn.innerHTML = '<span class="spinner"></span>';
        generateBtn.style.opacity = '0.6';
    } else {
        generateBtn.innerHTML = '<span>↑</span>';
        generateBtn.style.opacity = '1';
    }
}

function hideResults() {
    results.style.display = 'none';
    filesSection.style.display = 'none';
    messagesSection.style.display = 'none';
    downloadSection.style.display = 'none';
}

function showError(message) {
    results.style.display = 'block';
    statusMessage.className = 'message error';
    statusMessage.innerHTML = `<strong>❌ Error:</strong> ${escapeHtml(message)}`;
    filesSection.style.display = 'none';
    messagesSection.style.display = 'none';
    downloadSection.style.display = 'none';
}

function extractFileName(message) {
    const patterns = [
        /Writing (?:to )?(.+)/,
        /Editing (.+)/,
        /Created (.+)/,
        /File: (.+)/,
        /Path: (.+)/,
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    return message;
}

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();

    const icons = {
        'js': '📜',
        'ts': '📘',
        'jsx': '⚛️',
        'tsx': '⚛️',
        'html': '🌐',
        'css': '🎨',
        'scss': '🎨',
        'sass': '🎨',
        'json': '📋',
        'md': '📝',
        'py': '🐍',
        'java': '☕',
        'cpp': '⚙️',
        'c': '⚙️',
        'go': '🐹',
        'rs': '🦀',
        'php': '🐘',
        'rb': '💎',
        'swift': '🦅',
        'kt': '🎯',
        'sql': '🗄️',
        'sh': '🐚',
        'yaml': '📄',
        'yml': '📄',
        'xml': '📄',
        'txt': '📄',
    };

    return icons[ext] || '📄';
}

function getLanguageFromFileName(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();

    const languageMap = {
        'js': 'javascript',
        'jsx': 'jsx',
        'ts': 'typescript',
        'tsx': 'tsx',
        'html': 'markup',
        'css': 'css',
        'scss': 'scss',
        'json': 'json',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'go': 'go',
        'rs': 'rust',
        'php': 'php',
        'rb': 'ruby',
        'swift': 'swift',
        'kt': 'kotlin',
        'sql': 'sql',
        'sh': 'bash',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'md': 'markdown',
    };

    return languageMap[ext] || 'plaintext';
}

function getCodeMirrorMode(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();

    const modeMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'javascript',
        'tsx': 'javascript',
        'html': 'htmlmixed',
        'css': 'css',
        'scss': 'css',
        'json': 'javascript',
        'py': 'python',
        'xml': 'xml',
        'md': 'markdown',
    };

    return modeMap[ext] || 'javascript';
}

function highlightCode(code, language) {
    if (typeof Prism === 'undefined') {
        return escapeHtml(code);
    }

    try {
        const grammar = Prism.languages[language];
        if (grammar) {
            return Prism.highlight(code, grammar, language);
        }
    } catch (err) {
        console.error('Syntax highlighting error:', err);
    }

    return escapeHtml(code);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}

function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: rgba(20, 20, 20, 0.95);
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(20px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        animation: slideInUp 0.3s ease-out;
        font-size: 0.95em;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutDown 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes slideOutDown {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(20px);
        }
    }
`;
document.head.appendChild(style);
