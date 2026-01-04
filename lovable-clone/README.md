# Lovable Clone - AI Code Generator

A beautiful web interface for AI-powered code generation using Claude Agent SDK.

## Features

- 🎨 Modern, gradient-based UI design
- 🚀 Real-time code generation
- 📁 File tracking and display
- 💬 Agent message logging
- ⚡ Fast and responsive
- 🔒 CORS-enabled API
- 📱 Mobile responsive
- 🤖 Powered by Claude Agent SDK

## Prerequisites

- Node.js 18+
- Claude Code CLI installed and authenticated
- Anthropic API key (if not using Claude Code authentication)

## Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

## Quick Start

### 1. Set Up Environment

Make sure you have your Anthropic API key set up:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

### 2. Start the Server

```bash
npm start
```

### 3. Open in Browser

Navigate to `http://localhost:3000` in your web browser.

## Using the Web Interface

1. Enter a prompt describing what you want to build
2. Click "Generate Code" or press Enter
3. Watch as the AI generates your code in real-time
4. View the generated files and agent messages
5. Click "Clear" to start a new generation

## Usage

### Basic Usage

```typescript
import { generateCode } from "./codeGen.js";

const result = await generateCode(
  "Create a simple Express server with a /hello endpoint"
);

if (result.success) {
  console.log("Code generated successfully!");
}
```

### With Options

```typescript
const result = await generateCode(
  "Create a React calculator component with TypeScript",
  {
    permissionMode: "acceptEdits", // Auto-approve file edits
    workingDir: "./src/components", // Where to create files
    allowedTools: ["Read", "Write", "Edit", "Glob"], // Tools agent can use
    verbose: true, // Show agent's reasoning
  }
);
```

### Permission Modes

- `default` - Ask for approval for each action (interactive)
- `acceptEdits` - Auto-approve file edits only (recommended)
- `bypassPermissions` - No prompts, full automation (use with caution)

### Available Tools

- `Read` - Read files
- `Write` - Create new files
- `Edit` - Modify existing files
- `Glob` - Find files by pattern
- `Grep` - Search file contents
- `Bash` - Run terminal commands

## Example Prompts

Try these prompts in the web interface:

- "Create a simple Express API with CRUD endpoints for users"
- "Build a React calculator component with basic operations"
- "Create a Python script to scrape weather data from a website"
- "Build a Node.js CLI tool for file organization"
- "Create a React todo list component with add, delete, and mark as complete functionality"
- "Build a REST API with authentication using JWT"
- "Create a responsive navigation menu with CSS animations"

## API Reference

### `generateCode(prompt, options?)`

Generates code using Claude Agent SDK.

**Parameters:**

- `prompt` (string) - Description of what to build
- `options` (CodeGenOptions) - Configuration options
  - `workingDir?` (string) - Working directory (default: current directory)
  - `permissionMode?` (string) - Permission level (default: "acceptEdits")
  - `allowedTools?` (string[]) - Tools the agent can use
  - `verbose?` (boolean) - Print reasoning to console (default: true)

**Returns:** `Promise<CodeGenResult>`

- `success` (boolean) - Whether generation succeeded
- `messages` (string[]) - Agent's messages and reasoning
- `error?` (string) - Error message if failed

## Project Structure

```
lovable-clone/
├── server.js           # Express server with API endpoints
├── src/
│   ├── codeGen.ts     # Code generation logic
│   └── example.ts     # Example usage
├── public/
│   ├── index.html     # Frontend UI
│   └── app.js         # Frontend JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### POST `/api/generate`

Generate code based on a prompt.

**Request:**
```json
{
  "prompt": "Create a simple Express API"
}
```

**Response:**
```json
{
  "success": true,
  "messages": ["Array of agent messages"],
  "filesGenerated": ["List of generated files"],
  "error": null
}
```

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Configuration

The server runs on port 3000 by default. You can modify this in `server.js`:

```javascript
const PORT = 3000;
```

Code generation uses `acceptEdits` permission mode by default, which auto-approves file edits. You can change this in `server.js`:

```javascript
const result = await generateCode(prompt, {
  permissionMode: 'acceptEdits', // or 'default' or 'bypassPermissions'
  verbose: true
});
```

## Security Notes

- CORS is enabled for all origins in development
- For production, configure CORS to allow only specific origins
- API key should be stored securely via environment variables
- Input validation is performed on all API endpoints

## Documentation

- [Claude Agent SDK Docs](https://platform.claude.com/docs/en/agent-sdk)
- [Agent SDK GitHub](https://github.com/anthropics/claude-agent-sdk)

## License

ISC
