class FlipperSerial {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        this.responseBuffer = '';
        this.readLoopPromise = null;
        this.DEBUG = true;
    }

    debug(...args) {
        if (this.DEBUG) {
            console.log(...args);
        }
    }

    async connect() {
        try {
            this.debug('Requesting serial port...');
            this.port = await navigator.serial.requestPort();
            
            this.debug('Opening port...');
            await this.port.open({ baudRate: 230400 });
            
            // Start read loop first
            this.debug('Starting read loop...');
            this.reader = this.port.readable.getReader();
            this.readLoopPromise = this.readLoop(); // Changed from _readLoop to readLoop
            
            // Then get writer
            this.debug('Getting writer...');
            this.writer = this.port.writable.getWriter();
            
            // Wait a moment for the port to stabilize
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Clear any startup messages
            this.responseBuffer = '';
            
            // Try to establish CLI prompt
            this.debug('Establishing CLI prompt...');
            for (let i = 0; i < 3; i++) {
                try {
                    // Send Ctrl+C to break any existing state
                    await this.writer.write(new Uint8Array([0x03]));
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Send newline and wait for prompt
                    await this.write('\r\n');
                    await this.readUntil('>', 2000);
                    
                    this.isConnected = true;
                    this.debug('Connection established!');
                    return true;
                } catch (error) {
                    this.debug(`Prompt attempt ${i + 1} failed, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            throw new Error('Failed to establish CLI prompt');
            
        } catch (error) {
            this.debug('Connection error:', error);
            await this.disconnect();
            throw error;
        }
    }

    async readLoop() { // Changed from _readLoop to readLoop
        while (true) {
            try {
                const { value, done } = await this.reader.read();
                if (done) {
                    this.debug('Read loop complete');
                    break;
                }
                
                const decoded = new TextDecoder().decode(value);
                this.debug('Received:', decoded);
                this.responseBuffer += decoded;
                
            } catch (error) {
                if (error.name === 'NetworkError') {
                    break;
                }
                this.debug('Read error:', error);
                throw error;
            }
        }
    }

    async readUntil(marker, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let timeoutId = null;
            let intervalId = null;
            
            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (intervalId) clearInterval(intervalId);
            };

            const checkBuffer = () => {
                // Log current buffer state
                this.debug('Current buffer:', this.responseBuffer);
                
                const index = this.responseBuffer.indexOf(marker);
                if (index !== -1) {
                    cleanup();
                    const response = this.responseBuffer.substring(0, index);
                    this.responseBuffer = this.responseBuffer.substring(index + marker.length);
                    this.debug('Found marker:', marker);
                    this.debug('Response:', response);
                    resolve(response.trim());
                    return true;
                }
                
                // Check if we should timeout
                if (Date.now() - startTime >= timeout) {
                    cleanup();
                    this.debug('Timeout waiting for:', marker);
                    this.debug('Buffer contents:', this.responseBuffer);
                    reject(new Error('Read timeout'));
                    return true;
                }
                return false;
            };

            // Check immediately
            if (!checkBuffer()) {
                intervalId = setInterval(checkBuffer, 50);
                timeoutId = setTimeout(() => {
                    cleanup();
                    this.debug('Final timeout reached');
                    reject(new Error('Read timeout'));
                }, timeout + 100);
            }
        });
    }

    async writeFile(path, content) {
        if (!this.isConnected) {
            throw new Error('Not connected to Flipper');
        }

        this.debug('Starting write operation for:', path);
        
        try {
            // Clear buffer
            this.responseBuffer = '';
            
            // Create directory if needed
            const dirPath = path.substring(0, path.lastIndexOf('/'));
            if (dirPath) {
                await this.writeCommand(`storage mkdir ${dirPath}`);
            }

            // Start write command and wait for prompt
            this.debug('Starting storage write');
            await this.write(`storage write ${path}\r\n`);
            
            // Wait for the specific write prompt text we see in the logs
            this.debug('Waiting for write prompt...');
            await this.readUntil('Just write your text data. New line by Ctrl+Enter, exit by Ctrl+C.', 5000);
            
            // Write the content
            this.debug('Writing content');
            await this.write(content);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Send newline to complete content
            this.debug('Sending newline');
            await this.write('\r\n');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Send Ctrl+C to finish write mode
            this.debug('Sending Ctrl+C');
            await this.writer.write(new Uint8Array([0x03]));
            await new Promise(resolve => setTimeout(resolve, 500));

            // Wait for the specific prompt pattern we see in the logs
            this.debug('Waiting for CLI prompt');
            await this.readUntil('>:', 5000);
            
            // Clear any remaining output
            await new Promise(resolve => setTimeout(resolve, 200));
            this.responseBuffer = '';
            
            // Verify file exists
            this.debug('Verifying file');
            const statCmd = `storage stat ${path}`;
            await this.write(statCmd + '\r\n');
            
            // Wait for command echo and response
            await this.readUntil(statCmd);
            const statResponse = await this.readUntil('>:');
            
            if (statResponse.includes('Error') || statResponse.includes('not found')) {
                throw new Error('File verification failed');
            }
            
            return true;
        } catch (error) {
            this.debug('Write operation failed:', error);
            this.debug('Buffer contents:', this.responseBuffer);
            throw error;
        }
    }

    async write(data) {
        const encoder = new TextEncoder();
        await this.writer.write(encoder.encode(data));
        // Small delay after each write
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    async writeCommand(cmd) {
        if (!cmd) return;
        
        this.debug('Sending command:', cmd);
        await this.write(cmd + '\r\n');
        
        // Wait for both command echo and prompt with the exact pattern we see
        try {
            await this.readUntil(cmd, 2000);
            await this.readUntil('>:', 3000);
        } catch (error) {
            this.debug('Command response error:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.writer) {
                await this.writer.close();
                this.writer = null;
            }
            if (this.reader) {
                await this.reader.cancel();
                this.reader = null;
            }
            if (this.port) {
                await this.port.close();
                this.port = null;
            }
            this.isConnected = false;
            this.debug('Disconnected');
        } catch (error) {
            this.debug('Disconnection error:', error);
            throw error;
        }
    }
}