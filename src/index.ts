#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as youtubeCaptions from 'youtube-captions-scraper';
import {
  Caption,
  ErrorCode,
  GetVideoInfoArgs,
  GetCaptionsArgs,
  ConvertToMarkdownArgs,
  VideoOptions
} from './types.js';

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

interface Config {
  oauth2Client: OAuth2Client;
  supported_languages: string[];
  templates: {
    default: string;
    custom: MarkdownTemplate[];
  };
  search: {
    context_lines: number;
    highlight_format: string;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  }
}

const DEFAULT_TEMPLATES: MarkdownTemplate[] = [
  {
    name: "basic",
    description: "Simple transcript format",
    format: {
      caption_block: "{text}\n"
    }
  },
  {
    name: "detailed",
    description: "Detailed format with metadata",
    format: {
      header: "# {video_title}\nChannel: {channel_name}\nPublished: {publish_date}\n\n",
      chapter_format: "## {chapter_title}\n",
      caption_block: "{text}\n",
      timestamp_format: "[{timestamp}] "
    }
  },
  {
    name: "search",
    description: "Search results format",
    format: {
      header: "# Search Results for \"{search_term}\"\nVideo: {video_title}\n\n",
      search_result_format: "- [{timestamp}] {text}\n",
      caption_block: "{text}\n"
    }
  }
];

class YouTubeMcpServer {
  private server: Server;
  private youtube;
  private config: Config;

  constructor() {
    let auth;
    
    // Initialize OAuth2 client for operations that need it
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET
    );

    if (process.env.YOUTUBE_REFRESH_TOKEN) {
      oauth2Client.setCredentials({
        refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
      });
      auth = oauth2Client;
    } else if (process.env.YOUTUBE_API_KEY) {
      // Fall back to API key if OAuth is not configured
      auth = process.env.YOUTUBE_API_KEY;
    } else {
      console.warn('No YouTube authentication configured. Operations may fail.');
    }

    this.youtube = google.youtube({
      version: 'v3',
      auth
    });
    
    this.config = {
      oauth2Client,
      supported_languages: ['en', 'fr'],
      templates: {
        default: 'basic',
        custom: DEFAULT_TEMPLATES
      },
      search: {
        context_lines: 2,
        highlight_format: "**{text}**"
      },
      cache: {
        enabled: true,
        ttl: 3600
      }
    };

    this.server = new Server(
      {
        name: 'youtube-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  private extractVideoId(url: string): string {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    if (!match) {
      throw new McpError(ErrorCode.InvalidRequest, 'Invalid YouTube URL');
    }
    return match[1];
  }

  private async getVideoInfo(videoId: string) {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails'],
        id: [videoId]
      });

      if (!response.data.items?.length) {
        throw new McpError(ErrorCode.NotFound, 'Video not found');
      }

      return response.data.items[0];
    } catch (error) {
      console.error('Error fetching video info:', error);
      throw new McpError(ErrorCode.InternalError, 'Failed to fetch video info');
    }
  }

  private async getCaptions(videoId: string, language?: string) {
    try {
      const captions = await youtubeCaptions.getSubtitles({
        videoID: videoId,
        lang: language || 'en'
      });
      return captions;
    } catch (error) {
      console.error('Error fetching captions:', error);
      throw new McpError(ErrorCode.InternalError, 'Failed to fetch captions');
    }
  }
