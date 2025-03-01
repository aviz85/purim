import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest): Promise<Response> {
  const taskId = request.nextUrl.pathname.split('/').pop();

  if (!taskId) {
    return Response.json({ error: 'Task ID is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://apibox.erweima.ai/api/v1/generate/record-info?taskId=${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ERWEIMA_API_KEY}`,
          Accept: 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || 'Failed to check status');
    }

    // Update song status in Supabase
    if (data.data?.status) {
      await supabase.from('songs').update({
        status: data.data.status,
        updated_at: new Date().toISOString(),
        ...(data.data.response?.sunoData?.[0] && {
          audio_url: data.data.response.sunoData[0].audioUrl,
          stream_audio_url: data.data.response.sunoData[0].streamAudioUrl,
          image_url: data.data.response.sunoData[0].imageUrl,
        }),
      }).eq('task_id', taskId);
    }

    return Response.json(data);
  } catch (error) {
    console.error('Status check error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 