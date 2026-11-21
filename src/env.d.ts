// Browser globals the pages use that TypeScript's DOM types do not include

// The YouTube player API (secrets.ts loads it from youtube.com only when it is needed)
declare const YT: {
  Player: new (element: Element, options: object) => unknown;
  PlayerState: { PLAYING: number; ENDED: number };
};

interface Window {
  webkitAudioContext?: typeof AudioContext;   // old Safari
  onYouTubeIframeAPIReady?: () => void;
}
