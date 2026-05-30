import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  supabase
} from "../../lib/supabaseClient";

import toast
from "react-hot-toast";

const KeranjangPembeli = () => {

  const navigate =
    useNavigate();

  /* =====================================================
     STATE
  ===================================================== */

  const [keranjang, setKeranjang] =
    useState([]);

  const [menuAktif, setMenuAktif] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  /* =====================================================
     LOAD AWAL
  ===================================================== */

  useEffect(() => {

    fetchMenu();

    fetchKeranjang();

  }, []);

  /* =====================================================
     REALTIME MENU
  ===================================================== */

  useEffect(() => {

    const channel =
      supabase
        .channel(
          "realtime-keranjang"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "menu"
          },
          () => {

            fetchMenu();

          }
        )
        .subscribe();

    return () => {

      supabase.removeChannel(
        channel
      );

    };

  }, []);

  /* =====================================================
     FETCH MENU
  ===================================================== */

  const fetchMenu =
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
          );

        if (error)
          throw error;

        const availableMenu =
          data || [];

        setMenuAktif(
          availableMenu
        );

        validasiKeranjang(
          availableMenu
        );

      } catch (error) {

        console.log(error);

      }

    };

  /* =====================================================
     FETCH KERANJANG
  ===================================================== */

  const fetchKeranjang =
    () => {

      try {

        setLoading(true);

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

        toast.error(
          "Gagal memuat keranjang"
        );

      } finally {

        setLoading(false);

      }

    };

  /* =====================================================
     VALIDASI KERANJANG
  ===================================================== */

  const validasiKeranjang =
    (availableMenu) => {

      try {

        const cart =
          JSON.parse(
            localStorage.getItem(
              "keranjang"
            )
          ) || [];

        const menuIds =
          availableMenu.map(
            (item) =>
              item.id
          );

        const invalidItems =
          cart.filter(
            (item) =>
              !menuIds.includes(
                item.id
              )
          );

        if (
          invalidItems.length > 0
        ) {

          invalidItems.forEach(
            (item) => {

              toast.error(
                `${item.nama} sudah tidak tersedia`
              );

            }
          );

        }

        const updatedCart =
          cart.filter(
            (item) =>
              menuIds.includes(
                item.id
              )
          );

        setKeranjang(
          updatedCart
        );

        localStorage.setItem(
          "keranjang",
          JSON.stringify(
            updatedCart
          )
        );

      } catch (error) {

        console.log(error);

      }

    };

  /* =====================================================
     VALIDASI MENU
  ===================================================== */

  const menuMasihAda =
    (id) => {

      return menuAktif.some(
        (item) =>
          item.id === id
      );

    };

  /* =====================================================
     TAMBAH QTY
  ===================================================== */

  const tambahQty =
    (id) => {

      try {

        if (
          !menuMasihAda(id)
        ) {

          toast.error(
            "Menu sudah tidak tersedia"
          );

          return;

        }

        const updated =
          keranjang.map(
            (item) => {

              if (
                item.id === id
              ) {

                return {

                  ...item,

                  qty:
                    item.qty + 1

                };

              }

              return item;

            }
          );

        setKeranjang(
          updated
        );

        localStorage.setItem(
          "keranjang",
          JSON.stringify(
            updated
          )
        );

      } catch (error) {

        console.log(error);

      }

    };

  /* =====================================================
     KURANG QTY
  ===================================================== */

  const kurangQty =
    (id) => {

      try {

        let updated =
          keranjang.map(
            (item) => {

              if (
                item.id === id
              ) {

                return {

                  ...item,

                  qty:
                    item.qty - 1

                };

              }

              return item;

            }
          );

        updated =
          updated.filter(
            (item) =>
              item.qty > 0
          );

        setKeranjang(
          updated
        );

        localStorage.setItem(
          "keranjang",
          JSON.stringify(
            updated
          )
        );

      } catch (error) {

        console.log(error);

      }

    };

  /* =====================================================
     HAPUS ITEM
  ===================================================== */

  const hapusItem =
    (id) => {

      try {

        const updated =
          keranjang.filter(
            (item) =>
              item.id !== id
          );

        setKeranjang(
          updated
        );

        localStorage.setItem(
          "keranjang",
          JSON.stringify(
            updated
          )
        );

        toast.success(
          "Menu dihapus"
        );

      } catch (error) {

        console.log(error);

      }

    };

  /* =====================================================
     TOTAL HARGA
  ===================================================== */

  const totalHarga =
    useMemo(() => {

      return keranjang.reduce(
        (acc, item) => {

          return (
            acc +
            Number(
              item.harga
            ) *
              Number(
                item.qty
              )
          );

        },
        0
      );

    }, [keranjang]);

  /* =====================================================
     LANJUT KONFIRMASI
  ===================================================== */

  const handleLanjut =
    () => {

      if (
        keranjang.length === 0
      ) {

        toast.error(
          "Keranjang kosong"
        );

        return;

      }

      // VALIDASI FINAL
      const invalidItems =
        keranjang.filter(
          (item) =>
            !menuMasihAda(
              item.id
            )
        );

      if (
        invalidItems.length > 0
      ) {

        invalidItems.forEach(
          (item) => {

            toast.error(
              `${item.nama} sudah tidak tersedia`
            );

          }
        );

        validasiKeranjang(
          menuAktif
        );

        return;

      }

      localStorage.setItem(
        "checkoutItems",
        JSON.stringify(
          keranjang
        )
      );

      navigate(
        "/konfirmasi-pesanan"
      );

    };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {

    return (

      <div
        className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-[#f5f6fa]
        "
      >

        <div
          className="
          w-14
          h-14
          rounded-full
          border-4
          border-[#002366]
          border-t-transparent
          animate-spin
          "
        ></div>

      </div>

    );

  }

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

      {/* HEADER */}

      <div
        className="
        flex
        flex-col
        md:flex-row
        md:items-center
        md:justify-between
        gap-5
        mb-8
        "
      >

        <div>

          <h1
            className="
            text-4xl
            md:text-6xl
            font-black
            text-[#002366]
            "
          >

            Keranjang

            <span className="text-[#FF8C00]">

              {" "}Pesanan

            </span>

          </h1>

          <p className="text-gray-500 mt-2">

            Daftar menu yang dipilih pelanggan.

          </p>

        </div>

        <button
          onClick={() =>
            navigate(
              "/daftar-menu"
            )
          }
          className="
          bg-[#002366]
          hover:bg-blue-950
          text-white
          px-6
          py-4
          rounded-2xl
          font-black
          "
        >

          + Tambah Menu

        </button>

      </div>

      {/* EMPTY */}

      {
        keranjang.length === 0 && (

          <div
            className="
            bg-white
            rounded-[30px]
            p-12
            text-center
            "
          >

            <div className="text-7xl">

              🛒

            </div>

            <h1
              className="
              text-3xl
              font-black
              text-[#002366]
              mt-5
              "
            >

              Keranjang Kosong

            </h1>

          </div>

        )
      }

      {/* LIST */}

      <div className="space-y-5">

        {
          keranjang.map(
            (item) => (

              <div
                key={item.id}
                className="
                bg-white
                rounded-[30px]
                p-5
                shadow-sm
                "
              >

                <div
                  className="
                  flex
                  flex-col
                  lg:flex-row
                  gap-6
                  "
                >

                  {/* IMAGE */}

                  <img
                    src={item.gambar}
                    alt={item.nama}
                    className="
                    w-full
                    lg:w-52
                    h-52
                    object-cover
                    rounded-3xl
                    "
                  />

                  {/* CONTENT */}

                  <div className="flex-1">

                    <div
                      className="
                      flex
                      justify-between
                      gap-4
                      "
                    >

                      <div>

                        <h1
                          className="
                          text-3xl
                          md:text-5xl
                          font-black
                          text-[#002366]
                          "
                        >

                          {
                            item.nama
                          }

                        </h1>

                        <h2
                          className="
                          text-[#FF8C00]
                          font-black
                          text-3xl
                          mt-3
                          "
                        >

                          Rp{" "}

                          {
                            Number(
                              item.harga
                            ).toLocaleString(
                              "id-ID"
                            )
                          }

                        </h2>

                      </div>

                      {/* HAPUS */}

                      <button
                        onClick={() =>
                          hapusItem(
                            item.id
                          )
                        }
                        className="
                        bg-red-100
                        hover:bg-red-200
                        text-red-600
                        px-5
                        py-3
                        h-fit
                        rounded-2xl
                        font-black
                        "
                      >

                        Hapus

                      </button>

                    </div>

                    {/* QTY */}

                    <div
                      className="
                      flex
                      items-center
                      gap-5
                      mt-10
                      "
                    >

                      {/* MIN */}

                      <button
                        onClick={() =>
                          kurangQty(
                            item.id
                          )
                        }
                        className="
                        w-16
                        h-16
                        bg-gray-200
                        rounded-2xl
                        text-4xl
                        font-black
                        "
                      >

                        -

                      </button>

                      {/* QTY */}

                      <div
                        className="
                        text-4xl
                        font-black
                        text-[#002366]
                        "
                      >

                        {
                          item.qty
                        }

                      </div>

                      {/* PLUS */}

                      <button
                        onClick={() =>
                          tambahQty(
                            item.id
                          )
                        }
                        className="
                        w-16
                        h-16
                        bg-[#002366]
                        rounded-2xl
                        text-4xl
                        font-black
                        text-white
                        "
                      >

                        +

                      </button>

                    </div>

                  </div>

                </div>

              </div>

            )
          )
        }

      </div>

      {/* TOTAL */}

      {
        keranjang.length > 0 && (

          <div
            className="
            fixed
            bottom-5
            right-5
            z-50
            bg-white
            shadow-2xl
            rounded-[30px]
            p-5
            w-[350px]
            max-w-[calc(100%-40px)]
            "
          >

            <div
              className="
              flex
              justify-between
              items-center
              mb-5
              "
            >

              <h2
                className="
                text-2xl
                font-black
                text-[#002366]
                "
              >

                Total

              </h2>

              <h2
                className="
                text-4xl
                font-black
                text-[#FF8C00]
                "
              >

                Rp{" "}

                {
                  totalHarga.toLocaleString(
                    "id-ID"
                  )
                }

              </h2>

            </div>

            <button
              onClick={
                handleLanjut
              }
              className="
              w-full
              bg-[#FF8C00]
              hover:bg-orange-600
              text-white
              py-4
              rounded-2xl
              font-black
              "
            >

              Lanjut Konfirmasi

            </button>

          </div>

        )
      }

    </div>

  );

};

export default KeranjangPembeli;