'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError('邮箱或密码无效，请重试。');
    } else if (result?.ok) {
      router.push('/');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-center text-slate-800">
          登录
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
              className="block w-full px-3 py-2 transition duration-150 ease-in-out border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block mb-1 text-sm font-medium text-slate-600"
            >
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2 transition duration-150 ease-in-out border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          {error && <p className="text-sm text-center text-red-600">{error}</p>}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-3 text-sm font-bold text-white transition-colors duration-150 bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              登录
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-slate-500">
          还没有账户？{' '}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
