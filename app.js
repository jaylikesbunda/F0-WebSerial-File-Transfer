const flipper = new FlipperSerial();

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const sendBtn = document.getElementById('sendBtn');
const statusDiv = document.getElementById('status');
const scriptContent = document.getElementById('scriptContent');
const filePath = document.getElementById('filePath');
const folderSelect = document.getElementById('folderSelect');
const customFolderBtn = document.getElementById('customFolderBtn');
const customPathInput = document.getElementById('customPath');
const fileNameInput = document.getElementById('fileName');
const helpBtn = document.getElementById('helpBtn');
const textModeBtn = document.getElementById('textModeBtn');
const binaryModeBtn = document.getElementById('binaryModeBtn');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const fileName = document.getElementById('selectedFileName');

// Add this after the existing DOM element declarations
let currentMode = 'text';
let selectedFile = null;
let explorerInstance = null;

// Status Updates
function appendStatus(message) {
    const timestamp = new Date().toLocaleTimeString();
    statusDiv.textContent += `\n[${timestamp}] ${message}`;
    statusDiv.scrollTop = statusDiv.scrollHeight;
}

function setStatus(message) {
    const timestamp = new Date().toLocaleTimeString();
    statusDiv.textContent = `[${timestamp}] ${message}`;
}

function handleModeChange(mode) {
    currentMode = mode;
    const editorContainer = document.querySelector('.editor-container');  // Get the entire editor container
    const uploadArea = document.querySelector('.upload-area');

    if (mode === 'text') {
        textModeBtn.classList.add('active');
        binaryModeBtn.classList.remove('active');
        // Show editor, hide upload
        editorContainer.style.display = 'block';
        uploadArea.style.display = 'none';
    } else {
        textModeBtn.classList.remove('active');
        binaryModeBtn.classList.add('active');
        // Hide editor, show upload
        editorContainer.style.display = 'none';
        uploadArea.style.display = 'flex';
    }
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    selectedFile = file;
    fileName.textContent = file.name;
    fileNameInput.value = file.name;

    if (currentMode === 'text') {
        const text = await file.text();
        scriptContent.value = text;
    }
}

// Modify the existing handleSend function
async function handleSend() {
    try {
        sendBtn.disabled = true;
        const filename = fileNameInput.value.trim();
        let filepath;
        
        if (customPathInput.style.display !== 'none') {
            filepath = customPathInput.value.trim();
            if (!filepath.startsWith('/ext/')) {
                filepath = '/ext/' + filepath;
            }
            if (!filepath.endsWith('/')) {
                filepath += '/';
            }
        } else {
            filepath = folderSelect.value;
        }
        
        filepath += filename;

        if (!filename) {
            appendStatus('❌ Please enter a filename');
            return;
        }

        let content;
        if (currentMode === 'text') {
            content = scriptContent.value;
            if (!content) {
                appendStatus('❌ Please enter some content to save');
                return;
            }
        } else if (currentMode === 'binary' && selectedFile) {
            content = await selectedFile.arrayBuffer();
            content = new Uint8Array(content);
        } else {
            appendStatus('❌ Please select a file to upload');
            return;
        }

        appendStatus(`📝 Saving file to: ${filepath}`);
        await flipper.writeFile(filepath, content);
        appendStatus('✅ File transfer completed and verified!');
        appendStatus('File has been transferred to your Flipper Zero.');

        // Refresh explorer if needed
        if (window.explorerInstance) {
            await window.explorerInstance.refresh();
        }
        
    } catch (error) {
        appendStatus(`❌ Write error: ${error.message}`);
    } finally {
        sendBtn.disabled = false;
    }
}
// Event Handlers
async function handleConnect() {
    try {
        setStatus('Connecting to Flipper Zero...');
        await flipper.connect();
        
        // Initialize file explorer
        explorerInstance = new FlipperFileExplorer(flipper, 'fileExplorer');
        window.explorerInstance = explorerInstance;
        
        // Set initial explorer visibility based on current folder selection
        const isCustomPath = folderSelect.value === 'custom';
        explorerInstance.showExplorer(isCustomPath);
        
        // Listen for file selection
        document.getElementById('fileExplorer').addEventListener('fileSelected', (e) => {
            const path = e.detail.path;
            // Auto-fill the path in the existing UI
            const filename = path.split('/').pop();
            const directory = path.substring(0, path.lastIndexOf('/'));
            
            // Update UI
            fileNameInput.value = filename;
            if (directory !== customPathInput.value) {
                folderSelect.value = 'custom';
                customPathInput.style.display = 'block';
                customPathInput.value = directory;
            }
        });
        
        document.querySelector('.status-indicator').classList.add('connected');
        
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        sendBtn.disabled = false;

        
        appendStatus('Connected to Flipper Zero successfully!');
        appendStatus('Ready to transfer files. Use the file explorer or choose a folder.');
        
    } catch (error) {
        appendStatus(`❌ Connection error: ${error.message}`);
        appendStatus('📝 Tips:');
        appendStatus('  - Make sure qFlipper is closed');
        appendStatus('  - Unplug and replug your Flipper Zero');
        appendStatus('  - Try a different USB cable');
    }
}

