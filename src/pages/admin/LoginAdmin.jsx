import React, {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import toast from 'react-hot-toast';

import {
  supabase
} from '../../lib/supabaseClient';

const LoginAdmin = () => {

  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================

  const [showPassword, setShowPassword] =
    useState(false);

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // =========================
  // ERROR MESSAGE
  // =========================

  const getErrorMessage = (
    message
  ) => {

    switch (message) {

      case 'Invalid login credentials':
        return 'Email atau password salah!';

      case 'Email rate limit exceeded':
        return 'Terlalu banyak request. Coba lagi nanti!';

      case 'Auth session missing':
        return 'Session tidak ditemukan!';

      default:
        return 'Terjadi kesalahan!';
    }
  };

  // =========================
  // AUTO LOGIN
  // =========================

  useEffect(() => {

    const checkSession =
      async () => {

        const {
          data: { session }
        } = await supabase.auth
          .getSession();

        if (session) {

          navigate('/admin');

        } else {

          setEmail('');
          setPassword('');
        }
      };

    checkSession();

  }, [navigate]);

  // =========================
  // HANDLE LOGIN
  // =========================

  const handleLogin =
    async (e) => {

      e.preventDefault();

      if (loading) return;

      // VALIDASI KOSONG
      if (!email || !password) {

        toast.error(
          'Semua field wajib diisi!'
        );

        return;
      }

      // VALIDASI EMAIL
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(email)
      ) {

        toast.error(
          'Format email tidak valid!'
        );

        return;
      }

      setLoading(true);

      try {

        const { error } =
          await supabase.auth
            .signInWithPassword({

              email,
              password,

            });

        if (error) {

          toast.error(
            getErrorMessage(
              error.message
            )
          );

          setLoading(false);

          return;
        }

        toast.success(
          'Login berhasil!'
        );

        // RESET FORM
        setEmail('');
        setPassword('');

        setTimeout(() => {

          navigate('/admin');

        }, 1000);

      } catch (error) {

        console.error(error);

        toast.error(
          'Terjadi kesalahan!'
        );

      } finally {

        setLoading(false);

      }
    };

  // =========================
  // RESET PASSWORD
  // =========================

  const handleResetPassword =
    async () => {

      if (loading) return;

      if (!email) {

        toast.error(
          'Masukkan email terlebih dahulu!'
        );

        return;
      }

      setLoading(true);

      try {

        const { error } =
          await supabase.auth
            .resetPasswordForEmail(
              email,
              {
                redirectTo:
                  `${window.location.origin}/reset-password`
              }
            );

        if (error) {

          toast.error(
            getErrorMessage(
              error.message
            )
          );

          setLoading(false);

          return;
        }

        toast.success(
          'Link reset password berhasil dikirim!'
        );

        setCooldown(true);

        setTimeout(() => {

          setCooldown(false);

        }, 60000);

      } catch (error) {

        console.error(error);

        toast.error(
          'Terjadi kesalahan!'
        );

      } finally {

        setLoading(false);

      }
    };

  return (

    <section
      className="min-h-screen flex items-center justify-center px-5 text-white bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,35,102,0.82), rgba(0,35,102,0.82)), url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1350&q=80')",
      }}
    >

      <div className="w-full max-w-md backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">

        {/* HEADER */}
        <div className="text-center mb-8">

          <span className="block mb-2 text-sm tracking-widest uppercase text-[#FF8C00] font-semibold">

            Kios Mom's

          </span>

          <h1 className="text-3xl md:text-4xl font-bold mb-2">

            Login Admin

          </h1>

          <p className="text-sm opacity-70">

            Sistem Manajemen Admin

          </p>

        </div>

        {/* FORM */}
        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >

          {/* EMAIL */}
          <div>

            <label className="text-sm mb-2 block font-medium">

              Email

            </label>

            <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus-within:border-[#FF8C00] transition-all">

              {/* EMAIL SVG */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 mr-3 opacity-70"
              >

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91A2.25 2.25 0 012.25 6.993V6.75"
                />

              </svg>

              <input
                type="email"
                autoComplete="off"
                placeholder="Masukkan email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                className="bg-transparent outline-none w-full placeholder:text-white/50"
              />

            </div>

          </div>

          {/* PASSWORD */}
          <div>

            <label className="text-sm mb-2 block font-medium">

              Password

            </label>

            <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus-within:border-[#FF8C00] transition-all">

              {/* LOCK SVG */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 mr-3 opacity-70"
              >

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-1.5 0h12a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5h-12A1.5 1.5 0 014.5 19.5v-7.5a1.5 1.5 0 011.5-1.5z"
                />

              </svg>

              <input
                autoComplete="new-password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                placeholder="Masukkan password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                className="bg-transparent outline-none w-full placeholder:text-white/50"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="ml-2 opacity-70 hover:opacity-100 transition-all"
              >

                {showPassword ? (

                  // EYE OFF
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3l18 18"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.477 10.484a3 3 0 004.243 4.243"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.88 5.09A10.94 10.94 0 0112 4.875c5.25 0 9.27 3.438 10.5 8.25a10.958 10.958 0 01-4.293 5.568M6.228 6.228A10.958 10.958 0 001.5 13.125a10.958 10.958 0 005.106 6.093"
                    />

                  </svg>

                ) : (

                  // EYE
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12 18 19.5 12 19.5 2.25 12 2.25 12z"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />

                  </svg>

                )}

              </button>

            </div>

          </div>

          {/* LUPA PASSWORD */}
          <div className="text-right">

            <button
              type="button"
              onClick={
                handleResetPassword
              }
              className="text-sm text-[#FF8C00] hover:underline"
            >

              Lupa Password?

            </button>

          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF8C00] hover:bg-orange-500 disabled:opacity-70 transition-all duration-300 text-white font-semibold py-3 rounded-xl shadow-lg hover:scale-[1.02]"
          >

            {loading
              ? 'Memproses...'
              : 'Masuk Admin'}

          </button>

        </form>

      </div>

    </section>
  );
};

export default LoginAdmin;