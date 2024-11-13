# Flipper Zero WebSerial File Transfer

A browser-based file transfer tool for Flipper Zero that uses the WebSerial API to transfer files directly through Chrome/Edge.

## Features
- Direct browser-to-Flipper file transfers without installing software
- Built-in file explorer for browsing Flipper's storage
- Supports common Flipper Zero file paths (BadUSB, Sub-GHz, NFC, etc.)
- Two transfer modes:
 - Text Editor: For creating/editing text files 
 - File Mode: For uploading existing files
- Dark mode interface
- Real-time status feedback

## Usage
1. Connect your Flipper Zero via USB
2. Open the web interface in Chrome/Edge
3. Click "Connect to Flipper"
4. Choose transfer mode (Text or File)
5. Select destination folder or browse using file explorer
6. Enter/upload content
7. Click "Send to Flipper" to transfer

## Requirements
- Chrome or Edge browser (WebSerial support required)
- Flipper Zero device connected via USB
- qFlipper should be closed while using this tool
