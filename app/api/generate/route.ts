import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, style, title, instrumental = true, model = 'V3_5' } = body;

    const response = await fetch('https://apibox.erweima.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ERWEIMA_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        style,
        title,
        customMode: true,
        instrumental,
        model,
        callBackUrl: `${req.nextUrl.origin}/api/callback`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || 'Failed to generate audio');
    }

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 