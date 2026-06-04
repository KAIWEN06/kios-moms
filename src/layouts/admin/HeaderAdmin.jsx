import React, { useState } from 'react';

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

  const [openMenu, setOpenMenu] =
    useState(false);

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {

    try {

      await supabase.auth.signOut();

      toast.success(
        'Berhasil keluar!'
      );

      navigate('/');

    } catch (error) {

      console.error(error);

      toast.error(
        'Gagal keluar!'
      );

    }

  };

  // =========================
  // MENU
  // =========================

  const menu = [

    {
      nama: 'Beranda',
      path: '/admin'
    },

    {
      nama: 'Buat Pesanan',
      path: '/admin/buat-pesanan'
    },

    {
      nama: 'Pesanan',
      path: '/admin/pesanan'
    },

    {
      nama: 'Proses Pesanan',
      path: '/admin/proses-pesanan'
    },

    {
      nama: 'Riwayat',
      path: '/admin/riwayat-pesanan'
    },

    {
      nama: 'Kelola Menu',
      path: '/admin/kelola-menu'
    },

    {
      nama: 'Laporan',
      path: '/admin/laporan'
    }

  ];

  return (

    <>
      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <header
        className="
        bg-[#002366]
        text-white
        sticky
        top-0
        z-[100]
        shadow-md
        "
      >

        <div
          className="
          w-full
          px-4
          lg:px-10
          h-24
          flex
          items-center
          justify-between
          "
        >

          {/* ========================= */}
          {/* LOGO */}
          {/* ========================= */}

          <div
            className="
            cursor-pointer
            "
            onClick={() =>
              navigate('/admin')
            }
          >

            <h1
              className="
              text-3xl
              sm:text-4xl
              font-black
              "
            >

              Kios{' '}

              <span
                className="
                text-[#FF8C00]
                "
              >

                Mom's

              </span>

            </h1>

            <p
              className="
              text-xs
              sm:text-sm
              text-white/60
              "
            >

              Panel Administrator

            </p>

          </div>

          {/* ========================= */}
          {/* DESKTOP MENU */}
          {/* ========================= */}

          <div
            className="
            hidden
            xl:flex
            items-center
            gap-6
            "
          >

            <ul
              className="
              flex
              items-center
              gap-6
              "
            >

              {
                menu.map(
                  (item) => (

                    <li
                      key={item.path}
                    >

                      <NavLink
                        to={item.path}
                        end={
                          item.path ===
                          '/admin'
                        }
                        className={({
                          isActive
                        }) =>
                          `
                          text-[15px]
                          font-bold
                          transition-all
                          duration-300

                          ${
                            isActive
                              ? 'text-[#FF8C00]'
                              : 'text-white hover:text-[#FF8C00]'
                          }
                          `
                        }
                      >

                        {item.nama}

                      </NavLink>

                    </li>

                  )
                )
              }

            </ul>

            <button
              onClick={
                handleLogout
              }
              className="
              px-5
              py-3
              rounded-2xl
              bg-red-500
              hover:bg-red-600
              text-white
              font-bold
              transition-all
              duration-300
              "
            >

              Keluar

            </button>

          </div>

          {/* ========================= */}
          {/* HAMBURGER */}
          {/* ========================= */}

          <button
            onClick={() =>
              setOpenMenu(!openMenu)
            }
            className="
            xl:hidden
            w-14
            h-14
            rounded-2xl
            bg-[#FF8C00]
            text-white
            text-3xl
            font-black
            hover:scale-105
            transition-all
            duration-300
            shadow-lg
            "
          >

            {openMenu ? '✕' : '☰'}

          </button>

        </div>

      </header>

      {/* ========================= */}
      {/* SIDEBAR */}
      {/* ========================= */}

      <div
        className={`

        fixed
        top-0
        left-0
        h-screen
        w-[320px]
        max-w-[85vw]
        bg-[#002366]
        shadow-2xl
        z-[999]
        transition-all
        duration-300

        ${
          openMenu
            ? 'translate-x-0'
            : '-translate-x-full'
        }

        `}
      >

        {/* ========================= */}
        {/* SIDEBAR HEADER */}
        {/* ========================= */}

        <div
          className="
          h-24
          border-b
          border-white/10
          flex
          items-center
          px-6
          "
        >

          <div>

            <h1
              className="
              text-3xl
              font-black
              text-white
              "
            >

              Kios{' '}

              <span
                className="
                text-[#FF8C00]
                "
              >

                Mom's

              </span>

            </h1>

            <p
              className="
              text-sm
              text-white/50
              "
            >

              Panel Administrator

            </p>

          </div>

        </div>

        {/* ========================= */}
        {/* MENU MOBILE */}
        {/* ========================= */}

        <div
          className="
          h-[calc(100vh-96px)]
          overflow-y-auto
          p-6
          flex
          flex-col
          gap-4
          "
        >

          {
            menu.map(
              (item) => (

                <NavLink
                  key={item.path}
                  to={item.path}
                  end={
                    item.path ===
                    '/admin'
                  }
                  onClick={() =>
                    setOpenMenu(false)
                  }
                  className={({
                    isActive
                  }) =>
                    `
                    w-full
                    text-left
                    px-6
                    py-5
                    rounded-2xl
                    font-black
                    text-lg
                    transition-all
                    duration-300

                    ${
                      isActive
                        ? 'bg-[#FF8C00] text-white'
                        : 'bg-white/5 text-white hover:bg-[#FF8C00]'
                    }
                    `
                  }
                >

                  {item.nama}

                </NavLink>

              )
            )
          }

          <button
            onClick={
              handleLogout
            }
            className="
            w-full
            px-6
            py-5
            rounded-2xl
            font-black
            text-lg
            text-white
            bg-red-500
            hover:bg-red-600
            transition-all
            duration-300
            "
          >

            Keluar

          </button>

        </div>

      </div>

      {/* ========================= */}
      {/* BACKDROP */}
      {/* ========================= */}

      {
        openMenu && (

          <div
            onClick={() =>
              setOpenMenu(false)
            }
            className="
            fixed
            inset-0
            bg-black/50
            z-[998]
            "
          />

        )
      }

    </>
  );

};

export default HeaderAdmin;