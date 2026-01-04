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
const copyAllBtn = document.getElementById('copyAllBtn');
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
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// Editor Modal Elements
const editorModal = document.getElementById('editorModal');
const editorTitle = document.getElementById('editorTitle');
const editorCloseBtn = document.getElementById('editorCloseBtn');
const editorSaveBtn = document.getElementById('editorSaveBtn');
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
    setupKeyboardShortcuts();

    // Show welcome screen if no history
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (generationHistory.length === 0 && welcomeScreen) {
        welcomeScreen.style.display = 'block';
    }

    console.log('🎉 Lovable Clone ready!');
});

// ===== KEYBOARD SHORTCUTS =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + K to focus prompt
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            promptInput.focus();
            promptInput.select();
        }

        // Escape to close editor
        if (e.key === 'Escape' && editorModal.classList.contains('active')) {
            editorCloseBtn.click();
        }

        // Cmd/Ctrl + S to save in editor
        if ((e.metaKey || e.ctrlKey) && e.key === 's' && editorModal.classList.contains('active')) {
            e.preventDefault();
            editorSaveBtn.click();
        }
    });
}

// ===== GENERATE CODE =====
generateBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showError('Please enter a prompt describing what you want to build.');
        promptInput.focus();
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

    // Show loading message
    results.style.display = 'block';
    statusMessage.className = 'message';
    statusMessage.style.background = 'rgba(91, 123, 180, 0.2)';
    statusMessage.style.borderColor = 'rgba(91, 123, 180, 0.3)';
    statusMessage.innerHTML = '<span class="spinner"></span><strong>Generating...</strong> Creating your code with AI magic ✨';

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

        // Extract files from response
        extractFilesFromResponse(data);

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

        // Show success toast
        showToast(`✅ Generated ${currentFiles.length} file${currentFiles.length !== 1 ? 's' : ''} successfully!`);
    } catch (error) {
        showError(error.message || 'An error occurred while generating code. Please try again.');
        console.error('Generation error:', error);
    } finally {
        isGenerating = false;
        setLoadingState(false);
    }
}

// ===== EXTRACT FILES FROM RESPONSE =====
function extractFilesFromResponse(data) {
    currentFiles = [];

    // Check for files in different response formats
    if (data.files && Array.isArray(data.files)) {
        // Format 1: Direct files array
        currentFiles = data.files.map(file => ({
            name: file.name || file.path || 'unknown.txt',
            path: file.path || file.name || 'unknown.txt',
            content: file.content || '',
            icon: getFileIcon(file.name || file.path || 'unknown.txt'),
            edited: false,
            size: (file.content || '').length
        }));
    } else if (data.filesGenerated && Array.isArray(data.filesGenerated)) {
        // Format 2: Parse from filesGenerated messages
        parseFilesFromMessages(data.filesGenerated, data);
    } else if (data.result && typeof data.result === 'object') {
        // Format 3: Files nested in result
        if (data.result.files) {
            currentFiles = data.result.files.map(file => ({
                name: file.name || file.path || 'unknown.txt',
                path: file.path || file.name || 'unknown.txt',
                content: file.content || '',
                icon: getFileIcon(file.name || file.path || 'unknown.txt'),
                edited: false,
                size: (file.content || '').length
            }));
        }
    }

    // If we still have no files, try to extract from any code blocks in messages
    if (currentFiles.length === 0 && data.messages) {
        tryExtractCodeBlocks(data.messages);
    }
}

// Parse files from generation messages
function parseFilesFromMessages(messages, data) {
    currentFiles = [];

    messages.forEach(message => {
        const fileName = extractFileName(message);

        // Try to find corresponding content
        let content = '';

        // Check if there's actual file data in the response
        if (data.files && Array.isArray(data.files)) {
            const matchingFile = data.files.find(f =>
                f.name === fileName || f.path === fileName
            );
            if (matchingFile) {
                content = matchingFile.content || '';
            }
        }

        // Fallback to placeholder
        if (!content) {
            content = generatePlaceholderContent(fileName);
        }

        currentFiles.push({
            name: fileName,
            path: fileName,
            content: content,
            icon: getFileIcon(fileName),
            edited: false,
            size: content.length
        });
    });
}

// Try to extract code from markdown code blocks
function tryExtractCodeBlocks(messages) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g;

    messages.forEach((message, index) => {
        let match;
        let blockIndex = 0;

        while ((match = codeBlockRegex.exec(message)) !== null) {
            const language = match[1] || 'txt';
            const content = match[2].trim();
            const extension = getExtensionFromLanguage(language);
            const fileName = `file${index}_${blockIndex}.${extension}`;

            currentFiles.push({
                name: fileName,
                path: fileName,
                content: content,
                icon: getFileIcon(fileName),
                edited: false,
                size: content.length
            });

            blockIndex++;
        }
    });
}

