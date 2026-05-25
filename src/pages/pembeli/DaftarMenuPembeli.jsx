import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../../config/supabase";

import { toast } from "react-hot-toast";

export default function DaftarMenuPembeli() {

  const navigate = useNavigate();

  /* =====================================================
     STATE
  ===================================================== */

  const [menu, setMenu] =
    useState([]);

  const [keranjang, setKeranjang] =
    useState([]);

  /* =====================================================
     LOAD DATA
  ===================================================== */

  useEffect(() => {

    ambilMenu();

    ambilKeranjang();

  }, []);

  /* =====================================================
     AMBIL MENU DARI DATABASE
  ===================================================== */

  const ambilMenu =
    async () => {

      try {

        const {
          data,
          error
        } = await supabase
          .from("menu")
          .select("*")
          .eq(
            "stok",
            "ada"
          )
          .eq(
            "is_aktif",
            true
          )
          .order(
            "id",
            {
              ascending: true
            }
          );

        if (error) {

          console.log(error);

          toast.error(
            "Gagal mengambil menu"
          );

          return;

        }

        setMenu(
          data || []
        );

      } catch (error) {

        console.log(error);

      }

    };

  /* =====================================================
     AMBIL KERANJANG DARI LOCAL STORAGE
  ===================================================== */

  const ambilKeranjang = () => {

    try {

      const dataKeranjang =
        JSON.parse(
          localStorage.getItem(
            "keranjang"
          )
        ) || [];

      setKeranjang(
        dataKeranjang
      );

    } catch (error) {

      console.log(error);

    }

  };

  /* =====================================================
     TAMBAH PESANAN
  ===================================================== */

  const tambahPesanan = (item) => {

    try {

      const keranjangLama =
        JSON.parse(
          localStorage.getItem(
            "keranjang"
          )
        ) || [];

      const cek =
        keranjangLama.find(
          (x) =>
            x.id === item.id
        );

      let updatedKeranjang;

      /* =========================
         JIKA SUDAH ADA
      ========================= */

      if (cek) {

        updatedKeranjang =
          keranjangLama.map(
            (x) => {

              if (
                x.id === item.id
              ) {

                return {

                  ...x,

                  qty:
                    x.qty + 1

                };

              }

              return x;

            }
          );

      } else {

        /* =========================
           JIKA BELUM ADA
        ========================= */

        updatedKeranjang = [

          ...keranjangLama,

          {

            id: item.id,

            nama:
              item.nama,

            harga:
              item.harga,

            gambar:
              item.img,

            deskripsi:
              item.deskripsi,

            qty: 1

          }

        ];

      }

      /* =========================
         SIMPAN LOCAL STORAGE
      ========================= */

      localStorage.setItem(
        "keranjang",
        JSON.stringify(
          updatedKeranjang
        )
      );

      setKeranjang(
        updatedKeranjang
      );

      toast.success(
        "Pesanan ditambahkan"
      );

    } catch (error) {

      console.log(error);

      toast.error(
        "Gagal tambah pesanan"
      );

    }

  };

  /* =====================================================
     TAMBAH QTY
  ===================================================== */

  const tambahQty = (item) => {

    try {

      const updated =
        keranjang.map((x) => {

          if (
            x.id === item.id
          ) {

            return {

              ...x,

              qty:
                x.qty + 1

            };

          }

          return x;

        });

      localStorage.setItem(
        "keranjang",
        JSON.stringify(
          updated
        )
      );

      setKeranjang(updated);

    } catch (error) {

      console.log(error);

    }

  };

  /* =====================================================
     KURANG QTY
  ===================================================== */

  const kurangQty = (item) => {

    try {

      let updated =
        keranjang.map((x) => {

          if (
            x.id === item.id
          ) {

            return {

              ...x,

              qty:
                x.qty - 1

            };

          }

          return x;

        });

      updated =
        updated.filter(
          (x) =>
            x.qty > 0
        );

      localStorage.setItem(
        "keranjang",
        JSON.stringify(
          updated
        )
      );

      setKeranjang(updated);

    } catch (error) {

      console.log(error);

    }

  };

  /* =====================================================
     TOTAL ITEM
  ===================================================== */

  const totalItem =
    keranjang.reduce(
      (acc, item) =>

        acc + item.qty,

      0
    );

  return (

    <div
      className="
      min-h-screen
      bg-[#f5f6fa]
      px-4
      md:px-8
      py-6
      pb-40
      "
    >

      {/* =====================================================
         TITLE
      ===================================================== */}

      <h1
        className="
        text-4xl
        md:text-6xl
        font-black
        text-[#002366]
        "
      >

        Daftar{" "}

        <span className="text-[#FF8C00]">

          Menu

        </span>

      </h1>

      <p className="text-gray-500 mt-2">

        Pilih menu favorit Anda

      </p>

      {/* =====================================================
         LIST MENU
      ===================================================== */}

      <div
        className="
        grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
        gap-6
        mt-8
        "
      >

        {menu.map((item) => {

          const existingItem =
            keranjang.find(
              (x) =>
                x.id === item.id
            );

          return (

            <div
              key={item.id}
              className="
              bg-white
              rounded-[30px]
              overflow-hidden
              shadow-sm
              "
            >

              {/* IMAGE */}

              <img
                src={item.img}
                alt={item.nama}
                className="
                w-full
                h-[240px]
                object-cover
                "
              />

              {/* CONTENT */}

              <div className="p-5">

                {/* NAMA */}

                <h1
                  className="
                  text-[28px]
                  leading-tight
                  font-black
                  text-[#002366]
                  "
                >

                  {item.nama}

                </h1>

                {/* DESKRIPSI */}

                <p
                  className="
                  text-gray-500
                  mt-2
                  text-sm
                  leading-relaxed
                  "
                >

                  {item.deskripsi}

                </p>

                {/* HARGA */}

                <h2
                  className="
                  text-[#FF8C00]
                  text-[30px]
                  font-black
                  mt-5
                  "
                >

                  Rp{" "}

                  {Number(
                    item.harga
                  ).toLocaleString(
                    "id-ID"
                  )}

                </h2>

                {/* =====================================================
                   BELUM ADA DI KERANJANG
                ===================================================== */}

                {!existingItem ? (

                  <button
                    onClick={() =>
                      tambahPesanan(
                        item
                      )
                    }
                    className="
                    w-full
                    bg-[#002366]
                    hover:bg-blue-950
                    text-white
                    py-4
                    rounded-[20px]
                    font-black
                    text-lg
                    mt-5
                    transition-all
                    "
                  >

                    Tambah Pesanan

                  </button>

                ) : (

                  /* =====================================================
                     SUDAH ADA DI KERANJANG
                  ===================================================== */

                  <div
                    className="
                    flex
                    items-center
                    justify-between
                    mt-5
                    "
                  >

                    {/* MINUS */}

                    <button
                      onClick={() =>
                        kurangQty(
                          existingItem
                        )
                      }
                      className="
                      w-[58px]
                      h-[58px]
                      rounded-[18px]
                      bg-[#E5E7EB]
                      text-[#002366]
                      text-4xl
                      font-black
                      "
                    >

                      -

                    </button>

                    {/* QTY */}

                    <h1
                      className="
                      text-4xl
                      font-black
                      text-[#002366]
                      "
                    >

                      {existingItem.qty}

                    </h1>

                    {/* PLUS */}

                    <button
                      onClick={() =>
                        tambahQty(
                          existingItem
                        )
                      }
                      className="
                      w-[58px]
                      h-[58px]
                      rounded-[18px]
                      bg-[#002366]
                      text-white
                      text-4xl
                      font-black
                      "
                    >

                      +

                    </button>

                  </div>

                )}

              </div>

            </div>

          );

        })}

      </div>

      {/* =====================================================
         FLOATING BUTTON
      ===================================================== */}

      {
        keranjang.length > 0 && (

          <div
            className="
            fixed
            bottom-5
            right-5
            z-50
            "
          >

            <button
              onClick={() =>
                navigate(
                  "/keranjang"
                )
              }
              className="
              bg-[#FF8C00]
              hover:bg-orange-600
              text-white
              shadow-2xl
              rounded-[28px]
              px-7
              py-5
              flex
              items-center
              gap-4
              transition-all
              duration-300
              "
            >

              {/* ICON */}

              <div
                className="
                w-14
                h-14
                rounded-2xl
                bg-white/20
                flex
                items-center
                justify-center
                text-3xl
                "
              >

                🛒

              </div>

              {/* TEXT */}

              <div className="text-left">

                <h2 className="font-black text-xl">

                  Pesan Sekarang

                </h2>

                <p className="text-sm text-white/80">

                  {totalItem} menu dipilih

                </p>

              </div>

            </button>

          </div>

        )
      }

    </div>

  );

}