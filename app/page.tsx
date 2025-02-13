'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/utils/supabase';
import type { Song } from '@/utils/supabase';

interface GenerationResult {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

interface StatusResponse {
  code: number;
  msg: string;
  data: {
    status: Song['status'];
    response?: {
      sunoData?: Array<{
        audio_url: string;
        stream_audio_url: string;
        image_url: string;
      }>;
    };
  };
}

const getStatusColor = (status: Song['status']) => {
  switch (status) {
    case 'SUCCESS':
      return 'bg-green-100 text-green-700';
    case 'PENDING':
    case 'TEXT_SUCCESS':
    case 'FIRST_SUCCESS':
      return 'bg-yellow-100 text-yellow-700';
    case 'CREATE_TASK_FAILED':
    case 'GENERATE_AUDIO_FAILED':
    case 'CALLBACK_EXCEPTION':
    case 'SENSITIVE_WORD_ERROR':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getStatusText = (status: Song['status']) => {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'TEXT_SUCCESS':
      return 'Text Generated';
    case 'FIRST_SUCCESS':
      return 'First Track Ready';
    case 'SUCCESS':
      return 'Complete';
    case 'CREATE_TASK_FAILED':
      return 'Task Failed';
    case 'GENERATE_AUDIO_FAILED':
      return 'Generation Failed';
    case 'CALLBACK_EXCEPTION':
      return 'Callback Error';
    case 'SENSITIVE_WORD_ERROR':
      return 'Content Filtered';
    default:
      return status;
  }
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    const fetchSongs = async () => {
      const { data } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setSongs(data);
    };

    fetchSongs();

    // Subscribe to changes
    const channel = supabase
      .channel('songs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs' },
        (payload) => {
          if (payload.new) {
            setSongs((prev) => {
              const exists = prev.find((song) => song.id === payload.new.id);
              if (exists) {
                return prev.map((song) =>
                  song.id === payload.new.id ? payload.new : song
                );
              }
              return [payload.new, ...prev].slice(0, 10);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/status/${taskId}`);
      const data: StatusResponse = await response.json();

      if (data.code === 200 && data.data.status === 'SUCCESS') {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Status check error:', error);
      return false;
    }
  };

  const pollStatus = async (taskId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    const interval = 10000; // 10 seconds

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('Generation timed out');
        return;
      }

      const isComplete = await checkStatus(taskId);
      if (isComplete) {
        setLoading(false);
      } else {
        attempts++;
        setTimeout(poll, interval);
      }
    };

    await poll();
  };

  const generateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: formData.get('prompt'),
          style: formData.get('style'),
          title: formData.get('title'),
          instrumental: true,
          model: 'V3_5',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate song');
      pollStatus(data.data.taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">AI Song Generator</h1>
        
        <form onSubmit={generateSong} className="space-y-4">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium mb-1">
              Prompt
            </label>
            <textarea
              id="prompt"
              name="prompt"
              required
              className="w-full p-2 border rounded-md"
              placeholder="A calm and relaxing piano track with soft melodies"
            />
          </div>
          
          <div>
            <label htmlFor="style" className="block text-sm font-medium mb-1">
              Style
            </label>
            <input
              type="text"
              id="style"
              name="style"
              required
              className="w-full p-2 border rounded-md"
              placeholder="Classical"
            />
          </div>
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              className="w-full p-2 border rounded-md"
              placeholder="Peaceful Piano Meditation"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Song'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {songs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recent Songs</h2>
            {songs.map((song) => (
              <div
                key={song.id}
                className="p-4 border rounded-md space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{song.title}</h3>
                    <p className="text-sm text-gray-600">{song.prompt}</p>
                    <p className="text-sm text-gray-500">Style: {song.style}</p>
                  </div>
                  <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(song.status)}`}>
                    {getStatusText(song.status)}
                  </span>
                </div>
                {song.status === 'SUCCESS' && song.audio_url && (
                  <audio controls className="w-full">
                    <source src={song.audio_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                )}
                {song.status === 'SUCCESS' && song.image_url && (
                  <div className="relative w-full h-40">
                    <Image
                      src={song.image_url}
                      alt={song.title}
                      fill
                      className="object-cover rounded-md"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
