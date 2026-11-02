import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Basic validation
    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      setIsSubmitting(false);
      return;
    }

    if (!/^[\d+]+$/.test(phone)) {
      setError('Nomor telepon hanya boleh berisi angka dan tanda +');
      setIsSubmitting(false);
      return;
    }

    try {
      await register(name, email, password, phone);
      navigate('/'); // Redirect to home after successful registration
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('Email sudah terdaftar')) {
          setError('Email sudah terdaftar');
        } else {
          setError(err.message);
        }
      } else {
        setError('Registrasi gagal');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage mx-auto mb-4"></div>
          <p className="text-ink">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-wood mb-2">Daftar Akun</h1>
          <p className="text-ink text-sm">Buat akun baru untuk mulai memesan kamar</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-1">
              Nama Lengkap
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Anda"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@contoh.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage"
            />
            <p className="mt-1 text-xs text-gray-500">Minimal 8 karakter</p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-ink mb-1">
              Nomor Telepon
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage"
            />
            <p className="mt-1 text-xs text-gray-500">Hanya angka dan tanda +</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-sage hover:bg-sage-dark text-white font-medium py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sedang mendaftar...' : 'Daftar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-ink">
          Sudah punya akun?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-sage hover:text-sage-dark font-medium underline"
          >
            Login di sini
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
