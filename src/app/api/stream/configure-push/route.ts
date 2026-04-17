import { NextResponse } from "next/server";
import { serverClient } from "@/lib/streamServer";

export async function GET(req: Request) {
  try {
    const firebaseCredentials = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (!firebaseCredentials.project_id || !firebaseCredentials.private_key || !firebaseCredentials.client_email) {
      throw new Error("Missing Firebase service account environment variables.");
    }
    
    const notification_template = `{% if channel.member_count > 2 %}{{ sender.name }} ({{ channel.name }}){% else %}{{ sender.name }}{% endif %}: {{ truncate message.text 250 }}`;
    const data_template = `{"view":"chat","cid":"{{channel.type}}:{{channel.id}}","source":"push"}`;

    await serverClient.updateAppSettings({
      push_notifications: {
        version: 'v2',
        firebase_config: {
          credentials_json: JSON.stringify(firebaseCredentials),
          notification_template: notification_template,
          data_template: data_template
        },
      },
    });

    return NextResponse.json({ ok: true, message: "Stream push configured successfully with Firebase V2." });
  } catch (e: any) {
    console.error("Stream push config API error:", e);
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
