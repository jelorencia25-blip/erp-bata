'use client';
import { useState } from 'react';
import { supabase } from '@/lib/lib/supabase';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, username, password, role')
      .eq('username', username)
      .single();

    if (fetchError || !user) {
      setError('User tidak ditemukan');
      setLoading(false);
      return;
    }

    if (user.password !== password) {
      setError('Password salah');
      setLoading(false);
      return;
    }

    // 🔥 SIMPAN ROLE
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role, // <--- PENTING
      })
    );

    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#195AAF]">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-8">
        <div className="text-center mb-6">
          <p className="text-gray-500">Welcome!</p>
          <h1 className="text-2xl font-bold text-gray-800">Sign In</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Username</label>
            <input
              type="text"
              className="w-full border rounded-md px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded-md px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#195AAF] text-white py-2 rounded-md"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
