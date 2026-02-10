// app/forgot-password/page.tsx
"use client";
import { useState } from 'react';
import Link from 'next/link';
import {forgotPassword} from '../../lib/firebase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setMessage('Password reset email sent! Please check your inbox.');
        setError('');
      } else {
        setError(result.error || 'Failed to send password reset email');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Forgot Password</h1>
      {message && <p className="text-green-500 mb-4">{message}</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>
        <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
          Send Reset Link
        </button>
      </form>
      <p className="mt-4">
        Remember your password? <Link href="/login" className="text-blue-500">Login</Link>
      </p>
    </div>
  );
}
