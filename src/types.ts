import { ErrorCode as McpErrorCode } from '@modelcontextprotocol/sdk/types.js';

export interface Caption {
  start: string;
  dur: string;
  text: string;
}

export interface VideoOptions {
  include_chapters?: boolean;
  search_term?: string;
}

export interface BaseToolArguments {
  url: string;
}

export interface GetVideoInfoArgs extends BaseToolArguments {}

export interface GetCaptionsArgs extends BaseToolArguments {
  language?: string;
}

export interface ConvertToMarkdownArgs extends BaseToolArguments {
  template_name?: string;
  language?: string;
  options?: VideoOptions;
}

export type ToolArguments = GetVideoInfoArgs | GetCaptionsArgs | ConvertToMarkdownArgs;

// Error codes
export const ErrorCode = {
  ...McpErrorCode,
  NotFound: 404
};

export type ArgumentsType<T> = T extends { arguments: infer A } ? A : never;