import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebaseAdmin";

/**
 * Parses the Range header for partial content streaming.
 */
function parseRange(rangeHeader: string | null, fileSize: number) {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return null;
  }

  const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-");
  const start = Number(startStr);
  const end = endStr ? Number(endStr) : fileSize - 1;

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start < 0 ||
    end < start ||
    end >= fileSize
  ) {
    return null;
  }

  return { start, end };
}

/**
 * Searches the bucket for a file with the given filename across common prefixes.
 */
async function findFileByFilename(bucketName: string, filename: string) {
  if (!adminStorage) return null;
  const bucket = adminStorage.bucket(bucketName);

  const prefixes = [
    "recordings/",
    "video/recordings/",
    "1486092/video/recordings/",
    "", // broad search if needed
  ];

  for (const prefix of prefixes) {
    try {
      const [files] = await bucket.getFiles({ prefix, autoPaginate: false });
      // Match by exact filename at the end of the path
      const exact = files.find((f) => f.name === filename || f.name.endsWith(`/${filename}`));
      if (exact) return exact;
    } catch (e) {
      console.warn(`Search failed for prefix ${prefix}:`, e);
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");
    const callId = searchParams.get("callId");

    if (!filename) {
      return new NextResponse("Missing filename", { status: 400 });
    }

    const bucketName =
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      "studio-3085722089-f47ec.firebasestorage.app";

    console.log(`Proxy request for ${filename} (ID: ${callId || 'N/A'})`);

    const file = await findFileByFilename(bucketName, filename);

    if (!file) {
      console.error(`Recording file ${filename} not found in bucket ${bucketName}`);
      return new NextResponse("Recording file not found", { status: 404 });
    }

    const [metadata] = await file.getMetadata();
    const fileSize = Number(metadata.size || 0);
    const contentType = metadata.contentType || "video/mp4";
    
    const rangeHeader = req.headers.get("range");
    const parsedRange = parseRange(rangeHeader, fileSize);

    if (parsedRange) {
      const { start, end } = parsedRange;
      const chunkSize = end - start + 1;

      // Stream a partial range for the video player
      const stream = file.createReadStream({ start, end });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(chunkSize),
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // Stream the entire file
    const stream = file.createReadStream();

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("recording-proxy error:", error);
    return new NextResponse(error?.message || "Server error", { status: 500 });
  }
}
