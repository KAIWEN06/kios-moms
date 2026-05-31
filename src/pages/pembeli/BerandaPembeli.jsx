import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabaseClient";

import { toast } from "react-hot-toast";

export default function BerandaPembeli() {

  const navigate = useNavigate();

  const [kiosBuka, setKiosBuka] =
  useState(true);

  const [menuTerlaris, setMenuTerlaris] =
    useState([]);

  
  const ambilStatusKios =
  async () => {

    const {
      data,
      error
    } = await supabase
      .from("pengaturan_kios")
      .select("buka")
      .eq("id", 1)
      .single();

    if (!error && data) {

      setKiosBuka(
        data.buka
      );

    }

  };
  /* ======================================================
     LOAD MENU TERLARIS
  ====================================================== */

  useEffect(() => {

    getMenuTerlaris();

    ambilStatusKios();

  }, []);

  /* ======================================================
   REALTIME MENU
====================================================== */

useEffect(() => {

  const channel =
    supabase
      .channel(
        "realtime-beranda-pembeli"
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pesanan"
        },
        async () => {

          await getMenuTerlaris();

        }
      )
      .subscribe();

  return () => {

    supabase.removeChannel(
      channel
    );

  };

}, []);


useEffect(() => {

  const kiosChannel =
    supabase
      .channel(
        "realtime-kios-beranda"
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pengaturan_kios"
        },
        (payload) => {

          setKiosBuka(
            payload.new.buka
          );

        }
      )
      .subscribe();

  return () => {

    supabase.removeChannel(
      kiosChannel
    );

  };

}, []);

  /* ======================================================
     GET MENU TERLARIS
  ====================================================== */

  const getMenuTerlaris =
  async () => {

    try {

      /* ======================================================
         AMBIL SEMUA PESANAN CHECKOUT
      ====================================================== */

     const sekarang = new Date();

      const awalBulan =
        new Date(
          sekarang.getFullYear(),
          sekarang.getMonth(),
          1
        ).toISOString();

      const akhirBulan =
        new Date(
          sekarang.getFullYear(),
          sekarang.getMonth() + 1,
          1
        ).toISOString();

      const {
        data,
        error
      } = await supabase
        .from("pesanan")
        .select("items")
        .eq("status", "selesai")
        .gte(
          "created_at",
          awalBulan
        )
        .lt(
          "created_at",
          akhirBulan
        );

      if (error) {

        console.log(error);

        return;

      }

      /* ======================================================
         GABUNGKAN SEMUA ITEMS
      ====================================================== */

      let allItems = [];

      data.forEach((pesanan) => {

        let items = [];

        try {

          items =
            typeof pesanan.items ===
            "string"

              ? JSON.parse(
                  pesanan.items
                )

              : pesanan.items;

        } catch {

          items = [];

        }

        allItems.push(...items);

      });

      /* ======================================================
         HITUNG TOTAL TERJUAL
      ====================================================== */

      const groupedMenu = {};

      allItems.forEach((item) => {

        const nama =
          item.nama;

        if (
          !groupedMenu[nama]
        ) {

          groupedMenu[nama] = {

            ...item,

            totalQty:
              Number(
                item.qty
              ) || 0,

          };

        } else {

          groupedMenu[
            nama
          ].totalQty +=
            Number(
              item.qty
            ) || 0;

        }

      });

      /* ======================================================
         SORT MENU TERLARIS
      ====================================================== */

      const sortedMenu =
        Object.values(
          groupedMenu
        )

          .sort(
            (a, b) =>
              b.totalQty -
              a.totalQty
          )

          .slice(0, 4);

      /* ======================================================
         AMBIL DATA MENU TERBARU
      ====================================================== */

      const {
        data: menuData,
        error: menuError
      } = await supabase
        .from("menu")
        .select("*");

      if (menuError) {

        console.log(menuError);

        return;

      }

      /* ======================================================
         SINKRONKAN STOK TERBARU
      ====================================================== */

      const finalMenu =
        sortedMenu.map((item) => {

          const menuAktif =
            menuData.find(
              (m) =>
                m.id === item.id
            );

          return {

            ...item,

            stok:
              menuAktif?.stok ||
              "kosong"

          };

        });

      setMenuTerlaris(
        finalMenu
      );

    } catch (err) {

      console.log(err);

    }

  };

  return (

    <div className="bg-[#F4F5F7] min-h-screen">

      {/* ====================================================== */}
      {/* CONTAINER */}
      {/* ====================================================== */}

      <div className="w-full px-5 md:px-10 xl:px-16 py-10">

        {/* ====================================================== */}
        {/* HERO */}
        {/* ====================================================== */}

        <div
          className="
          bg-white
          rounded-[40px]
          p-8 md:p-12
          shadow-sm
          w-full
          "
        >

          <div className="max-w-[900px]">

            <h3
              className="
              text-[#FF8C00]
              font-black
              uppercase
              text-lg
              "
            >

              Selamat Datang

            </h3>

            <h1
              className="
              text-[55px]
              md:text-[90px]
              leading-none
              font-black
              text-[#002366]
              mt-5
              "
            >

              Pemesanan
              <br />
              Makanan

              <span className="text-[#FF8C00]">

                {" "}Online

              </span>

            </h1>

            <p
              className="
              text-gray-500
              text-lg
              md:text-2xl
              mt-8
              max-w-[700px]
              "
            >

              Pesan makanan favorit Anda
              dengan cepat, mudah,
              dan praktis langsung
              dari meja Anda.

            </p>

            {/* BUTTON */}

            <div className="flex flex-wrap gap-5 mt-10">

              <button
                disabled={!kiosBuka}
                onClick={() => {

                  if (!kiosBuka) {

                    toast.error(
                      "Kios sedang tutup"
                    );

                    return;

                  }

                  navigate(
                    "/daftar-menu"
                  );

                }}
                className={`
                  bg-[#FF8C00]
                  text-white
                  px-10
                  py-5
                  rounded-[22px]
                  font-black
                  text-lg
                  transition-all

                  ${
                    kiosBuka
                      ? "hover:bg-orange-600"
                      : "opacity-60 cursor-not-allowed"
                  }
                `}
              >

                {
                  kiosBuka
                    ? "Pesan Sekarang"
                    : "Kios Tutup"
                }

              </button>

              <button
                onClick={() =>
                  navigate(
                    "/status-pesanan"
                  )
                }
                className="
                bg-[#002366]
                hover:bg-blue-950
                text-white
                px-10
                py-5
                rounded-[22px]
                font-black
                text-lg
                transition-all
                "
              >

                Cek Pesanan

              </button>

            </div>

          </div>

        </div>

        {/* ====================================================== */}
        {/* MENU TERLARIS */}
        {/* ====================================================== */}

        <div className="mt-16">

          <h1
            className="
            text-5xl
            md:text-6xl
            font-black
            text-[#002366]
            "
          >

            Menu Terlaris

          </h1>

          <p
            className="
            text-gray-500
            text-lg
            mt-3
            "
          >

            Menu paling sering dipesan pelanggan bulan ini.

          </p>

          {/* GRID */}

          <div
            className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-6
            mt-10
            "
          >

            {menuTerlaris.map(
              (
                item,
                index
              ) => (

                <div
                  key={index}
                  className="
                  bg-white
                  rounded-[30px]
                  overflow-hidden
                  shadow-sm
                  w-full
                  relative
                  "
                >

                  {/* BADGE */}

                  <div
                    className="
                    absolute
                    top-4
                    left-4
                    bg-[#FF8C00]
                    text-white
                    px-4
                    py-2
                    rounded-2xl
                    font-black
                    text-sm
                    z-10
                    "
                  >

                    #{index + 1}

                  </div>

                  {/* IMAGE */}

                  <img
                    src={
                      item.gambar ||
                      item.img
                    }
                    alt={item.nama}
                    className="
                    w-full
                    h-[260px]
                    object-cover
                    "
                  />

                  {/* CONTENT */}

                  <div className="p-6">

                    <h1
                      className="
                      text-3xl
                      font-black
                      text-[#002366]
                      "
                    >

                      {item.nama}

                    </h1>

                    <p
                      className="
                      text-gray-500
                      mt-2
                      text-lg
                      "
                    >

                      Dipesan

                      <span
                        className="
                        text-[#FF8C00]
                        font-black
                        "
                      >

                        {" "}

                        {
                          item.totalQty
                        }x

                      </span>

                    </p>

                    <h2
                      className="
                      text-[#FF8C00]
                      text-4xl
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

                    {/* BUTTON */}

                    <button
                      disabled={!kiosBuka}
                      onClick={() => {

                        try {

                          if (!kiosBuka) {

                            toast.error(
                              "Kios sedang tutup"
                            );

                            return;

                          }

                          /* VALIDASI MENU HABIS */

                          if (
                            item.stok === "kosong"
                          ) {

                            toast.error(
                              `${item.nama} sedang habis`
                            );

                            navigate(
                              "/daftar-menu"
                            );

                            return;

                          }

                          const keranjangLama =
                            JSON.parse(
                              localStorage.getItem(
                                "keranjang"
                              )
                            ) || [];

                          const existingItem =
                            keranjangLama.find(
                              (x) =>
                                x.id === item.id
                            );

                          let updatedKeranjang;

                          if (existingItem) {

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

                            updatedKeranjang = [

                              ...keranjangLama,

                              {

                                id: item.id,

                                nama:
                                  item.nama,

                                harga:
                                  item.harga,

                                gambar:
                                  item.gambar ||
                                  item.img,

                                deskripsi:
                                  item.deskripsi,

                                qty: 1

                              }

                            ];

                          }

                          localStorage.setItem(
                            "keranjang",
                            JSON.stringify(
                              updatedKeranjang
                            )
                          );

                          toast.success(
                            `${item.nama} ditambahkan`
                          );

                          navigate(
                            "/daftar-menu"
                          );

                        } catch (error) {

                          console.log(error);

                          toast.error(
                            "Gagal menambahkan menu"
                          );

                        }

                      }}
                      className={`
                        w-full
                        text-white
                        py-4
                        rounded-[20px]
                        font-black
                        text-lg
                        mt-6
                        transition-all

                        ${
                          kiosBuka
                            ? "bg-[#002366] hover:bg-blue-950"
                            : "bg-gray-400 cursor-not-allowed"
                        }
                      `}
                    >

                      {
                        kiosBuka
                          ? "Pesan"
                          : "Kios Tutup"
                      }

                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      </div>

    </div>

  );

}