async function handleDisconnect() {
    try {
        await flipper.disconnect();
        
        // Update UI elements
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        sendBtn.disabled = true;
        
        // Remove the connected class from status indicator
        document.querySelector('.status-indicator').classList.remove('connected');
        
        appendStatus('Disconnected from Flipper Zero');
    } catch (error) {
        appendStatus(`❌ Disconnection error: ${error.message}`);
    }
}

folderSelect.addEventListener('change', (e) => {
    const isCustom = e.target.value === 'custom';
    customPathInput.style.display = isCustom ? 'block' : 'none';
    folderSelect.style.width = isCustom ? '120px' : '100%';
    
    // Update explorer visibility
    if (window.explorerInstance) {
        window.explorerInstance.showExplorer(isCustom);
        if (!isCustom) {
            window.explorerInstance.navigate(e.target.value);
        }
    }

});

// Help button handler
helpBtn.addEventListener('click', () => {
    appendStatus('\n📖 Quick Help Guide:');
    appendStatus('1. Close qFlipper if it\'s running');
    appendStatus('2. Connect your Flipper Zero via USB');
    appendStatus('3. Click "Connect to Flipper"');
    appendStatus('4. Choose a folder type or enter custom path');
    appendStatus('5. Enter your script content');
    appendStatus('6. Click "Send to Flipper"');
    appendStatus('\n📁 Default Folders:');
    appendStatus('- /ext/badusb/    : BadUSB scripts');
    appendStatus('- /ext/subghz/    : Sub-GHz captures');
    appendStatus('- /ext/nfc/       : NFC data');
    appendStatus('- /ext/lfrfid/    : RFID data');
    appendStatus('- /ext/infrared/  : IR signals');
    appendStatus('- /ext/ibutton/   : iButton data');
});

// Event Listeners
connectBtn.addEventListener('click', handleConnect);
disconnectBtn.addEventListener('click', handleDisconnect);
sendBtn.addEventListener('click', handleSend);

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (flipper.isConnected) {
        flipper.disconnect();
    }
});

// Show initial help
setTimeout(() => {
    appendStatus('👋 Welcome to Flipper File Transfer!');
    appendStatus('Click the Help button for usage instructions.');
}, 100);

class EditorEnhancements {
    constructor(textareaId) {
        this.textarea = document.getElementById(textareaId);
        if (!this.textarea) {
            console.error('Textarea not found:', textareaId);
            return;
        }
        
        this.setupEditor();
        this.setupEventListeners();
        this.updateLineNumbers();
        this.updateStatusBar();
    }

