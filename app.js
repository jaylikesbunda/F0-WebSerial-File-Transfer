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

// Event Handlers
async function handleConnect() {
    try {
        setStatus('Connecting to Flipper Zero...');
        await flipper.connect();
        
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        sendBtn.disabled = false;
        
        appendStatus('Connected to Flipper Zero successfully!');
        appendStatus('Ready to transfer files. Choose a folder or enter a custom path.');
        
        // Start reading loop
        flipper.readLoop((msg) => {
            if (msg && !msg.includes('>')) { // Filter out prompt characters
                appendStatus(msg);
            }
        });
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
        
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        sendBtn.disabled = true;
        
        appendStatus('Disconnected from Flipper Zero');
    } catch (error) {
        appendStatus(`❌ Disconnection error: ${error.message}`);
    }
}

async function handleSend() {
    try {
        sendBtn.disabled = true;
        const filename = fileNameInput.value.trim();
        let filepath;
        
        if (customPathInput.style.display !== 'none') {
            // Using custom path
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

        const content = scriptContent.value;
        if (!content) {
            appendStatus('❌ Please enter some content to save');
            return;
        }

        appendStatus(`📝 Saving file to: ${filepath}`);
        await flipper.writeFile(filepath, content);
        appendStatus('✅ File transfer completed and verified!');
        appendStatus('You can now use your script on the Flipper Zero.');
    } catch (error) {
        appendStatus(`❌ Write error: ${error.message}`);
    } finally {
        sendBtn.disabled = false;
    }
}

// Update path when folder selection changes
folderSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        customPathInput.style.display = 'block';
        folderSelect.style.width = '120px';
    } else {
        customPathInput.style.display = 'none';
        folderSelect.style.width = '100%';
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

// Initialize editor enhancements after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const editor = new EditorEnhancements('scriptContent');
});