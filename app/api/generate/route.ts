import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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

    // Store initial song data in Supabase
    await supabase.from('songs').insert({
      task_id: data.data.taskId,
      prompt,
      style,
      title,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 