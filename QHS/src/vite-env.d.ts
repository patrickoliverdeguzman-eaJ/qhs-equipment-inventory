/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_REVERB_ENABLED?: string;
  readonly VITE_REVERB_APP_KEY?: string;
  readonly VITE_REVERB_HOST?: string;
  readonly VITE_REVERB_PORT?: string;
  readonly VITE_REVERB_SCHEME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface RealtimeChannel {
  listen(event: string, callback: (payload: unknown) => void): RealtimeChannel;
  stopListening(event: string): RealtimeChannel;
}

interface RealtimeClient {
  channel(name: string): RealtimeChannel;
  private(name: string): RealtimeChannel;
  leave(name: string): void;
  leaveChannel(name: string): void;
  socketId(): string | null | undefined;
}

interface Window {
  Echo?: RealtimeClient;
  Pusher?: unknown;
}
