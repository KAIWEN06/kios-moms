import React, {
  useEffect,
  useState
} from 'react';

import {
  useNavigate
} from 'react-router-dom';

import toast from 'react-hot-toast';

import {
  supabase
} from '../../lib/supabaseClient';

const ResetPassword = () => {

  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================

  const [password, setPassword] =
    useState('');

  const [confirmPassword,
    setConfirmPassword] =
    useState('');

  const [showPassword,
    setShowPassword] =
    useState(false);

  const [showConfirmPassword,
    setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  // =========================
  // ERROR MESSAGE
  // =========================

  const getErrorMessage = (
    message
  ) => {

    switch (message) {

      case 'Auth session missing':
        return 'Link reset password tidak valid!';

      case 'New password should be different from the old password':
        return 'Password baru harus berbeda dari password lama!';

      default:
        return 'Terjadi kesalahan!';
    }
  };

  // =========================
  // CHECK SESSION
  // =========================

  useEffect(() => {

    const checkSession =
      async () => {

        const {
          data: { session }
        } = await supabase.auth
          .getSession();

        if (!session) {

          toast.error(
            'Link reset tidak valid!'
          );

          navigate('/admin/login');
        }
      };

    checkSession();

  }, [navigate]);

  // =========================
  // HANDLE UPDATE PASSWORD
  // =========================

  const handleUpdatePassword =
    async (e) => {

      e.preventDefault();

      if (loading || cooldown) {

        toast.error(
          'Tunggu beberapa saat!'
        );

        return;
      }

      // VALIDASI FIELD
      if (
        !password ||
        !confirmPassword
      ) {

        toast.error(
          'Semua field wajib diisi!'
        );

        return;
      }

      // MINIMAL 8 KARAKTER
      if (password.length < 8) {

        toast.error(
          'Password minimal 8 karakter!'
        );

        return;
      }

      // HURUF BESAR
      if (!/[A-Z]/.test(password)) {

        toast.error(
          'Password harus memiliki huruf besar!'
        );

        return;
      }

      // HURUF KECIL
      if (!/[a-z]/.test(password)) {

        toast.error(
          'Password harus memiliki huruf kecil!'
        );

        return;
      }

      // ANGKA
      if (!/[0-9]/.test(password)) {

        toast.error(
          'Password harus memiliki angka!'
        );

        return;
      }

      // SIMBOL
      if (!/[^A-Za-z0-9]/.test(password)) {

        toast.error(
          'Password harus memiliki simbol!'
        );

        return;
      }

      // KONFIRMASI PASSWORD
      if (password !== confirmPassword) {

        toast.error(
          'Konfirmasi password tidak cocok!'
        );

        return;
      }

      setLoading(true);

      try {

        const { error } =
          await supabase.auth
            .updateUser({

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
          'Password berhasil diubah!'
        );

        setTimeout(() => {

          navigate('/admin/login'); 

        }, 1500);

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

            Reset Password

          </h1>

          <p className="text-sm opacity-70">

            Buat password baru untuk akun admin

          </p>

        </div>

        {/* FORM */}
        <form
          onSubmit={handleUpdatePassword}
          className="space-y-5"
        >

          {/* PASSWORD */}
          <div>

            <label className="text-sm mb-2 block font-medium">

              Password Baru

            </label>

            <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus-within:border-[#FF8C00] transition-all">

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                placeholder="Masukkan password baru"
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

          {/* KONFIRMASI PASSWORD */}
          <div>

            <label className="text-sm mb-2 block font-medium">

              Konfirmasi Password

            </label>

            <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus-within:border-[#FF8C00] transition-all">

              <input
                type={
                  showConfirmPassword
                    ? 'text'
                    : 'password'
                }
                placeholder="Ulangi password baru"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                className="bg-transparent outline-none w-full placeholder:text-white/50"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                className="ml-2 opacity-70 hover:opacity-100 transition-all"
              >

                {showConfirmPassword ? (

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

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF8C00] hover:bg-orange-500 disabled:opacity-70 transition-all duration-300 text-white font-semibold py-3 rounded-xl shadow-lg hover:scale-[1.02]"
          >

            {loading
              ? 'Memproses...'
              : 'Simpan Password'}

          </button>

        </form>

      </div>

    </section>
  );
};

export default ResetPassword;