'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/utils/supabase';
import type { Song } from '@/utils/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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

interface ProgressLog {
  status: Song['status'];
  timestamp: number;
}

const PROGRESS_STEPS = {
  'PENDING': 0,
  'TEXT_SUCCESS': 33,
  'FIRST_SUCCESS': 66,
  'SUCCESS': 100,
  'CREATE_TASK_FAILED': 100,
  'GENERATE_AUDIO_FAILED': 100,
  'CALLBACK_EXCEPTION': 100,
  'SENSITIVE_WORD_ERROR': 100,
} as const;

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

interface AudioPlayerProps {
  song: Song;
}

const AudioPlayer = ({ song }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current?.src) {
      // If no src is set, try audio_url first, then fall back to stream_audio_url
      const audioSource = song.audio_url || song.stream_audio_url;
      if (audioSource) {
        setIsLoading(true);
        audioRef.current!.src = audioSource;
        audioRef.current!.load();
        audioRef.current!.play().catch(error => {
          console.error('Error playing audio:', error);
          setIsLoading(false);
        });
        setIsPlaying(true);
      }
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Reset player when song changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.src = '';
    }
  }, [song.id]);

  const canPlay = song.status === 'SUCCESS' || song.stream_audio_url;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="flex flex-col">
        {song.image_url ? (
          <div className="relative w-full h-48">
            <Image
              src={song.image_url}
              alt={song.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 42rem"
              priority
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-grow">
              <h3 className="font-medium text-lg">{song.title}</h3>
              <p className="text-sm text-gray-600">{song.prompt}</p>
              <p className="text-sm text-gray-500">Style: {song.style}</p>
            </div>
            <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(song.status)}`}>
              {getStatusText(song.status)}
            </span>
          </div>

          {canPlay && (
            <div className="space-y-2">
              <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                  console.error('Audio error:', e);
                  setIsLoading(false);
                }}
              />
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePlayPause}
                  disabled={isLoading}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                <div className="flex-grow flex items-center space-x-2">
                  <span className="text-sm text-gray-500 w-12">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-grow h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <span className="text-sm text-gray-500 w-12">{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);

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
        {
          event: '*',
          schema: 'public',
          table: 'songs',
        },
        (payload: RealtimePostgresChangesPayload<Song>) => {
          if (payload.new) {
            const newSong = payload.new as Song;
            setSongs((prev) => {
              const exists = prev.find((song) => song.id === newSong.id);
              if (exists) {
                return prev.map((song) =>
                  song.id === newSong.id ? newSong : song
                );
              }
              return [newSong, ...prev].slice(0, 10);
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

      if (data.code === 200) {
        const status = data.data.status;
        setCurrentProgress(PROGRESS_STEPS[status] || 0);
        
        setProgressLogs(prev => {
          const lastLog = prev[prev.length - 1];
          if (!lastLog || lastLog.status !== status) {
            return [...prev, { status, timestamp: Date.now() }];
          }
          return prev;
        });

        if (status === 'SUCCESS') {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Status check error:', error);
      return false;
    }
  };

  const pollStatus = async (taskId: string) => {
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes with 1-second intervals
    const interval = 1000; // 1 second

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
    setProgressLogs([]);
    setCurrentProgress(0);
    
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

        {loading && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-md">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Generation Progress</span>
                <span>{currentProgress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>

            {progressLogs.length > 0 && (
              <div className="space-y-1 mt-4">
                {progressLogs.map((log, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <span className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(log.status)}`} />
                    <span>{getStatusText(log.status)}</span>
                    <span className="text-gray-400 ml-2">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {songs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recent Songs</h2>
            {songs.map((song) => (
              <AudioPlayer key={song.id} song={song} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
