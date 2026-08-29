import { StreamChat } from 'stream-chat';

// Public key — safe to embed client-side, matches web app's NEXT_PUBLIC_STREAM_API_KEY.
const STREAM_API_KEY = 'y6fwhwm7qv3y';

export const streamClient = StreamChat.getInstance(STREAM_API_KEY);
