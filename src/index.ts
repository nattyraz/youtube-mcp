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