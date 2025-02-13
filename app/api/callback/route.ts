import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Here you would typically:
    // 1. Validate the callback data
    // 2. Store the generation status in your database
    // 3. Notify the client through WebSocket if needed
    
    console.log('Callback received:', body);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 