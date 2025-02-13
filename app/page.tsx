'use client';

import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
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

        {result && (
          <div className="p-4 bg-green-100 text-green-700 rounded-md">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
