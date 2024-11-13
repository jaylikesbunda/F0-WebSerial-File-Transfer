# Flipper Zero WebSerial File Transfer

A browser-based file transfer tool for Flipper Zero that uses the WebSerial API to transfer files directly through Chrome/Edge without requiring any software installation.

## Features

- Direct browser-to-Flipper file transfers using WebSerial
- Support for common Flipper Zero file paths (BadUSB, Sub-GHz, NFC, etc.)
- Custom path support for advanced users
- Built-in text editor for file content
- Real-time connection status and transfer feedback

## Usage

1. Connect your Flipper Zero via USB
2. Open the web interface in Chrome/Edge
3. Click "Connect to Flipper"
4. Select destination folder or enter custom path
5. Enter filename and content
6. Click "Send to Flipper" to transfer

## Requirements

- Chromium-based browser (Chrome/Edge) that supports WebSerial API
- Flipper Zero device connected via USB
- qFlipper should be closed while using this tool