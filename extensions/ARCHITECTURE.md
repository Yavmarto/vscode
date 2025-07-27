# VS Code Extension - Remote Server Architecture

## 1. High-Level Overview

This document outlines the architecture for a VS Code extension that acts as a remote server for a mobile client. The extension will allow the mobile application to interact with the user's workspace, enabling features such as file browsing, content viewing, and integration with Kilo Code.

The system consists of two main components:

*   **VS Code Extension (Server):** A TypeScript-based extension that runs within VS Code. It exposes an HTTP and WebSocket API for the mobile client to connect to.
*   **Mobile Client:** A Flutter-based mobile application that connects to the VS Code extension to access and interact with the workspace.

The communication between the client and server will be secured using session tokens. The server will provide endpoints for file system operations, real-time updates, and Kilo Code actions.

## 2. Component Breakdown

### 2.1. VS Code Extension

The extension will be composed of the following key components:

*   **Extension Activation:** The `extension.ts` file will be the entry point. It will be responsible for activating the extension, starting the server, and registering commands.
*   **HTTP Server:** An Express.js server will be integrated into the extension to handle HTTP requests from the mobile client. This server will expose a RESTful API for actions such as health checks, file system browsing, and fetching file content.
*   **WebSocket Server:** A WebSocket server will be set up to provide real-time communication between the extension and the mobile client. This will be used for pushing updates, such as file changes or Kilo Code events, to the client.
*   **API Endpoints:**
    *   `GET /api/health`: A health check endpoint to verify the server is running and accessible.
    *   `GET /api/files`: Lists files and directories in the workspace. It will accept an optional `path` query parameter to specify a subdirectory.
    *   `GET /api/files/content`: Fetches the content of a specified file. It will require a `path` query parameter.
    *   `POST /api/kilo/chat`: Sends a message to the Kilo Code chat interface.
    *   `POST /api/kilo/approve`: Approves a Kilo Code action.
*   **VS Code API Integration:** The extension will use the `vscode` API to access the workspace, read files, and interact with other extensions, particularly Kilo Code.

### 2.2. Mobile Client

The mobile client is responsible for:

*   **Connection Management:** Scanning a QR code to get the server URL and session token, and establishing a connection.
*   **UI:** Displaying the file structure, file content, and Kilo Code interactions.
*   **API Consumption:** Making HTTP requests to the server's API endpoints and handling WebSocket messages.

## 3. Communication Protocol

### 3.1. Transport

*   **HTTP:** For request-response interactions such as fetching files.
*   **WebSockets:** For real-time, bidirectional communication.

### 3.2. Data Format

All data exchanged between the client and server will be in **JSON** format.

### 3.3. Message Structure

#### HTTP Requests

*   **Authentication:** All requests to the API will require an `Authorization` header with a bearer token: `Authorization: Bearer <sessionToken>`.
*   **File List (`/api/files`):**
    *   **Response:** An array of `FileNode` objects.
        ```json
        [
          { "name": "file.txt", "isDirectory": false, "path": "/path/to/file.txt" },
          { "name": "directory", "isDirectory": true, "path": "/path/to/directory" }
        ]
        ```
*   **File Content (`/api/files/content`):**
    *   **Response:**
        ```json
        {
          "content": "File content as a string."
        }
        ```

#### WebSocket Messages

*   The WebSocket connection will be established at `ws://<serverUrl>/ws?token=<sessionToken>`.
*   Messages from the server to the client will be JSON objects with a `type` and `payload`.
    *   **Example (File Change Notification):**
        ```json
        {
          "type": "file_change",
          "payload": {
            "path": "/path/to/changed_file.txt",
            "changeType": "modified"
          }
        }
        ```

## 4. Directory Structure

The new VS Code extension will be located in `ide/extensions/remote-server` and will have the following structure:

```
ide/extensions/remote-server/
├── .vscode/
├── node_modules/
├── out/
│   ├── extension.js
│   └── ...
├── src/
│   ├── extension.ts       // Extension entry point
│   ├── server.ts          // HTTP and WebSocket server setup
│   ├── api/
│   │   ├── files.ts       // File-related API endpoints
│   │   └── kilo.ts        // Kilo Code related endpoints
│   └── services/
│       └── workspace.ts   // Service for interacting with VS Code workspace
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 5. Security Considerations

*   **Authentication:** The use of a session token for all API requests is the primary security measure. This token should be generated with sufficient entropy and have a limited lifespan.
*   **Secure Connection:** The server should be configured to only accept connections from the local network. For remote access, a secure tunnel (e.g., via SSH) should be used.
*   **Input Validation:** All input from the client (e.g., file paths) must be carefully validated and sanitized to prevent path traversal attacks and other injection vulnerabilities.
*   **Permissions:** The extension should operate with the minimum necessary permissions. Access to files outside of the current workspace should be disallowed.
*   **QR Code Security:** The QR code containing the connection details should be treated as sensitive information. The extension should provide a mechanism to regenerate the session token and QR code.