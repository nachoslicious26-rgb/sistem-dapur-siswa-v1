'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, KeyRound } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'KHAR2627') {
      sessionStorage.setItem('admin_authenticated', 'true');
      router.push('/admin');
    } else {
      setError('Kata laluan salah. Sila cuba lagi.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-2">
            <img src="/logo-khar.png" alt="Logo KHAR" className="h-12 object-contain" />
            <img src="/logo-dapur-siswa.jpg" alt="Logo Dapur Siswa" className="h-12 object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 pt-2">Log Masuk Pentadbir (Admin)</h1>
          <p className="text-xs font-bold text-blue-700">Sistem Tempahan Dapur Siswa Madani KHAR</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-extrabold text-rose-700 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-slate-900 mb-1 block">Kata Laluan Pentadbir</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                placeholder="Masukkan Kata Laluan"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 p-2.5 pl-9 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-500 bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" /> Log Masuk
          </button>
        </form>
      </div>

      {/* FOOTER HAK CIPTA RASMI & PEREKA */}
      <footer className="mt-8 text-center text-xs text-slate-600 font-bold max-w-md w-full">
        <p>© 2026 Sistem Tempahan Dapur Siswa Madani. Hak Cipta Terpelihara Kolej Harun Aminurrashid (KHAR), UPSI.</p>
        <p className="text-[11px] text-slate-500 font-semibold mt-1">Designed by: Astranova</p>
      </footer>
    </main>
  );
}