    setupEditor() {
        // Wrap textarea in container
        const container = document.createElement('div');
        container.className = 'editor-container';
        this.textarea.parentNode.insertBefore(container, this.textarea);

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        toolbar.innerHTML = `
            <button id="toggleWordWrap" class="active" title="Toggle Word Wrap">Word Wrap</button>
            <button id="toggleLineNumbers" class="active" title="Toggle Line Numbers">Line Numbers</button>
            <button id="formatCode" title="Format Code">Format</button>
            <button id="copyContent" title="Copy to Clipboard">Copy</button>
        `;
        container.appendChild(toolbar);

        // Create editor wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'editor-wrapper';
        container.appendChild(wrapper);

        // Create line numbers
        const lineNumbers = document.createElement('div');
        lineNumbers.className = 'line-numbers';
        wrapper.appendChild(lineNumbers);

        // Move textarea into wrapper
        wrapper.appendChild(this.textarea);

        // Create status bar
        const statusBar = document.createElement('div');
        statusBar.className = 'editor-statusbar';
        statusBar.innerHTML = `
            <span id="cursorPosition">Line: 1, Column: 1</span>
            <span id="charCount">Characters: 0</span>
        `;
        container.appendChild(statusBar);

        // Store references
        this.container = container;
        this.lineNumbers = lineNumbers;
        this.statusBar = statusBar;
    }

    setupEventListeners() {
        // Word wrap toggle
        const wordWrapBtn = this.container.querySelector('#toggleWordWrap');
        wordWrapBtn.addEventListener('click', () => {
            const isActive = wordWrapBtn.classList.toggle('active');
            this.textarea.style.whiteSpace = isActive ? 'pre-wrap' : 'pre';
            this.textarea.style.overflowX = isActive ? 'hidden' : 'auto';
        });

        // Line numbers toggle
        const lineNumbersBtn = this.container.querySelector('#toggleLineNumbers');
        lineNumbersBtn.addEventListener('click', () => {
            const isActive = lineNumbersBtn.classList.toggle('active');
            this.lineNumbers.style.display = isActive ? 'block' : 'none';
        });

        // Format code
        this.container.querySelector('#formatCode').addEventListener('click', () => {
            try {
                const lines = this.textarea.value.split('\n');
                const formattedLines = lines.map(line => line.trim());
                this.textarea.value = formattedLines.join('\n');
                this.updateLineNumbers();
            } catch (error) {
                console.error('Formatting error:', error);
            }
        });

        // Copy content
        this.container.querySelector('#copyContent').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(this.textarea.value);
                const btn = this.container.querySelector('#copyContent');
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = originalText, 1500);
            } catch (error) {
                console.error('Copy error:', error);
            }
        });

        // Update line numbers and status on content change
        this.textarea.addEventListener('input', () => {
            this.updateLineNumbers();
            this.updateStatusBar();
        });

        // Update cursor position
        this.textarea.addEventListener('click', () => this.updateStatusBar());
        this.textarea.addEventListener('keyup', () => this.updateStatusBar());
        
        // Sync scroll positions
        this.textarea.addEventListener('scroll', () => {
            this.lineNumbers.scrollTop = this.textarea.scrollTop;
        });

        // Handle tab key
        this.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.textarea.selectionStart;
                const end = this.textarea.selectionEnd;
                
                // Insert tab
                this.textarea.value = this.textarea.value.substring(0, start) + 
                                    '    ' + // 4 spaces
                                    this.textarea.value.substring(end);
                
                // Put cursor at right position
                this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
                
                this.updateLineNumbers();
                this.updateStatusBar();
            }
        });
    }

    updateLineNumbers() {
        const lines = this.textarea.value.split('\n');
        const numbers = lines.map((_, i) => i + 1).join('\n');
        this.lineNumbers.textContent = numbers;
    }

    updateStatusBar() {
        const pos = this.textarea.selectionStart;
        const content = this.textarea.value;
        
        // Calculate line and column
        const lines = content.substr(0, pos).split('\n');
        const currentLine = lines.length;
        const currentColumn = lines[lines.length - 1].length + 1;
        
        // Update status bar
        const cursorPosition = this.statusBar.querySelector('#cursorPosition');
        const charCount = this.statusBar.querySelector('#charCount');
        
        cursorPosition.textContent = `Line: ${currentLine}, Column: ${currentColumn}`;
        charCount.textContent = `Characters: ${content.length}`;
    }
}

