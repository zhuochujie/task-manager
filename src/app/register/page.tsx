'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || '出错了。');
    } else {
      setSuccess('注册成功！正在跳转到登录页面...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-center text-slate-800">
          注册
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block mb-1 text-sm font-medium text-slate-600"
            >
              邮箱地址
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2 transition duration-150 ease-in-out bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block mb-1 text-sm font-medium text-slate-600"
            >
              密码 (最少6位)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2 transition duration-150 ease-in-out bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          {error && <p className="text-sm text-center text-red-600">{error}</p>}
          {success && <p className="text-sm text-center text-green-600">{success}</p>}
          <div>
            <button
              type="submit"
              disabled={!!success}
              className="w-full px-4 py-3 text-sm font-bold text-white transition-colors duration-150 bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              创建账户
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-slate-500">
          已经有账户了？{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            前往登录
          </Link>
        </p>
      </div>
    </div>
  );
}
