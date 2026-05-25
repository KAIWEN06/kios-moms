import React from 'react';
import toast from 'react-hot-toast';
import {
  NavLink,
  useNavigate,
} from 'react-router-dom';

import {
  supabase
} from '../../lib/supabaseClient';

const HeaderAdmin = () => {

  const navigate = useNavigate();

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {

  try {

    await supabase.auth.signOut();

    toast.success(
      'Berhasil logout!'
    );

    navigate('/');

  } catch (error) {

    console.error(error);

    toast.error(
      'Gagal logout!'
    );
  }
};

  // =========================
  // MENU
  // =========================

  const menuItems = [

    {
      name: 'Beranda',
      path: '/admin'
    },

    {
      name: 'Buat Pesanan',
      path: '/admin/buat-pesanan'
    },

    {
      name: 'Pesanan',
      path: '/admin/pesanan'
    },

    {
      name: 'Proses Pesanan',
      path: '/admin/proses-pesanan'
    },

    {
      name: 'Riwayat',
      path: '/admin/riwayat-pesanan'
    },

    {
      name: 'Kelola Menu',
      path: '/admin/kelola-menu'
    },

    {
      name: 'Laporan',
      path: '/admin/laporan'
    },

  ];

  return (

    <header className="bg-[#002366] text-white py-4 px-5 shadow-md sticky top-0 z-[100]">

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">

        {/* LOGO */}
        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-full bg-[#FF8C00] flex items-center justify-center font-bold text-lg shadow-lg">

            K

          </div>

          <div>

            <h1 className="text-lg font-bold leading-none">

              Kios Mom's

            </h1>

            <p className="text-xs opacity-70">

              Panel Admin

            </p>

          </div>

        </div>

        {/* MENU */}
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 items-center">

          {menuItems.map((item) => (

            <li key={item.path}>

              <NavLink
                  to={item.path}
                  end={item.path === '/admin'}
                  className={({ isActive }) =>
                    `text-[15px] font-medium transition-all duration-300 hover:text-[#FF8C00] ${
                      isActive
                        ? 'text-[#FF8C00] font-bold'
                        : 'text-white'
                    }`
                  }
                >

                {item.name}

              </NavLink>

            </li>
          ))}

        </ul>

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-300 shadow-lg"
        >

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
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l-3-3m3 3l-3 3m3-3H9"
            />

          </svg>

          Logout

        </button>

      </div>

    </header>
  );
};

export default HeaderAdmin;