import { StreamChat } from "stream-chat";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
if (!apiKey) throw new Error("NEXT_PUBLIC_STREAM_API_KEY is not set");

export const streamClient = StreamChat.getInstance(apiKey);
