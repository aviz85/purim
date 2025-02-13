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
    const { task_id, data, callbackType } = body.data;

    if (callbackType === 'complete' && data?.[0]) {
      const songData = data[0];
      await supabase.from('songs').upsert({
        task_id,
        status: 'SUCCESS',
        audio_url: songData.audioUrl,
        stream_audio_url: songData.streamAudioUrl,
        image_url: songData.imageUrl,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'task_id'
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Callback error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 