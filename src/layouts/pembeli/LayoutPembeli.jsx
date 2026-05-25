import React from "react";

import { Outlet } from "react-router-dom";

import HeaderPembeli from "./HeaderPembeli";

import FooterPembeli from "../../components/pembeli/FooterPembeli";

const LayoutPembeli = () => {

  return (

    <div
      className="
      min-h-screen
      flex
      flex-col
      bg-[#f5f6fa]
      overflow-x-hidden
      "
    >

      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <HeaderPembeli />

      {/* ========================= */}
      {/* MODE PEMBELI */}
      {/* ========================= */}

      <div
        className="
        w-full
        bg-[#FF8C00]
        text-white
        text-xs
        text-center
        py-2
        font-semibold
        tracking-wider
        shadow-sm
        "
      >

        MODE PEMBELI

      </div>

      {/* ========================= */}
      {/* CONTENT */}
      {/* ========================= */}

      <main className="flex-1">

        <Outlet />

      </main>

      {/* ========================= */}
      {/* FOOTER */}
      {/* ========================= */}

      <FooterPembeli />

    </div>

  );

};

export default LayoutPembeli;