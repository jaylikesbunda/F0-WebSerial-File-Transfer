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
const launchBtn = document.createElement('button');
launchBtn.id = 'launchBtn';
launchBtn.innerHTML = '▶️ Launch BadUSB (BETA)';
launchBtn.className = 'launch-btn';
launchBtn.style.display = 'none'; // Initially hidden
launchBtn.title = 'Launch selected BadUSB script';
document.querySelector('#sendBtn').insertAdjacentElement('afterend', launchBtn);
// Add this to your CSS
const style = document.createElement('style');
style.textContent = `
    .launch-btn {
        width: 100%;
        padding: 14px;
        font-size: 16px;
        margin: 8px 0;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .launch-btn:hover:not(:disabled) {
        background: var(--accent-primary);
        border-color: var(--accent-primary);
    }
    
    .launch-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

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

function updateLaunchButton() {
    const currentPath = customPathInput.style.display !== 'none' 
        ? customPathInput.value 
        : folderSelect.value;
        
    const filename = fileNameInput.value;
    const isBadUSBPath = currentPath.includes('/ext/badusb') || folderSelect.value === '/ext/badusb/';
    
    launchBtn.style.display = isBadUSBPath ? 'block' : 'none';
    launchBtn.disabled = !flipper.isConnected || !filename;
}

// Add launch handler
async function handleLaunch() {
    try {
        launchBtn.disabled = true;
        appendStatus('🚀 Launching BadUSB script...');
        
        // First make sure loader is closed
        await flipper.loaderClose().catch(() => {});
        
        // Construct full file path
        const filePath = customPathInput.style.display !== 'none'
            ? `${customPathInput.value}/${fileNameInput.value}`.replace(/\/+/g, '/')
            : `${folderSelect.value}${fileNameInput.value}`;
            
        // Open BadUSB app with the file path
        await flipper.loaderOpen('Bad USB', filePath);
        appendStatus('✅ BadUSB app opened with script: ' + filePath);
        appendStatus('Press the OK button on your Flipper to execute the script.');
        
    } catch (error) {
        appendStatus(`❌ Launch error: ${error.message}`);
    } finally {
        launchBtn.disabled = false;
    }
}

// Add event listeners
launchBtn.addEventListener('click', handleLaunch);
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
    
    updateLaunchButton(); // Add this line
});

customPathInput.addEventListener('input', updateLaunchButton);
fileNameInput.addEventListener('input', updateLaunchButton);

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
        
        // Check if using a custom path or a preset selection
        if (customPathInput.style.display !== 'none' && customPathInput.value.trim()) {
            filepath = customPathInput.value.trim();
            
            // Add "/ext/" prefix if it doesn't already start with it
            if (!filepath.startsWith('/ext/')) {
                filepath = '/ext/' + filepath;
            }
            
            // Ensure path ends with a slash
            if (!filepath.endsWith('/')) {
                filepath += '/';
            }
        } else {
            // Use the selected preset path directly from folderSelect
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

function setInitialPath() {
    const defaultPath = folderSelect.value;
    if (defaultPath && defaultPath !== 'custom') {
        customPathInput.style.display = 'none';
        folderSelect.style.width = '100%';
        updateLaunchButton();

        // If we have an explorer instance, update it
        if (window.explorerInstance) {
            window.explorerInstance.showExplorer(false);
            window.explorerInstance.navigate(defaultPath);
        }
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
            const filename = path.split('/').pop();
            const directory = path.substring(0, path.lastIndexOf('/'));
            
            fileNameInput.value = filename;
            if (directory !== customPathInput.value) {
                folderSelect.value = 'custom';
                customPathInput.style.display = 'block';
                customPathInput.value = directory;
            }
            
            updateLaunchButton(); // Add this line
        });
        
        document.querySelector('.status-indicator').classList.add('connected');
        
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        sendBtn.disabled = false;
        
        updateLaunchButton(); // Add this line
        
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
        
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        sendBtn.disabled = true;
        
        document.querySelector('.status-indicator').classList.remove('connected');
        
        appendStatus('Disconnected from Flipper Zero');
        updateLaunchButton();  // Add this line
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
    setInitialPath();
}, 100);

class EditorEnhancements {
    constructor(textareaId) {
        this.textarea = document.getElementById(textareaId);
        if (!this.textarea) {
            console.error('Textarea not found:', textareaId);
            return;
        }
        
        this.maxChars = 10000;
        this.setupEditor();
        this.setupEventListeners();
        const savedContent = localStorage.getItem('editorContent');
        if (savedContent !== null) {
            this.textarea.value = savedContent;
        }
        this.updateLineNumbers();
        this.updateStatusBar();
    }

    duckyHighlighter = {
        // All common Ducky Script commands
        commands: {
            MODIFIERS: [
                'CTRL', 'CONTROL', 'SHIFT', 'ALT', 'GUI', 'WINDOWS',
                'COMMAND', 'META', 'FN'
            ],
            KEYS: [
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
                'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
                'ENTER', 'RETURN', 'SPACE', 'TAB', 'ESC', 'ESCAPE', 'UP', 'DOWN',
                'LEFT', 'RIGHT', 'UPARROW', 'DOWNARROW', 'LEFTARROW', 'RIGHTARROW',
                'BREAK', 'PAUSE', 'CAPSLOCK', 'DELETE', 'DEL', 'END', 'HOME',
                'INSERT', 'NUMLOCK', 'PAGEUP', 'PAGEDOWN', 'PRINTSCREEN', 'SCROLLLOCK',
                'BACKSPACE', 'BKSP', 'MENU', 'APP'
            ],
            COMMANDS: [
                'DEFAULT_DELAY', 'DEFAULTDELAY', 'DELAY', 'STRING', 'REPEAT',
                'REM', 'ID', 'WAIT_FOR_BUTTON_PRESS', 'BUTTON_DEF', 'BUTTON_WAIT'
            ]
        },
        isEnabled: false,
        isKeyCommand(word) {
            return this.commands.KEYS.includes(word.toUpperCase()) ||
                   this.commands.MODIFIERS.includes(word.toUpperCase());
        },
        isControlCommand(word) {
            return this.commands.COMMANDS.includes(word.toUpperCase());
        },
        highlightLine(line) {
            if (!this.isEnabled) return line;
            if (!line.trim()) return `<span style="color: var(--text-primary)">${line}</span>`;
            
            const trimmedLine = line.trim();
            const upperLine = trimmedLine.toUpperCase();
            
            // Comments (REM)
            if (upperLine.startsWith('REM')) {
                const [cmd, ...rest] = line.split(/\s+(.+)/);
                return `<span style="color: #8b949e">${cmd}</span>` + 
                       (rest.length ? ` <span style="color: #6a737d">${rest.join(' ')}</span>` : '');
            }
            
            // String command
            if (upperLine.startsWith('STRING')) {
                const [cmd, ...rest] = line.split(/\s+(.+)/);
                return `<span style="color: #ff7b72">${cmd}</span>` + 
                       (rest.length ? ` <span style="color: #79c0ff">${rest.join(' ')}</span>` : '');
            }
            
            // Delay commands with numbers
            if (upperLine.match(/^(DEFAULT_DELAY|DEFAULTDELAY|DELAY|REPEAT)\s+\d+$/)) {
                const [cmd, num] = trimmedLine.split(/\s+/);
                return `<span style="color: #ff7b72">${cmd}</span> ` +
                       `<span style="color: #d2a8ff">${num}</span>`;
            }
            
            // Key combinations (e.g., CTRL ALT DELETE)
            const words = trimmedLine.split(/\s+/);
            const highlightedWords = words.map(word => {
                if (this.isControlCommand(word)) {
                    return `<span style="color: #ff7b72">${word}</span>`;
                }
                if (this.isKeyCommand(word)) {
                    return `<span style="color: #ffa657">${word}</span>`;
                }
                // Numbers
                if (/^\d+$/.test(word)) {
                    return `<span style="color: #d2a8ff">${word}</span>`;
                }
                return `<span style="color: var(--text-primary)">${word}</span>`;
            });
            
            return highlightedWords.join(' ');
        }
    };
    setupEditor() {
        // Remove any existing editor if present
        if (this.container) {
            this.container.remove();
        }
    
        // Create main container
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
    
        // Add Ducky syntax button
        const syntaxBtn = document.createElement('button');
        syntaxBtn.id = 'toggleSyntax';
        syntaxBtn.title = 'Toggle Ducky Script Syntax Highlighting';
        syntaxBtn.textContent = 'Ducky Syntax';
        syntaxBtn.addEventListener('click', () => {
            this.duckyHighlighter.isEnabled = !this.duckyHighlighter.isEnabled;
            syntaxBtn.classList.toggle('active');
            this.textarea.style.color = this.duckyHighlighter.isEnabled ? 'transparent' : 'var(--text-primary)';
            this.updateSyntaxHighlighting();
        });
        toolbar.appendChild(syntaxBtn);
    
        // Create editor wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'editor-wrapper';
        wrapper.style.cssText = `
            position: relative;
            display: flex;
            height: 300px;
            top: 0px;
            background: var(--bg-tertiary);
            overflow: hidden;
        `;
        container.appendChild(wrapper);
    
        // Update line numbers container styles
        const lineNumbers = document.createElement('div');
        lineNumbers.className = 'line-numbers';
        lineNumbers.style.cssText = `
            padding: 16px 10px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-color);
            user-select: none;
            min-width: 40px;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
        `;
        
        // Create a line numbers wrapper for proper scrolling
        const lineNumbersWrapper = document.createElement('div');
        lineNumbersWrapper.style.cssText = `
            position: relative;
            width: 60px;
            overflow: hidden;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-color);
        `;
        lineNumbersWrapper.appendChild(lineNumbers);
        wrapper.appendChild(lineNumbersWrapper);
    
        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `
            position: relative;
            flex: 1;
            top: 0px;
            overflow: hidden;
        `;
        wrapper.appendChild(contentWrapper);
    
        // Create syntax highlight overlay
        const highlight = document.createElement('div');
        highlight.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            pointer-events: none;
            white-space: pre;
            padding: 16px;
            margin: 0;
            background: transparent;
            z-index: 2;
        `;
        contentWrapper.appendChild(highlight);
    
        // Apply common styles to synchronized elements
        const commonStyles = `
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 14px;
            line-height: 1.6;
            tab-size: 4;
            top: 0px;
            white-space: pre;
        `;
        highlight.style.cssText += commonStyles;
        lineNumbers.style.cssText += commonStyles;
    
        // Style and move textarea
        this.textarea.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            border: none;
            resize: none;
            background: transparent;
            color: var(--text-primary);
            caret-color: var(--text-primary);
            padding: 16px;

            overflow: auto;
            z-index: 1;
            ${commonStyles}
        `;
        contentWrapper.appendChild(this.textarea);
    
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
        this.wrapper = wrapper;
        this.lineNumbers = lineNumbers;
        this.lineNumbersWrapper = lineNumbersWrapper;
        this.highlight = highlight;
        this.statusBar = statusBar;
        this.toolbar = toolbar;
    
        // Set up resize observer
        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.target === this.container) {
                    this.updateLayout();
                }
            }
        });
        this.resizeObserver.observe(this.container);
    
        // Initial updates
        this.updateLayout();
        this.updateLineNumbers();
        this.updateSyntaxHighlighting();
        this.updateStatusBar();
    }

    updateLayout() {
        if (!this.container || !this.wrapper) return;
    
        // Get all relevant elements
        const textarea = this.textarea;
        const highlight = this.highlight;
        const lineNumbers = this.lineNumbers;
        const lineNumbersWrapper = this.lineNumbersWrapper;
    
        // Reset any existing scroll handlers
        textarea.onscroll = null;
    
        // Set initial dimensions
        const fixedEditorHeight = 300;
        this.wrapper.style.height = `${fixedEditorHeight}px`;
        
        // Get computed styles for precise measurements
        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingBottom = parseFloat(computedStyle.paddingBottom);
    
        // Ensure textarea has proper box-sizing
        textarea.style.boxSizing = 'border-box';
        
        // Set consistent padding
        textarea.style.padding = `${paddingTop}px ${parseFloat(computedStyle.paddingRight)}px ${paddingBottom}px ${parseFloat(computedStyle.paddingLeft)}px`;
        
        // Calculate number of visible lines
        const visibleLines = Math.floor((fixedEditorHeight - (paddingTop + paddingBottom)) / lineHeight);
        
        // Calculate content height including an extra buffer for last line
        const lines = textarea.value.split('\n');
        const totalLines = lines.length;
        const extraBuffer = lineHeight; // Add extra space for last line
        
        const contentHeight = Math.max(
            (totalLines * lineHeight) + paddingTop + paddingBottom + extraBuffer,
            fixedEditorHeight
        );
    
        // Apply styles to textarea
        textarea.style.minHeight = '100%';
        textarea.style.height = '100%';
        textarea.style.lineHeight = `${lineHeight}px`;
        
        // Update highlight overlay if it exists
        if (highlight) {
            highlight.style.padding = textarea.style.padding;
            highlight.style.lineHeight = `${lineHeight}px`;
            highlight.style.height = `${contentHeight}px`;
            highlight.style.width = `${textarea.clientWidth}px`;
            highlight.style.boxSizing = 'border-box';
        }
    
        // Update line numbers with matching dimensions
        if (lineNumbers) {
            lineNumbers.style.padding = `${paddingTop}px 10px ${paddingBottom}px 10px`;
            lineNumbers.style.lineHeight = `${lineHeight}px`;
            lineNumbers.style.height = `${contentHeight}px`;
            lineNumbers.style.boxSizing = 'border-box';
            
            // Generate line numbers with proper height
            lineNumbers.innerHTML = Array.from(
                { length: totalLines }, 
                (_, i) => `<div class="line-number" style="height: ${lineHeight}px; line-height: ${lineHeight}px;">${i + 1}</div>`
            ).join('');
        }
    
        // Synchronize scrolling
        const syncScroll = () => {
            const maxScroll = textarea.scrollHeight - textarea.clientHeight;
            const scrollTop = Math.min(textarea.scrollTop, maxScroll);
            
            if (highlight) {
                highlight.style.transform = `translateY(${-scrollTop}px)`;
            }
    
            if (lineNumbers) {
                lineNumbers.style.transform = `translateY(${-scrollTop}px)`;
                this.highlightCurrentLine?.();
            }
    
            localStorage.setItem('editorScrollPosition', scrollTop.toString());
        };
    
        // Optimized scroll handler
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    syncScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };
    
        // Clean up and add scroll listener
        if (this._scrollHandler) {
            textarea.removeEventListener('scroll', this._scrollHandler);
        }
        this._scrollHandler = handleScroll;
        textarea.addEventListener('scroll', handleScroll, { passive: true });
    
        // Restore scroll position
        const savedScrollTop = localStorage.getItem('editorScrollPosition');
        if (savedScrollTop !== null) {
            const parsedScrollTop = parseInt(savedScrollTop);
            if (!isNaN(parsedScrollTop) && parsedScrollTop <= textarea.scrollHeight - textarea.clientHeight) {
                textarea.scrollTop = parsedScrollTop;
                syncScroll();
            }
        }
    
        // Handle window resize
        const debouncedResize = this.debounce(() => {
            requestAnimationFrame(() => {
                if (highlight) {
                    highlight.style.width = `${textarea.clientWidth}px`;
                }
                textarea.scrollTop = Math.min(textarea.scrollTop, textarea.scrollHeight - textarea.clientHeight);
                syncScroll();
                
                // Recalculate everything after resize
                this.updateLayout();
            });
        }, 100);
    
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        this._resizeHandler = debouncedResize;
        window.addEventListener('resize', debouncedResize);
    
        // Set up intersection observer
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    syncScroll();
                }
            });
        }, { threshold: 0.1 });
        this.intersectionObserver.observe(this.wrapper);
    
        // Initial sync
        syncScroll();
    }
    
    // Add this cleanup method to your class
    dispose() {
        if (this._scrollHandler) {
            this.textarea?.removeEventListener('scroll', this._scrollHandler);
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }


    
    updateSyntaxHighlighting() {
        if (!this.duckyHighlighter.isEnabled) {
            this.highlight.innerHTML = '';
            return;
        }
    
        const lines = this.textarea.value.split('\n');
        const highlightedLines = lines.map(line => 
            this.duckyHighlighter.highlightLine(line)
        );
        this.highlight.innerHTML = highlightedLines.join('\n');
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
                this.updateStatusBar();
            } catch (error) {
                console.error('Formatting error:', error);
                alert('An error occurred while formatting the code.');
            }
        });
    
        // Copy content
        this.container.querySelector('#copyContent').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(this.textarea.value);
                const btn = this.container.querySelector('#copyContent');
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => (btn.textContent = originalText), 1500);
            } catch (error) {
                console.error('Copy error:', error);
            }
        });
    
        // Input handling
        this.textarea.addEventListener('input', () => {
            if (this.duckyHighlighter.isEnabled) {
                const lines = this.textarea.value.split('\n');
                const highlightedLines = lines.map(line => 
                    this.duckyHighlighter.highlightLine(line)
                );
                this.highlight.innerHTML = highlightedLines.join('\n');
            }
            
            this.debounce(() => {
                this.updateLineNumbers();
                this.updateStatusBar();
                localStorage.setItem('editorContent', this.textarea.value);
            }, 100)();
        });
    
        // Update cursor position
        this.textarea.addEventListener('click', () => this.updateStatusBar());
        this.textarea.addEventListener('keyup', () => this.updateStatusBar());
        this.textarea.addEventListener('scroll', () => {
            // Sync highlight overlay
            if (this.highlight) {
                this.highlight.style.transform = `translate(0, ${-this.textarea.scrollTop}px)`;
            }
            
            // Sync line numbers
            if (this.lineNumbers) {
                this.lineNumbers.style.transform = `translate(0, ${-this.textarea.scrollTop}px)`;
            }
        });
    
        // Tab key handling
        this.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.textarea.selectionStart;
                const end = this.textarea.selectionEnd;
    
                const selectedText = this.textarea.value.substring(start, end);
                const lines = selectedText.split('\n');
    
                if (e.shiftKey) {
                    const unindentedLines = lines.map((line) =>
                        line.startsWith('    ') ? line.slice(4) : line
                    );
                    const newText = unindentedLines.join('\n');
                    this.replaceSelection(newText, start, end);
                    this.textarea.selectionStart = start;
                    this.textarea.selectionEnd = start + newText.length;
                } else {
                    const indentedLines = lines.map((line) => '    ' + line);
                    const newText = indentedLines.join('\n');
                    this.replaceSelection(newText, start, end);
                    this.textarea.selectionStart = start;
                    this.textarea.selectionEnd = start + newText.length;
                }
    
                this.updateLineNumbers();
                this.updateStatusBar();
            }
        });
    }
    debounce(func, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    replaceSelection(text, start, end) {
        this.textarea.setRangeText(text, start, end, 'end');
    }


    updateLineNumbers() {
        const lines = this.textarea.value.split('\n');
        const lineCount = lines.length;
        const lineHeight = parseFloat(getComputedStyle(this.textarea).lineHeight);
        
        // Create line numbers HTML
        let lineNumbersHTML = '';
        for (let i = 1; i <= lineCount; i++) {
            lineNumbersHTML += `<div class="line-number" style="height: ${lineHeight}px">${i}</div>`;
        }
        
        this.lineNumbers.innerHTML = lineNumbersHTML;
        this.lineNumbers.style.height = `${this.textarea.scrollHeight}px`;
        
        // Reset transform when updating line numbers
        this.lineNumbers.style.transform = `translate(0, ${-this.textarea.scrollTop}px)`;
        
        this.highlightCurrentLine();
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
        const charCountElem = this.statusBar.querySelector('#charCount');

        cursorPosition.textContent = `Line: ${currentLine}, Column: ${currentColumn}`;
        charCountElem.textContent = `Characters: ${content.length}`;

        // Character limit warning
        if (content.length > this.maxChars) {
            charCountElem.style.color = 'var(--accent-error)';
        } else if (content.length > this.maxChars * 0.9) {
            charCountElem.style.color = 'var(--accent-warning)';
        } else {
            charCountElem.style.color = '';
        }

        this.highlightCurrentLine();
    }

    highlightCurrentLine() {
        const pos = this.textarea.selectionStart;
        const contentUpToCursor = this.textarea.value.substring(0, pos);
        const currentLineNumber = contentUpToCursor.split('\n').length;

        // Remove previous highlight
        const lines = this.lineNumbers.querySelectorAll('div');
        lines.forEach((line) => line.classList.remove('current-line'));

        // Highlight current line
        const currentLineElem = this.lineNumbers.children[currentLineNumber - 1];
        if (currentLineElem) {
            currentLineElem.classList.add('current-line');
        }
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
                /* Highlight current line */
                .line-numbers div.current-line {
                    background-color: rgba(255, 255, 255, 0.1);
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
        
        if (isDirectory) {
            customPathInput.value = path;
        } else {
            const filename = path.split('/').pop();
            const directory = path.substring(0, path.lastIndexOf('/'));
            
            customPathInput.value = directory;
            fileNameInput.value = filename;
    
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
        
        updateLaunchButton(); // Add this line
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
