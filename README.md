# YouTube MCP Server

A Model Context Protocol (MCP) server for interacting with YouTube videos. This server provides tools for extracting video metadata, captions, and converting them to markdown format with various templates.

## Features

- **Video Metadata**: Fetch comprehensive video information
- **Caption Extraction**: Support for auto-generated and manual captions
- **Multiple Languages**: Built-in support for English and French
- **Template System**: Three built-in markdown templates:
  - Basic: Simple transcript format
  - Detailed: Full metadata with timestamps
  - Search: Results highlighting with context
- **Search Functionality**: Search within video captions
- **Flexible Authentication**: Supports both API key and OAuth2 authentication

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A YouTube Data API key and/or OAuth2 credentials

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd youtube-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

Create a `.env` file in the root directory with your YouTube credentials:

```env
YOUTUBE_API_KEY=your_api_key
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token  # Optional, for OAuth2
```

## MCP Configuration

Add the server to your MCP settings file (usually at `~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "youtube": {
      "command": "node",
      "args": ["path/to/youtube-mcp/build/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key",
        "YOUTUBE_CLIENT_ID": "your_client_id",
        "YOUTUBE_CLIENT_SECRET": "your_client_secret"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

## Usage

The server provides the following tools:

### 1. Get Video Info
```typescript
use_mcp_tool youtube get_video_info {
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

### 2. Get Captions
```typescript
use_mcp_tool youtube get_captions {
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "language": "en"  // Optional, defaults to "en"
}
```

### 3. Convert to Markdown
```typescript
use_mcp_tool youtube convert_to_markdown {
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "template_name": "detailed",  // Optional, "basic", "detailed", or "search"
  "language": "en",            // Optional
  "options": {                 // Optional
    "include_chapters": true,
    "search_term": "keyword"   // Only for search template
  }
}
```

### 4. List Templates
```typescript
use_mcp_tool youtube list_templates
```

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "googleapis": "^146.0.0",
    "google-auth-library": "^9.0.0",
    "youtube-captions-scraper": "^2.0.0",
    "express": "^4.18.2",
    "open": "^9.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
```

## OAuth2 Setup

For OAuth2 authentication (required for private video access):

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com)
2. Enable the YouTube Data API v3
3. Create OAuth2 credentials (Web application type)
4. Run the authentication script:
```bash
node src/get-api-key.js
```
5. Follow the browser prompts to authorize the application
6. Copy the refresh token to your configuration

## Customizing Templates

You can add custom templates by modifying the `DEFAULT_TEMPLATES` array in `src/index.ts`. Templates follow this structure:

```typescript
interface MarkdownTemplate {
  name: string;
  description: string;
  format: {
    header?: string;
    chapter_format?: string;
    caption_block: string;
    timestamp_format?: string;
    search_result_format?: string;
  }
}
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request