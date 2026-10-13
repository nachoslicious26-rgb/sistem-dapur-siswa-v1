'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, KeyRound, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Kata Laluan Admin
    if (password === 'KHAR2627') {
      sessionStorage.setItem('admin_authenticated', 'true');
      router.push('/admin');
    } else {
      setError('Kata laluan salah!');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-xl border border-slate-200 space-y-6">
        
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-3">
            <img src="/logo-khar.png" alt="Logo KHAR" className="h-12 object-contain" />
            <img src="/logo-dapur-siswa.jpg" alt="Logo Dapur Siswa" className="h-12 object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 pt-2">Log Masuk Pentadbir</h1>
          <p className="text-xs font-bold text-blue-700">Dashboard Pentadbir Dapur Siswa Madani</p>
        </div>

        {/* Alert Ralat */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Borang Log Masuk (Password Sahaja) */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-slate-800 mb-1 block">Kata Laluan Pentadbir</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                placeholder="Masukkan kata laluan"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 p-2.5 pl-9 rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 mt-2"
          >
            <KeyRound className="w-4 h-4" />
            {loading ? 'Mengesahkan...' : 'Log Masuk Dashboard'}
          </button>
        </form>

        <div className="text-center border-t pt-4">
          <p className="text-[11px] text-slate-400 font-medium">
            Kolej Harun Aminurrashid (KHAR), UPSI
          </p>
        </div>

      </div>
    </main>
  );
}