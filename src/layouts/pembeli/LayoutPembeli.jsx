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