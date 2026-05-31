import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate,
  useSearchParams
} from "react-router-dom";

import {
  supabase
} from "../../lib/supabaseClient";

import toast
from "react-hot-toast";

const StatusPesananPembeli = () => {

  const navigate =
    useNavigate();

  const [searchParams] =
    useSearchParams();

  /* =====================================================
     STATE
  ===================================================== */

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [pesanan, setPesanan] =
    useState([]);

  /* =====================================================
     QUERY PARAM
  ===================================================== */

  const kodePesanan =
    searchParams.get("kode");
  
  const tokenFromUrl =
  searchParams.get("token");

  /* =====================================================
     FETCH PESANAN
  ===================================================== */

  const fetchPesanan =
    async () => {

      try {

        setLoading(true);

        let token =
            tokenFromUrl ||
            localStorage.getItem(
              "guestToken"
            );

          if (!token) {

            setPesanan([]);

            setLoading(false);

            return;
          }

          if (tokenFromUrl) {

            localStorage.setItem(
              "guestToken",
              tokenFromUrl
            );
          }

        const {
  data: guest,
  error: guestError
} = await supabase
  .from("guest_customer")
  .select("id")
  .eq(
    "access_token",
    token
  )
  .single();

if (
  guestError ||
  !guest
) {

  setPesanan([]);

  setLoading(false);

  return;
}

let query =
  supabase
    .from("pesanan")
    .select(`
      *,
      meja (
        nomor_meja
      )
    `)
    .eq(
      "guest_customer_id",
      guest.id
    )
    .in("status", [
      "menunggu_pembayaran",
      "diproses"
    ])
    .order(
      "created_at",
      {
        ascending: false
      }
    );

        // FILTER DARI URL
        if (kodePesanan) {

          query =
            query.eq(
              "kode_pesanan",
              kodePesanan
            );

        }

        const {
          data,
          error
        } = await query;

        if (error)
          throw error;

        setPesanan(
          data || []
        );

      } catch (error) {

        console.log(error);

        toast.error(
          "Gagal mengambil status pesanan"
        );

      } finally {

        setLoading(false);

      }

    };

  /* =====================================================
     LOAD DATA
  ===================================================== */

useEffect(() => {

  fetchPesanan();

}, [
  kodePesanan,
  tokenFromUrl
]);
  /* =====================================================
     REALTIME
  ===================================================== */

  useEffect(() => {

    const channel =
      supabase
        .channel(
          "realtime-status-pesanan"
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "pesanan"
          },
          (payload) => {

            setPesanan((prev) => {

              return prev.map((item) => {

                if (
                  item.id ===
                  payload.new.id
                ) {

                  return {

                    ...item,

                    ...payload.new

                  };

                }

                return item;

              });

            });

            fetchPesanan();

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
     FILTER SEARCH
  ===================================================== */
const filteredPesanan =
  useMemo(() => {

    return pesanan.filter(
      (item) => {

        const keyword =
          search
            .toLowerCase()
            .trim();

        const kode =
          item.kode_pesanan
            ?.toLowerCase()
            .includes(
              keyword
            );

        const meja =
          `m${item.meja?.nomor_meja || ""}`
            .toLowerCase()
            .includes(
              keyword
            );

        return (
          kode || meja
        );

      }
    );

  }, [pesanan, search]);

  /* =====================================================
     STATUS CONFIG
  ===================================================== */

  const getStatusConfig =
    (status) => {

      switch (status) {

        case "menunggu_pembayaran":

          return {

            label:
              "Menunggu Pembayaran",

            bg:
              "bg-red-500",

            text:
              "Silakan lakukan pembayaran dan ambil nomor meja Anda di kasir terima kasih."

          };

        case "diproses":

          return {

            label:
              "Diproses",

            bg:
              "bg-[#FF8C00]",

            text:
              "Pesanan sedang diproses oleh dapur."

          };

        case "selesai":

          return {

            label:
              "Selesai",

            bg:
              "bg-green-500",

            text:
              "Pesanan telah selesai."

          };

        case "dibatalkan":

        return {

          label:
            "Dibatalkan",

          bg:
            "bg-red-500",

          text:
            "Pesanan telah dibatalkan."

        };

        default:

          return {

            label:
              "Unknown",

            bg:
              "bg-gray-400",

            text:
              "Status tidak diketahui."

          };

      }

    };

    const handlePesanLagi = (items) => {

  try {

    const keranjangBaru =
      items.map((menu) => ({

        id: menu.id,

        nama: menu.nama,

        harga: menu.harga,

        gambar:
          menu.gambar ||
          menu.img,

        qty: menu.qty

      }));

    localStorage.setItem(
      "keranjang",
      JSON.stringify(
        keranjangBaru
      )
    );

    toast.success(
      "Pesanan berhasil dimuat ke keranjang"
    );

    navigate("/keranjang");

  } catch (error) {

    console.log(error);

    toast.error(
      "Gagal memesan ulang"
    );

  }

};

const handleBatalkanPesanan =
  async (id) => {

    try {

      const { error } =
        await supabase
          .from("pesanan")
          .update({

            status:
              "dibatalkan",

            alasan_pembatalan:
              "Dibatalkan oleh pembeli",

            dibatalkan_pada:
              new Date()

          })
          .eq("id", id)
          .eq(
            "status",
            "menunggu_pembayaran"
          );

      if (error)
        throw error;

      toast.success(
        "Pesanan berhasil dibatalkan"
      );

      fetchPesanan();

    } catch (error) {

      console.log(error);

      toast.error(
        "Gagal membatalkan pesanan"
      );

    }

  };


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {

    return (

      <div
        className="
        flex
        items-center
        justify-center
        min-h-screen
        bg-[#f0f2f5]
        "
      >

        <div
          className="
          w-14
          h-14
          border-4
          border-[#002366]
          border-t-transparent
          rounded-full
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
      bg-[#f0f2f5]
      px-3
      md:px-12
      py-6
      md:py-10
      "
    >

      {/* HEADER */}

      <div
        className="
        flex
        flex-col
        lg:flex-row
        lg:items-center
        lg:justify-between
        gap-5
        mb-8
        md:mb-10
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

            Status{" "}

            <span className="text-[#FF8C00]">

              Pesanan

            </span>

          </h1>

          <p
            className="
            text-gray-500
            mt-2
            md:mt-3
            text-sm
            md:text-base
            "
          >

            Lihat status pesanan secara realtime.

          </p>

        </div>

        {/* SEARCH */}

        {
          !kodePesanan && (

            <div className="w-full lg:w-[350px]">

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Cari kode pesanan / m12"
                className="
                w-full
                bg-white
                border
                border-gray-200
                rounded-2xl
                px-4
                py-3
                outline-none
                focus:border-[#002366]
                shadow-sm
                text-sm
                "
              />

              <p
                className="
                text-gray-400
                text-xs
                mt-2
                "
              >

                Gunakan format m + nomor meja

              </p>

            </div>

          )
        }

      </div>

      {/* EMPTY */}

      {
        filteredPesanan.length === 0 && (

          <div
            className="
            bg-white
            rounded-[30px]
            md:rounded-[40px]
            p-8
            md:p-16
            text-center
            shadow-sm
            "
          >

            <div
              className="
              text-6xl
              md:text-8xl
              mb-6
              "
            >

              🍽️

            </div>

            <h2
              className="
              text-2xl
              md:text-4xl
              font-black
              text-[#002366]
              "
            >

              Tidak Ada Pesanan

            </h2>

            <p
              className="
              text-gray-500
              mt-4
              text-sm
              md:text-base
              "
            >

              Belum ada pesanan aktif ditemukan.

            </p>

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

              Pesan Sekarang

            </button>

          </div>

        )
      }

      {/* LIST */}

      <div className="space-y-4 md:space-y-8">

        {
          filteredPesanan.map(
            (item) => {

              let items = [];

              try {

                items =
                  typeof item.items ===
                  "string"

                    ? JSON.parse(
                        item.items ||
                        "[]"
                      )

                    : item.items || [];

              } catch {

                items = [];

              }

              const statusConfig =
                getStatusConfig(
                  item.status
                );

              return (

                <div
                  key={item.id}
                  className="
                  bg-white
                  rounded-[30px]
                  md:rounded-[40px]
                  shadow-sm
                  overflow-hidden
                  "
                >

                  {/* HEADER */}

                  <div
                    className="
                    bg-[#002366]
                    px-4
                    md:px-8
                    py-4
                    md:py-6
                    flex
                    flex-col
                    gap-4
                    "
                  >

                    {/* KODE */}

                    <div>

                      <p
                        className="
                        text-white/70
                        text-xs
                        md:text-sm
                        "
                      >

                        Kode Pesanan

                      </p>

                      <h2
                        className="
                        text-white
                        text-xl
                        md:text-3xl
                        font-black
                        "
                      >

                        {
                          item.kode_pesanan
                        }

                      </h2>

                    </div>

                    {/* STATUS */}

                    <div>

                      <div
                        className={`
                        px-4
                        py-3
                        rounded-2xl
                        font-black
                        text-sm
                        md:text-lg
                        inline-block
                        text-white

                        ${statusConfig.bg}
                        `}
                      >

                        {
                          statusConfig.label
                        }

                      </div>

                      <p
                        className="
                        text-white/80
                        text-sm
                        mt-3
                        "
                      >

                        {
                          statusConfig.text
                        }

                      </p>

                    </div>

                  </div>

                  {/* CONTENT */}

                  <div
                    className="
                    p-4
                    md:p-8
                    "
                  >

                    {/* INFO */}

                    <div
                      className="
                      grid
                      grid-cols-2
                      gap-3
                      md:gap-6
                      mb-8
                      "
                    >

                      {/* MEJA */}

                      <div
                        className="
                        bg-[#f8f9fc]
                        rounded-2xl
                        md:rounded-3xl
                        p-3
                        md:p-5
                        "
                      >

                        <p
                          className="
                          text-gray-400
                          mb-2
                          text-xs
                          md:text-sm
                          "
                        >

                          Nomor Meja

                        </p>

                        <h3
                          className="
                          text-lg
                          md:text-3xl
                          font-black
                          text-[#002366]
                          "
                        >

                          {
                            item.meja?.nomor_meja || "-"
                          }

                        </h3>

                      </div>

                      {/* PEMBAYARAN */}

                      <div
                        className="
                        bg-[#f8f9fc]
                        rounded-2xl
                        md:rounded-3xl
                        p-3
                        md:p-5
                        "
                      >

                        <p
                          className="
                          text-gray-400
                          mb-2
                          text-xs
                          md:text-sm
                          "
                        >

                          Pembayaran

                        </p>

                        <h3
                          className="
                          text-base
                          md:text-2xl
                          font-black
                          text-[#002366]
                          "
                        >

                          {
                            item.metode_pembayaran
                          }

                        </h3>

                      </div>

                      {/* TOTAL */}

                      <div
                        className="
                        bg-[#f8f9fc]
                        rounded-2xl
                        md:rounded-3xl
                        p-3
                        md:p-5
                        "
                      >

                        <p
                          className="
                          text-gray-400
                          mb-2
                          text-xs
                          md:text-sm
                          "
                        >

                          Total Harga

                        </p>

                        <h3
                          className="
                          text-base
                          md:text-2xl
                          font-black
                          text-[#FF8C00]
                          "
                        >

                          Rp{" "}

                          {
                            Number(
                              item.total_harga
                            ).toLocaleString(
                              "id-ID"
                            )
                          }

                        </h3>

                      </div>

                      {/* TANGGAL */}

                      <div
                        className="
                        bg-[#f8f9fc]
                        rounded-2xl
                        md:rounded-3xl
                        p-3
                        md:p-5
                        "
                      >

                        <p
                          className="
                          text-gray-400
                          mb-2
                          text-xs
                          md:text-sm
                          "
                        >

                          Tanggal

                        </p>

                        <h3
                          className="
                          text-xs
                          md:text-lg
                          font-black
                          text-[#002366]
                          leading-relaxed
                          "
                        >

                          {
                            new Date(
                              item.created_at
                            ).toLocaleString(
                              "id-ID"
                            )
                          }

                        </h3>

                      </div>

                    </div>

                    {/* LIST MENU */}

                    <div>

                      <h2
                        className="
                        text-2xl
                        md:text-3xl
                        font-black
                        text-[#002366]
                        mb-5
                        "
                      >

                        Daftar Pesanan

                      </h2>

                      <div className="space-y-3 md:space-y-5">

                        {
                          items.map(
                            (
                              menu,
                              index
                            ) => (

                              <div
                                key={index}
                                className="
                                bg-[#f8f9fc]
                                rounded-2xl
                                md:rounded-3xl
                                p-3
                                md:p-5
                                "
                              >

                                <div
                                  className="
                                  flex
                                  items-center
                                  gap-3
                                  "
                                >

                                  {/* IMAGE */}

                                  <div
                                    className="
                                    w-14
                                    h-14
                                    md:w-24
                                    md:h-24
                                    rounded-2xl
                                    overflow-hidden
                                    bg-gray-200
                                    flex-shrink-0
                                    "
                                  >

                                    <img
                                      src={
                                        menu.gambar ||
                                        menu.img
                                      }
                                      alt={
                                        menu.nama
                                      }
                                      className="
                                      w-full
                                      h-full
                                      object-cover
                                      "
                                    />

                                  </div>

                                  {/* INFO */}

                                  <div className="flex-1">

                                    <h3
                                      className="
                                      text-base
                                      md:text-2xl
                                      font-black
                                      text-[#002366]
                                      "
                                    >

                                      {
                                        menu.nama
                                      }

                                    </h3>

                                    <p
                                      className="
                                      text-gray-500
                                      mt-1
                                      text-xs
                                      md:text-base
                                      "
                                    >

                                      {
                                        menu.qty
                                      }{" "}
                                      x Rp{" "}

                                      {
                                        Number(
                                          menu.harga
                                        ).toLocaleString(
                                          "id-ID"
                                        )
                                      }

                                    </p>

                                  </div>

                                </div>

                                {/* SUBTOTAL */}

                                <h2
                                  className="
                                  text-lg
                                  md:text-3xl
                                  font-black
                                  text-[#FF8C00]
                                  mt-3
                                  "
                                >

                                  Rp{" "}

                                  {
                                    (
                                      Number(
                                        menu.harga
                                      ) *
                                      Number(
                                        menu.qty
                                      )
                                    ).toLocaleString(
                                      "id-ID"
                                    )
                                  }

                                </h2>

                              </div>

                            )
                          )
                        }

                      </div>

                    </div>

                    {/* ACTION */}

                    <div
                      className="
                      mt-8
                      flex
                      flex-wrap
                      gap-3
                      "
                    >

                      {
                        item.status ===
                          "menunggu_pembayaran" && (

                          <button
                            onClick={() =>
                              handleBatalkanPesanan(
                                item.id
                              )
                            }
                            className="
                            bg-red-600
                            hover:bg-red-700
                            text-white
                            font-black
                            px-6
                            py-4
                            rounded-2xl
                            md:rounded-3xl
                            "
                          >

                            Batalkan Pesanan

                          </button>

                        )
                      }

                      <button
                        onClick={() => {

                          try {

                            const keranjangLama =
                              JSON.parse(
                                localStorage.getItem(
                                  "keranjang"
                                )
                              ) || [];

                            let updatedKeranjang =
                              [...keranjangLama];

                            items.forEach(
                              (menu) => {

                                const existingItem =
                                  updatedKeranjang.find(
                                    (x) =>
                                      x.id === menu.id
                                  );

                                if (existingItem) {

                                  updatedKeranjang =
                                    updatedKeranjang.map(
                                      (x) => {

                                        if (
                                          x.id === menu.id
                                        ) {

                                          return {

                                            ...x,

                                            qty:
                                              x.qty +
                                              menu.qty

                                          };

                                        }

                                        return x;

                                      }
                                    );

                                }

                                else {

                                  updatedKeranjang.push({

                                    id: menu.id,

                                    nama:
                                      menu.nama,

                                    harga:
                                      menu.harga,

                                    gambar:
                                      menu.gambar ||
                                      menu.img,

                                    qty:
                                      menu.qty

                                  });

                                }

                              }
                            );

                            localStorage.setItem(
                              "keranjang",
                              JSON.stringify(
                                updatedKeranjang
                              )
                            );

                            toast.success(
                              "Pesanan berhasil dimasukkan ke keranjang"
                            );

                            navigate(
                              "/keranjang"
                            );

                          } catch (error) {

                            console.log(error);

                            toast.error(
                              "Gagal memesan ulang"
                            );

                          }

                        }}
                        className="
                        bg-[#002366]
                        hover:bg-blue-950
                        text-white
                        font-black
                        px-6
                        py-4
                        rounded-2xl
                        md:rounded-3xl
                        "
                      >

                        Pesan Lagi

                      </button>

                    </div>

                  </div>

                </div>

              );

            }
          )
        }

      </div>

    </div>

  );

};

export default StatusPesananPembeli;