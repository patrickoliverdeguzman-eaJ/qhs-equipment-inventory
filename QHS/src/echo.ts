import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import axios from 'axios';
import { backendBaseUrl, ensureCsrfCookie } from './axiosClient';

window.Pusher = Pusher;

const stubChannel = { listen: () => stubChannel, stopListening: () => stubChannel };
const fallbackEcho = {
  channel: () => stubChannel,
  private: () => stubChannel,
  leave: () => {},
  leaveChannel: () => {},
  socketId: () => null,
};

const realtimeEnabled = import.meta.env.DEV || import.meta.env.VITE_REVERB_ENABLED === 'true';

try {
  if (!realtimeEnabled) {
    throw new Error('Realtime broadcasting is not configured for this deployment.');
  }

  window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'qhs-local-key',
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT || 443),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || window.location.protocol.replace(':', '')) === 'https',
    enabledTransports: ['ws', 'wss'],
    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          await ensureCsrfCookie();
          const response = await axios.post(`${backendBaseUrl}/broadcasting/auth`, {
            socket_id: socketId,
            channel_name: channel.name,
          }, {
            withCredentials: true,
            withXSRFToken: true,
            headers: {
              Accept: 'application/json',
            },
          });
          callback(null, response.data);
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Channel authorization failed.'), null);
        }
      },
    }),
  });
} catch {
  window.Echo = fallbackEcho;
}
