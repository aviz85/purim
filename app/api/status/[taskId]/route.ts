import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface RouteSegmentConfig {
  params: {
    taskId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteSegmentConfig
): Promise<Response> {
  try {
    const response = await fetch(
      `https://apibox.erweima.ai/api/v1/generate/record-info?taskId=${params.taskId}`,
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
          audio_url: data.data.response.sunoData[0].audio_url,
          stream_audio_url: data.data.response.sunoData[0].stream_audio_url,
          image_url: data.data.response.sunoData[0].image_url,
        }),
      }).eq('task_id', params.taskId);
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