import { StreamVideoClient } from "@stream-io/video-react-sdk";

export function createStreamVideoClient(args: {
  apiKey: string;
  user: { id: string; name?: string; image?: string };
  tokenProvider: () => Promise<string>;
}) {
  return new StreamVideoClient({
    apiKey: args.apiKey,
    user: args.user,
    tokenProvider: args.tokenProvider,
  });
}
