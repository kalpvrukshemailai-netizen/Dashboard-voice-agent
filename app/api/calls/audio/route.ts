import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversation_id" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server missing ELEVENLABS_API_KEY" }, { status: 500 });
    }

    const audioUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`;
    const response = await fetch(audioUrl, {
      headers: { "xi-api-key": apiKey },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch audio from ElevenLabs" }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audio stream error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