// Add these with the other event listeners
textModeBtn.addEventListener('click', () => handleModeChange('text'));
binaryModeBtn.addEventListener('click', () => handleModeChange('binary'));
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

// Initialize editor enhancements after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const editor = new EditorEnhancements('scriptContent');
    handleModeChange('text'); // Set initial mode
    
});


class FlipperFileExplorer {
    constructor(flipperSerial, containerId) {
        this.flipper = flipperSerial;
        this.container = document.getElementById(containerId);
        this.currentPath = '/ext';
        this.selectedPath = null;
        
        // Create explorer container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            // Insert after the location-inputs div
            const locationInputs = document.querySelector('.location-inputs');
            locationInputs.parentNode.insertBefore(this.container, locationInputs.nextSibling);
        }
        
        this.init();
    }
    init() {
        // Create explorer HTML structure
        this.container.innerHTML = `
            <div class="file-explorer">
                <div class="explorer-header">
                    <button class="nav-btn" id="backBtn" title="Go up">⬅️</button>
                    <span class="current-path" id="pathDisplay">/ext</span>
                    <button class="new-dir-btn" id="newDirBtn" title="New Folder">📁+</button>
                    <button class="refresh-btn" id="refreshBtn" title="Refresh">🔄</button>
                </div>
                <div class="file-list" id="fileList">
                    <div class="loading">Loading...</div>
                </div>
            </div>
        `;
    
        // Add styles if not already present
        if (!document.getElementById('explorer-styles')) {
            const style = document.createElement('style');
            style.id = 'explorer-styles';
            style.textContent = `
                .file-explorer {
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: var(--bg-tertiary);
                    margin-top: 12px;
                    overflow: hidden;
                    display: none;
                }
                .explorer-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    background: var(--bg-secondary);
                    border-bottom: 1px solid var(--border-color);
                }
                .current-path {
                    flex: 1;
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                    font-size: 13px;
                    color: var(--text-secondary);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .nav-btn, .refresh-btn, .new-dir-btn {
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    color: var(--text-primary);
                    padding: 4px 8px;
                    font-size: 14px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                }
                .nav-btn:hover, .refresh-btn:hover, .new-dir-btn:hover {
                    background: var(--accent-primary);
                    border-color: var(--accent-primary);
                }
                .file-list {
                    max-height: 300px;
                    overflow-y: auto;
                    padding: 8px;
                }
                .file-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 4px 8px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    color: var(--text-primary);
                }
                .file-item:hover {
                    background: var(--bg-secondary);
                }
                .file-item.selected {
                    background: var(--accent-primary);
                    color: white;
                }
                .file-item-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    cursor: pointer;
                    padding: 4px;
                }
                .file-icon {
                    flex-shrink: 0;
                    font-size: 16px;
                }
                .file-name {
                    flex: 1;
                    font-size: 13px;
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .select-folder-btn {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    color: var(--text-primary);
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    opacity: 0;
                    transition: all 0.2s ease;
                }
                .file-item:hover .select-folder-btn {
                    opacity: 1;
                }
                .select-folder-btn:hover {
                    background: var(--accent-primary);
                    border-color: var(--accent-primary);
                }
                .loading, .error, .empty {
                    padding: 20px;
                    text-align: center;
                    color: var(--text-secondary);
                    font-size: 13px;
                }
                .error {
                    color: var(--accent-error);
                }
            `;
            document.head.appendChild(style);
        }
    
        // Add event listeners
        this.container.querySelector('#backBtn').addEventListener('click', () => this.navigateUp());
        this.container.querySelector('#newDirBtn').addEventListener('click', () => {
            const name = prompt('Enter folder name:');
            if (name) this.createDirectory(name);
        });
        this.container.querySelector('#refreshBtn').addEventListener('click', () => this.refresh());
        
        // Initial load
        this.refresh();
    }
    async refresh() {
        const fileList = this.container.querySelector('#fileList');
        fileList.innerHTML = '<div class="loading">Loading...</div>';
        
        try {
            const items = await this.flipper.listDirectory(this.currentPath);
            this.renderFileList(items);
        } catch (error) {
            fileList.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            console.error('Explorer error:', error);
        }
    }

    renderFileList(items) {
        const fileList = this.container.querySelector('#fileList');
        fileList.innerHTML = '';
    
        if (items.length === 0) {
            fileList.innerHTML = '<div class="empty">Empty folder</div>';
            return;
        }
    
        // Sort items: directories first, then files
        items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
    
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'file-item';
            if (item.path === this.selectedPath) {
                div.classList.add('selected');
            }
    
            const icon = item.isDirectory ? '📁' : this.getFileIcon(item.type);
            
            div.innerHTML = `
                <div class="file-item-content">
                    <span class="file-icon">${icon}</span>
                    <span class="file-name">${item.name}</span>
                </div>
                ${item.isDirectory ? `<button class="select-folder-btn" title="Select this folder">Use Folder</button>` : ''}
            `;
    
            // Add click handlers
            const fileContent = div.querySelector('.file-item-content');
            fileContent.addEventListener('click', () => {
                if (item.isDirectory) {
                    this.navigate(item.path);
                } else {
                    this.selectFile(item.path, false);
                }
            });
    
            // Add folder select button handler
            if (item.isDirectory) {
                const selectBtn = div.querySelector('.select-folder-btn');
                selectBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectFile(item.path, true);
                });
            }
            
            fileList.appendChild(div);
        });
    }

    showExplorer(show = true) {
        const explorer = this.container.querySelector('.file-explorer');
        if (explorer) {
            explorer.style.display = show ? 'block' : 'none';
        }
    }

    getFileIcon(type) {
        const icons = {
            text: '📄',
            subghz: '📻',
            rfid: '🔑',
            infrared: '📱',
            nfc: '💳',
            script: '📜',
            application: '📦',
            ibutton: '🔐',
            unknown: '📄'
        };
        return icons[type] || icons.unknown;
    }

    navigate(path) {
        this.currentPath = path;
        this.container.querySelector('#pathDisplay').textContent = path;
        this.refresh();
    }

    navigateUp() {
        if (this.currentPath === '/ext') return;
        const newPath = this.currentPath.split('/').slice(0, -1).join('/') || '/ext';
        this.navigate(newPath);
    }

    async selectFile(path, isDirectory = false) {
        this.selectedPath = path;
        
        // Update existing UI elements
        if (isDirectory) {
            customPathInput.value = path;
            // Don't update filename if selecting a directory
        } else {
            const filename = path.split('/').pop();
            const directory = path.substring(0, path.lastIndexOf('/'));
            
            customPathInput.value = directory;
            fileNameInput.value = filename;
    
            // Try to read file content
            try {
                await this.flipper.write(`storage read ${path}\r\n`);
                await this.flipper.readUntil(`storage read ${path}`);
                const content = await this.flipper.readUntil('>');
                
                if (content && !content.includes('Error')) {
                    handleModeChange('text');
                    scriptContent.value = content;
                } else {
                    handleModeChange('binary');
                }
            } catch (error) {
                console.error('Failed to read file:', error);
                handleModeChange('binary');
            }
        }
        
        // Refresh to show selection
        this.refresh();
    }

    async createDirectory(name) {
        if (!name) return;
        
        const newPath = `${this.currentPath}/${name}`.replace(/\/+/g, '/');
        try {
            await this.flipper.writeCommand(`storage mkdir ${newPath}`);
            await this.refresh();
        } catch (error) {
            console.error('Failed to create directory:', error);
        }
    }
}