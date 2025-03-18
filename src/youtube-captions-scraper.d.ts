declare module 'youtube-captions-scraper' {
  interface CaptionOptions {
    videoID: string;
    lang?: string;
  }

  interface Caption {
    start: string;
    dur: string;
    text: string;
  }

  export function getSubtitles(options: CaptionOptions): Promise<Caption[]>;
}