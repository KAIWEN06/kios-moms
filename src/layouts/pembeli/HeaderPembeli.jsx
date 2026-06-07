import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const HeaderPembeli = () => {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);

  const menu = [
    { nama: "Beranda", path: "/" },
    { nama: "Daftar Menu", path: "/daftar-menu" },
    { nama: "Keranjang", path: "/keranjang" },
    { nama: "Konfirmasi Pesanan", path: "/konfirmasi-pesanan" },
    { nama: "Status Pesanan", path: "/status-pesanan" },
    { nama: "Riwayat", path: "/riwayat-pesanan-pembeli" }
  ];

  return (
    <>
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
          max-w-7xl
          mx-auto
          px-4
          sm:px-5
          h-24
          flex
          items-center
          justify-between
          "
        >
          {/* ========================= */}
          {/* LOGO (Sama dengan Admin) */}
          {/* ========================= */}
          <div
            onClick={() => navigate("/")}
            className="cursor-pointer"
          >
            <h1
              className="
              text-3xl
              sm:text-4xl
              font-black
              "
            >
              Kios{" "}
              <span className="text-[#FF8C00]">
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
              Sistem Pemesanan Digital
            </p>
          </div>

          {/* ========================= */}
          {/* DESKTOP MENU */}
          {/* ========================= */}
          <ul
            className="
            hidden
            xl:flex
            items-center
            gap-8
            "
          >
            {menu.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `
                    text-[16px]
                    font-bold
                    transition-all
                    duration-300
                    ${
                      isActive
                        ? "text-[#FF8C00]"
                        : "text-white hover:text-[#FF8C00]"
                    }
                    `
                  }
                >
                  {item.nama}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* ========================= */}
          {/* HAMBURGER */}
          {/* ========================= */}
          <button
            onClick={() => setOpenMenu(!openMenu)}
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
            {openMenu ? "✕" : "☰"}
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
        ${openMenu ? "translate-x-0" : "-translate-x-full"}
        `}
      >
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
              Kios{" "}
              <span className="text-[#FF8C00]">
                Mom's
              </span>
            </h1>
            <p
              className="
              text-sm
              text-white/50
              "
            >
              Sistem Pemesanan Digital
            </p>
          </div>
        </div>

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
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setOpenMenu(false)}
              className={({ isActive }) =>
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
                    ? "bg-[#FF8C00] text-white"
                    : "bg-white/5 text-white hover:bg-[#FF8C00]"
                }
                `
              }
            >
              {item.nama}
            </NavLink>
          ))}
        </div>
      </div>

      {openMenu && (
        <div
          onClick={() => setOpenMenu(false)}
          className="
          fixed
          inset-0
          bg-black/50
          z-[998]
          "
        />
      )}
    </>
  );
};

export default HeaderPembeli;