function getExtensionFromLanguage(language) {
    const map = {
        'javascript': 'js',
        'typescript': 'ts',
        'jsx': 'jsx',
        'tsx': 'tsx',
        'python': 'py',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'markdown': 'md',
        'bash': 'sh',
        'shell': 'sh',
        'sql': 'sql',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'go': 'go',
        'rust': 'rs',
        'php': 'php',
        'ruby': 'rb',
        'swift': 'swift',
        'kotlin': 'kt',
    };

    return map[language.toLowerCase()] || 'txt';
}

function generatePlaceholderContent(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();

    const templates = {
        'js': `// ${fileName}\n// Generated JavaScript file\n\nexport default function main() {\n  console.log('Hello from ${fileName}');\n}\n`,
        'jsx': `// ${fileName}\nimport React from 'react';\n\nexport default function Component() {\n  return (\n    <div>\n      <h1>Generated Component</h1>\n    </div>\n  );\n}\n`,
        'html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Generated Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>\n`,
        'css': `/* ${fileName} */\n\nbody {\n  margin: 0;\n  padding: 0;\n  font-family: sans-serif;\n}\n\n.container {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 20px;\n}\n`,
        'json': `{\n  "name": "generated-project",\n  "version": "1.0.0",\n  "description": "Generated by Lovable Clone"\n}\n`,
        'py': `# ${fileName}\n# Generated Python file\n\ndef main():\n    print("Hello from ${fileName}")\n\nif __name__ == "__main__":\n    main()\n`,
    };

    return templates[ext] || `// ${fileName}\n// Generated file\n`;
}

