import React from "react";

const FooterPembeli = () => {

  return (

    <footer
      className="
      bg-[#002366]
      mt-20
      overflow-hidden
      "
    >

      <div
        className="
        max-w-[1600px]
        mx-auto
        px-4
        lg:px-10
        py-14
        "
      >

        {/* ========================= */}
        {/* CONTENT */}
        {/* ========================= */}

        <div
          className="
          grid
          grid-cols-1
          md:grid-cols-2
          gap-10
          "
        >

          {/* ========================= */}
          {/* KOLOM 1 */}
          {/* ========================= */}

          <div>

            <h1
              className="
              text-4xl
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
              text-white/70
              mt-5
              leading-relaxed
              text-base
              "
            >

              Sistem pemesanan makanan berbasis website
              untuk mempermudah pelanggan melakukan
              pemesanan secara cepat, praktis,
              dan modern.

            </p>

          </div>

          {/* ========================= */}
          {/* KOLOM 2 */}
          {/* ========================= */}

          <div>

            <h2
              className="
              text-2xl
              font-black
              text-white
              mb-5
              "
            >

              Informasi

            </h2>

            <div
              className="
              flex
              flex-col
              gap-3
              text-white/70
              font-medium
              "
            >

              <p>

                Jam Operasional :
                08.00 - 22.00

              </p>

              <p>

                Pembayaran Tunai & QRIS

              </p>

              <p>

                Pemesanan Online Tersedia

              </p>

              <p>

                Pelayanan Cepat dan Praktis

              </p>

            </div>

          </div>

        </div>

        {/* ========================= */}
        {/* GARIS */}
        {/* ========================= */}

        <div
          className="
          border-t
          border-white/10
          mt-12
          pt-6
          "
        >

          <div
            className="
            flex
            flex-col
            md:flex-row
            items-center
            justify-between
            gap-4
            "
          >

            <p
              className="
              text-white/60
              text-sm
              text-center
              md:text-left
              "
            >

              © 2026 Kios Mom's - Sistem Pemesanan Makanan

            </p>

            <p
              className="
              text-white/40
              text-sm
              text-center
              "
            >

              Dibuat Untuk Mempermudah Pemesanan Pelanggan

            </p>

          </div>

        </div>

      </div>

    </footer>

  );

};

export default FooterPembeli;