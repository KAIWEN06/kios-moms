import React, {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import toast from "react-hot-toast";

const KeranjangPembeli = () => {

  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================

  const [keranjang, setKeranjang] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  // =========================
  // FETCH KERANJANG
  // =========================

  const fetchKeranjang = () => {

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
        "Gagal mengambil keranjang"
      );

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    fetchKeranjang();

  }, []);

  // =========================
  // TAMBAH QTY
  // =========================

  const tambahQty = (id) => {

    const updated =
      keranjang.map((item) => {

        if (item.id === id) {

          return {
            ...item,
            qty: item.qty + 1
          };

        }

        return item;

      });

    setKeranjang(updated);

    localStorage.setItem(
      "keranjang",
      JSON.stringify(updated)
    );

  };

  // =========================
  // KURANG QTY
  // =========================

  const kurangQty = (id) => {

    const updated =
      keranjang
        .map((item) => {

          if (
            item.id === id &&
            item.qty > 1
          ) {

            return {
              ...item,
              qty:
                item.qty - 1
            };

          }

          return item;

        });

    setKeranjang(updated);

    localStorage.setItem(
      "keranjang",
      JSON.stringify(updated)
    );

  };

  // =========================
  // HAPUS MENU
  // =========================

  const hapusItem = (id) => {

    const updated =
      keranjang.filter(
        (item) =>
          item.id !== id
      );

    setKeranjang(updated);

    localStorage.setItem(
      "keranjang",
      JSON.stringify(updated)
    );

    toast.success(
      "Menu dihapus"
    );

  };

  // =========================
  // TOTAL HARGA
  // =========================

  const totalHarga =
    keranjang.reduce(
      (acc, item) =>

        acc +
        item.harga *
        item.qty,

      0
    );

  // =========================
  // LANJUT KONFIRMASI
  // =========================

  const handleLanjut = () => {

    if (keranjang.length === 0) {

      toast.error(
        "Keranjang kosong"
      );

      return;

    }

    localStorage.setItem(
      "checkoutItems",
      JSON.stringify(keranjang)
    );

    navigate(
      "/konfirmasi-pesanan"
    );

  };

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

      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

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

        {/* BUTTON */}

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
          transition-all
          "
        >

          + Tambah Menu

        </button>

      </div>

      {/* ========================= */}
      {/* LOADING */}
      {/* ========================= */}

      {
        loading && (

          <div
            className="
            bg-white
            rounded-[30px]
            p-10
            text-center
            "
          >

            <h2
              className="
              text-2xl
              font-black
              text-[#002366]
              "
            >

              Memuat Keranjang...

            </h2>

          </div>

        )
      }

      {/* ========================= */}
      {/* EMPTY */}
      {/* ========================= */}

      {
        !loading &&
        keranjang.length === 0 && (

          <div
            className="
            bg-white
            rounded-[30px]
            p-10
            text-center
            "
          >

            <div className="text-7xl">

              🛒

            </div>

            <h2
              className="
              text-3xl
              font-black
              text-[#002366]
              mt-5
              "
            >

              Keranjang Kosong

            </h2>

            <button
              onClick={() =>
                navigate(
                  "/daftar-menu"
                )
              }
              className="
              mt-8
              bg-[#FF8C00]
              hover:bg-orange-600
              text-white
              px-8
              py-4
              rounded-2xl
              font-black
              "
            >

              Pilih Menu

            </button>

          </div>

        )
      }

      {/* ========================= */}
      {/* LIST MENU */}
      {/* ========================= */}

      <div className="space-y-5">

        {keranjang.map(
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

                      <h2
                        className="
                        text-3xl
                        md:text-5xl
                        font-black
                        text-[#002366]
                        "
                      >

                        {item.nama}

                      </h2>

                      <h3
                        className="
                        text-[#FF8C00]
                        font-black
                        text-3xl
                        mt-3
                        "
                      >

                        Rp{" "}

                        {Number(
                          item.harga
                        ).toLocaleString()}

                      </h3>

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
                      hover:bg-gray-300
                      rounded-2xl
                      text-4xl
                      font-black
                      text-[#333]
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

                      {item.qty}

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
                      hover:bg-blue-950
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
        )}

      </div>

      {/* ========================= */}
      {/* TOTAL FIXED */}
      {/* ========================= */}

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

                {totalHarga.toLocaleString()}

              </h2>

            </div>

            {/* BUTTON */}

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
              transition-all
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