// ===== DISPLAY RESULTS =====
function displayResults(data) {
    // Hide welcome screen when showing results
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    results.style.display = 'block';

    // Show status message
    if (data.success) {
        statusMessage.className = 'message success';
        statusMessage.innerHTML = '<strong>✅ Success!</strong> Code generated successfully!';
    } else {
        statusMessage.className = 'message error';
        statusMessage.innerHTML = `<strong>❌ Generation Failed:</strong> ${escapeHtml(data.error || 'Unknown error')}`;
    }

    // Display files if available
    if (currentFiles.length > 0) {
        filesSection.style.display = 'block';
        downloadSection.style.display = 'block';
        displayFilesList();
        displayFilePreviews();
        updateFileStats();
    } else {
        filesSection.style.display = 'none';
        downloadSection.style.display = 'none';
        fileContentContainer.innerHTML = '<div class="empty-state">No files generated</div>';
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

// Display files list with actions
function displayFilesList() {
    filesList.innerHTML = currentFiles
        .map((file, index) => {
            const sizeKB = (file.size / 1024).toFixed(2);
            const sizeDisplay = file.size < 1024 ? `${file.size} B` : `${sizeKB} KB`;

            return `
            <div class="file-item">
                <div class="file-item-left">
                    <span class="file-icon">${file.icon}</span>
                    <div class="file-info">
                        <span class="file-name" title="${escapeHtml(file.path)}">${escapeHtml(file.name)}</span>
                        <span class="file-size">${sizeDisplay}</span>
                    </div>
                    ${file.edited ? '<span class="edited-indicator" title="Modified">●</span>' : ''}
                </div>
                <div class="file-item-actions">
                    <button class="file-action-btn" onclick="viewFile(${index})" title="View in preview panel">
                        👁️ View
                    </button>
                    <button class="file-action-btn" onclick="editFile(${index})" title="Edit in code editor">
                        ✏️ Edit
                    </button>
                    <button class="file-action-btn" onclick="copyFileContent(${index})" title="Copy to clipboard">
                        📋 Copy
                    </button>
                    <button class="file-action-btn" onclick="downloadFile(${index})" title="Download this file">
                        💾 Save
                    </button>
                </div>
            </div>
        `;
        })
        .join('');
}

// ===== FILE PREVIEW PANEL =====
function displayFilePreviews() {
    if (currentFiles.length === 0) {
        fileTabs.innerHTML = '';
        fileContentContainer.innerHTML = '<div class="empty-state">No files to preview</div>';
        return;
    }

    // Create tabs
    fileTabs.innerHTML = currentFiles
        .map((file, index) => `
            <div class="file-tab ${index === 0 ? 'active' : ''}" data-index="${index}" onclick="switchFileTab(${index})">
                <span>${file.icon}</span>
                <span>${escapeHtml(file.name)}</span>
                ${file.edited ? '<span class="tab-edited-dot">●</span>' : ''}
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
                                <button class="code-btn" onclick="copyFileContent(${index})" title="Copy to clipboard">📋 Copy</button>
                                <button class="code-btn" onclick="editFile(${index})" title="Edit in code editor">✏️ Edit</button>
                                <button class="code-btn" onclick="downloadFile(${index})" title="Download file">💾 Download</button>
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

    // Expand preview panel if collapsed
    if (previewPanel.classList.contains('collapsed')) {
        togglePreviewBtn.click();
    }

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

    // Focus editor
    setTimeout(() => {
        codeEditor.focus();
    }, 100);
};

window.copyFileContent = async function(index) {
    const file = currentFiles[index];

    try {
        await navigator.clipboard.writeText(file.content);
        showToast(`✅ ${file.name} copied to clipboard!`);
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('❌ Failed to copy to clipboard');
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

    if (currentFiles.length === 0) {
        showToast('❌ No files to download');
        return;
    }

    try {
        const zip = new JSZip();

        currentFiles.forEach(file => {
            zip.file(file.path, file.content);
        });

        showToast('📦 Creating ZIP file...');

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated-code-${Date.now()}.zip`;
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

// ===== COPY ALL CODE =====
copyAllBtn.addEventListener('click', async () => {
    if (currentFiles.length === 0) {
        showToast('❌ No files to copy');
        return;
    }

    try {
        // Format all files with separators
        const allCode = currentFiles.map(file => {
            const separator = '='.repeat(60);
            return `${separator}\n// FILE: ${file.path}\n${separator}\n\n${file.content}\n\n`;
        }).join('\n');

        await navigator.clipboard.writeText(allCode);
        showToast(`✅ Copied all ${currentFiles.length} file${currentFiles.length !== 1 ? 's' : ''} to clipboard!`);
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('❌ Failed to copy to clipboard');
    }
});

function updateFileStats() {
    const fileCount = currentFiles.length;
    const totalSize = currentFiles.reduce((sum, file) => sum + file.size, 0);
    const sizeKB = (totalSize / 1024).toFixed(2);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    const sizeDisplay = totalSize < 1024 * 1024 ? `${sizeKB} KB` : `${sizeMB} MB`;

    fileStats.innerHTML = `<strong>${fileCount}</strong> file${fileCount !== 1 ? 's' : ''} • <strong>${sizeDisplay}</strong>`;
}

// ===== CODE EDITOR (CodeMirror) =====
function initializeEditor() {
    if (typeof CodeMirror === 'undefined') {
        console.error('CodeMirror not loaded');
        return;
    }

    if (codeEditor) {
        return; // Already initialized
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
        styleActiveLine: true,
        extraKeys: {
            'Ctrl-S': () => editorSaveBtn.click(),
            'Cmd-S': () => editorSaveBtn.click(),
        }
    });
}

// Save button in editor
editorSaveBtn.addEventListener('click', () => {
    if (currentEditingFile !== null && codeEditor) {
        const newContent = codeEditor.getValue();
        const file = currentFiles[currentEditingFile];

        if (newContent !== file.content) {
            file.content = newContent;
            file.edited = true;
            file.size = newContent.length;

            // Update displays
            displayFilesList();
            displayFilePreviews();
            updateFileStats();

            showToast('✅ Changes saved!');
        } else {
            showToast('ℹ️ No changes to save');
        }
    }

    editorModal.classList.remove('active');
    currentEditingFile = null;
});

// Close button in editor
editorCloseBtn.addEventListener('click', () => {
    if (currentEditingFile !== null && codeEditor) {
        const newContent = codeEditor.getValue();
        const file = currentFiles[currentEditingFile];

        if (newContent !== file.content) {
            if (confirm('You have unsaved changes. Save before closing?')) {
                editorSaveBtn.click();
                return;
            }
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
        historyList.innerHTML = '<div class="history-empty">No history yet<br><small>Your generations will appear here</small></div>';
        if (clearHistoryBtn) {
            clearHistoryBtn.style.display = 'none';
        }
        return;
    }

    // Show clear history button when there's history
    if (clearHistoryBtn) {
        clearHistoryBtn.style.display = 'flex';
    }

    historyList.innerHTML = generationHistory
        .map((gen, index) => {
            const date = new Date(gen.timestamp);
            const timeAgo = formatTimeAgo(date);
            const fileCount = gen.files?.length || 0;

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

    // Restore files
    currentFiles = generation.files || [];

    displayResults(generation.data);

    // Update active state
    document.querySelectorAll('.history-item').forEach((item, index) => {
        const itemId = generationHistory[index]?.id;
        item.classList.toggle('active', itemId === id);
    });

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

    // Clear all history
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (!confirm('Clear all history? This cannot be undone.')) {
                return;
            }

            generationHistory = [];
            try {
                localStorage.removeItem('lovable_history');
            } catch (err) {
                console.error('Failed to clear history:', err);
            }

            updateHistoryDisplay();
            showToast('✅ History cleared');
        });
    }
}

// ===== UTILITY FUNCTIONS =====
function setLoadingState(loading) {
    generateBtn.disabled = loading;
    promptInput.disabled = loading;

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
        /^(.+\.\w+)$/,
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    return message.split(' ')[0] || 'file.txt';
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
        'sass': 'css',
        'json': 'javascript',
        'py': 'python',
        'xml': 'xml',
        'md': 'markdown',
        'markdown': 'markdown',
        'yaml': 'yaml',
        'yml': 'yaml',
        'go': 'go',
        'rs': 'rust',
        'sh': 'shell',
        'bash': 'shell',
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
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.warn('Toast container not found');
        return;
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentElement) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, 3000);
}
