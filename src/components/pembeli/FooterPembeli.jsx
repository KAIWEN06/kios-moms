import React from "react";

const FooterPembeli = () => {

  return (

    <footer
      className="
      bg-[#002366]
      mt-14
      overflow-hidden
      "
    >

      <div
        className="
        max-w-[1600px]
        mx-auto
        px-4
        lg:px-10
        py-8
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
          gap-8
          "
        >

          {/* ========================= */}
          {/* KOLOM 1 */}
          {/* ========================= */}

          <div>

            <h1
              className="
              text-3xl
              md:text-4xl
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
              mt-3
              leading-relaxed
              text-sm
              md:text-base
              max-w-[550px]
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
              text-xl
              md:text-2xl
              font-black
              text-white
              mb-4
              "
            >

              Informasi

            </h2>

            <div
              className="
              flex
              flex-col
              gap-2
              text-white/70
              font-medium
              text-sm
              md:text-base
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
          mt-8
          pt-4
          "
        >

          <div
            className="
            flex
            flex-col
            md:flex-row
            items-center
            justify-between
            gap-2
            "
          >

            <p
              className="
              text-white/60
              text-xs
              md:text-sm
              text-center
              md:text-left
              "
            >

              © 2026 Kios Mom's - Sistem Pemesanan Makanan

            </p>

            <p
              className="
              text-white/40
              text-xs
              md:text-sm
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