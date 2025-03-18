
  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_video_info',
          description: 'Get video metadata including available captions, chapters, and languages',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'YouTube video URL'
              }
            },
            required: ['url']
          }
        },
        {
          name: 'get_captions',
          description: 'Get captions for a video in specified language',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'YouTube video URL'
              },
              language: {
                type: 'string',
                description: 'Language code (e.g., en, fr)'
              }
            },
            required: ['url']
          }
        },
        {
          name: 'convert_to_markdown',
          description: 'Convert video captions to markdown',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'YouTube video URL'
              },
              template_name: {
                type: 'string',
                description: 'Template name to use'
              },
              language: {
                type: 'string',
                description: 'Language code'
              },
              options: {
                type: 'object',
                properties: {
                  include_chapters: {
                    type: 'boolean'
                  },
                  search_term: {
                    type: 'string'
                  }
                }
              }
            },
            required: ['url']
          }
        },
        {
          name: 'list_templates',
          description: 'List available markdown templates',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidRequest, 'Missing arguments');
      }

      const args = request.params.arguments as Record<string, unknown>;

      switch (request.params.name) {
        case 'get_video_info': {
          if (typeof args.url !== 'string') {
            throw new McpError(ErrorCode.InvalidRequest, 'URL is required and must be a string');
          }
          const validatedArgs: GetVideoInfoArgs = { url: args.url };
          const videoId = this.extractVideoId(validatedArgs.url);
          const info = await this.getVideoInfo(videoId);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(info, null, 2)
            }]
          };
        }

        case 'get_captions': {
          if (typeof args.url !== 'string') {
            throw new McpError(ErrorCode.InvalidRequest, 'URL is required and must be a string');
          }
          const validatedArgs: GetCaptionsArgs = {
            url: args.url,
            language: typeof args.language === 'string' ? args.language : undefined
          };
          const videoId = this.extractVideoId(validatedArgs.url);
          const captions = await this.getCaptions(videoId, validatedArgs.language);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(captions, null, 2)
            }]
          };
        }

        case 'convert_to_markdown': {
          if (typeof args.url !== 'string') {
            throw new McpError(ErrorCode.InvalidRequest, 'URL is required and must be a string');
          }
          
          const validatedArgs: ConvertToMarkdownArgs = {
            url: args.url,
            template_name: typeof args.template_name === 'string' ? args.template_name : undefined,
            language: typeof args.language === 'string' ? args.language : undefined,
            options: typeof args.options === 'object' && args.options ? {
              include_chapters: typeof (args.options as Record<string, unknown>).include_chapters === 'boolean' 
                ? (args.options as Record<string, unknown>).include_chapters as boolean
                : false,
              search_term: typeof (args.options as Record<string, unknown>).search_term === 'string'
                ? (args.options as Record<string, unknown>).search_term as string
                : undefined
            } : undefined
          };
          
          const videoId = this.extractVideoId(validatedArgs.url);
          const templateName = validatedArgs.template_name || this.config.templates.default;
          const language = validatedArgs.language || 'en';
          const options = validatedArgs.options || { include_chapters: false };

          const template = this.config.templates.custom.find(t => t.name === templateName);
          if (!template) {
            throw new McpError(ErrorCode.InvalidRequest, `Template '${templateName}' not found`);
          }

          const [videoInfo, captions] = await Promise.all([
            this.getVideoInfo(videoId),
            this.getCaptions(videoId, language)
          ]);

          let markdown = '';

          // Add header if template has one
          if (template.format.header) {
            markdown += template.format.header
              .replace('{video_title}', videoInfo.snippet?.title || '')
              .replace('{channel_name}', videoInfo.snippet?.channelTitle || '')
              .replace('{publish_date}', videoInfo.snippet?.publishedAt || '');
          }

          // Process captions
          if (options.search_term) {
            const searchRegex = new RegExp(options.search_term, 'gi');
            const matches = captions.filter((caption: Caption) => searchRegex.test(caption.text));
            
            matches.forEach((match: Caption) => {
              markdown += template.format.search_result_format!
                .replace('{timestamp}', match.start)
                .replace('{text}', match.text.replace(searchRegex, (m: string) => `**${m}**`));
            });
          } else {
            captions.forEach((caption: Caption) => {
              let text = template.format.caption_block.replace('{text}', caption.text);
              if (template.format.timestamp_format) {
                text = template.format.timestamp_format.replace('{timestamp}', caption.start) + text;
              }
              markdown += text;
            });
          }

          return {
            content: [{
              type: 'text',
              text: markdown
            }]
          };
        }

        case 'list_templates': {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(this.config.templates.custom, null, 2)
            }]
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    });
  }

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
      resourceTemplates: [
        {
          uriTemplate: 'youtube://{video_id}/info',
          name: 'Video metadata',
          description: 'Access video metadata and chapters',
          mimeType: 'application/json'
        },
        {
          uriTemplate: 'youtube://{video_id}/captions/{lang}',
          name: 'Video captions',
          description: 'Access processed captions for specific language',
          mimeType: 'application/json'
        }
      ]
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const match = request.params.uri.match(/^youtube:\/\/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?$/);
      if (!match) {
        throw new McpError(ErrorCode.InvalidRequest, `Invalid URI format: ${request.params.uri}`);
      }

      const [_, videoId, type, lang] = match;

      switch (type) {
        case 'info': {
          const info = await this.getVideoInfo(videoId);
          return {
            contents: [{
              uri: request.params.uri,
              mimeType: 'application/json',
              text: JSON.stringify(info, null, 2)
            }]
          };
        }

        case 'captions': {
          if (!lang) {
            throw new McpError(ErrorCode.InvalidRequest, 'Language code required for captions');
          }
          const captions = await this.getCaptions(videoId, lang);
          return {
            contents: [{
              uri: request.params.uri,
              mimeType: 'application/json',
              text: JSON.stringify(captions, null, 2)
            }]
          };
        }

        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource type: ${type}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('YouTube MCP server running on stdio');
  }
}

const server = new YouTubeMcpServer();
server.run().catch(console.error);