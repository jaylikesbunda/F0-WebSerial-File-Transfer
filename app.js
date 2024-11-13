const flipper = new FlipperSerial();

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const sendBtn = document.getElementById('sendBtn');
const executeBtn = document.getElementById('executeBtn');
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

function getFullPath() {
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
    
    return filepath + filename;
}

// Event Handlers
async function handleConnect() {
    try {
        setStatus('Connecting to Flipper Zero...');
        await flipper.connect();
        
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        sendBtn.disabled = false;
        executeBtn.disabled = false;
        
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
        executeBtn.disabled = true;
        
        appendStatus('Disconnected from Flipper Zero');
    } catch (error) {
        appendStatus(`❌ Disconnection error: ${error.message}`);
    }
}

async function handleSend() {
    try {
        sendBtn.disabled = true;
        const filepath = getFullPath();

        if (!fileNameInput.value.trim()) {
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
        updateExecuteButton(); // Update execute button state after successful transfer
    } catch (error) {
        appendStatus(`❌ Write error: ${error.message}`);
    } finally {
        sendBtn.disabled = false;
    }
}

async function handleExecute() {
    try {
        const filepath = getFullPath();
        
        // Add confirmation for BadUSB scripts
        if (filepath.includes('/badusb/')) {
            if (!confirm('⚠️ WARNING: You are about to execute a BadUSB script. This could perform keyboard actions on your computer. Are you sure you want to continue?')) {
                appendStatus('❌ BadUSB execution cancelled by user');
                return;
            }
        }
        
        executeBtn.disabled = true;
        
        if (!fileNameInput.value.trim()) {
            appendStatus('❌ Please enter a filename');
            return;
        }

        appendStatus(`🔄 Executing file: ${filepath}`);
        await flipper.executeScript(filepath);
        
        if (filepath.includes('/badusb/')) {
            appendStatus('⚠️ BadUSB script loaded - check your Flipper screen to run');
            appendStatus('📝 Use Flipper buttons to control the script');
        } else {
            appendStatus('✅ File executed successfully!');
        }
        
    } catch (error) {
        appendStatus(`❌ Execute error: ${error.message}`);
    } finally {
        executeBtn.disabled = false;
    }
}

function updateExecuteButton() {
    const filepath = getFullPath();
    const isBadUSB = filepath.includes('/badusb/');
    
    if (isBadUSB) {
        executeBtn.classList.add('warning-btn');
        executeBtn.title = "⚠️ This will execute a BadUSB script!";
    } else {
        executeBtn.classList.remove('warning-btn');
        executeBtn.title = "Execute this file on Flipper";
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
    updateExecuteButton();
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
    appendStatus('7. Click "Execute on Flipper" to run the file');
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
executeBtn.addEventListener('click', handleExecute);
folderSelect.addEventListener('change', updateExecuteButton);
fileNameInput.addEventListener('input', updateExecuteButton);
customPathInput?.addEventListener('input', updateExecuteButton);

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

// Initialize editor enhancements after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const editor = new EditorEnhancements('scriptContent');
});