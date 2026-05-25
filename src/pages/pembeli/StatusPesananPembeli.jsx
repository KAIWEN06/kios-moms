import React, {
  useEffect,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../../config/supabase";

import toast from "react-hot-toast";

const StatusPesananPembeli = () => {

  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [pesanan, setPesanan] =
    useState([]);

  // =========================
  // FETCH DATA
  // =========================

  const fetchPesanan =
    async () => {

      try {

        setLoading(true);

        const {
          data,
          error
        } = await supabase
          .from("pesanan")
          .select("*")
          .eq(
            "status",
            "diproses"
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          );

        if (error)
          throw error;

        setPesanan(
          data || []
        );

      } catch (error) {

        console.log(error);

        toast.error(
          "Gagal mengambil data pesanan"
        );

      } finally {

        setLoading(false);

      }

    };

  // =========================
  // LOAD DATA
  // =========================

  useEffect(() => {

    fetchPesanan();

  }, []);

  // =========================
  // REALTIME
  // =========================

  useEffect(() => {

    const channel =
      supabase
        .channel(
          "status-pesanan"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pesanan"
          },
          () => {

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

  // =========================
  // FILTER
  // =========================

  const filteredPesanan =
    pesanan.filter(
      (item) => {

        const kode =
          item.kode_pesanan
            ?.toLowerCase()
            .includes(
              search.toLowerCase()
            );

        const meja =
          `m${item.nomor_meja}`
            .toLowerCase()
            .includes(
              search.toLowerCase()
            );

        return kode || meja;

      }
    );

  // =========================
  // LOADING
  // =========================

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

      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

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

            Lihat status pesanan Anda secara realtime.

          </p>

        </div>

        {/* SEARCH */}

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

      </div>

      {/* ========================= */}
      {/* EMPTY */}
      {/* ========================= */}

      {filteredPesanan.length === 0 && (

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

            Tidak Ada Pesanan Diproses

          </h2>

          <p
            className="
            text-gray-500
            mt-4
            text-sm
            md:text-base
            "
          >

            Semua pesanan selesai atau belum ada pesanan.

          </p>

        </div>

      )}

      {/* ========================= */}
      {/* LIST */}
      {/* ========================= */}

      <div className="space-y-4 md:space-y-8">

        {filteredPesanan.map(
          (item) => {

            const items =
              typeof item.items ===
              "string"

                ? JSON.parse(
                    item.items || "[]"
                  )

                : item.items;

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

                {/* ========================= */}
                {/* HEADER CARD */}
                {/* ========================= */}

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
                      className="
                      px-4
                      py-3
                      rounded-2xl
                      font-black
                      text-sm
                      md:text-lg
                      inline-block
                      bg-[#FF8C00]
                      text-white
                      "
                    >

                      Diproses

                    </div>

                  </div>

                </div>

                {/* ========================= */}
                {/* CONTENT */}
                {/* ========================= */}

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
                          item.nomor_meja
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

                        {Number(
                          item.total_harga
                        ).toLocaleString(
                          "id-ID"
                        )}

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

                        {new Date(
                          item.created_at
                        ).toLocaleString(
                          "id-ID"
                        )}

                      </h3>

                    </div>

                  </div>

                  {/* ========================= */}
                  {/* LIST MENU */}
                  {/* ========================= */}

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

                      {items.map(
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

                              {/* NAMA */}

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

                                  {Number(
                                    menu.harga
                                  ).toLocaleString(
                                    "id-ID"
                                  )}

                                </p>

                              </div>

                            </div>

                            {/* TOTAL */}

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

                              {(
                                Number(
                                  menu.harga
                                ) *
                                Number(
                                  menu.qty
                                )
                              ).toLocaleString(
                                "id-ID"
                              )}

                            </h2>

                          </div>

                        )
                      )}

                    </div>

                  </div>

                  {/* ========================= */}
                  {/* BUTTON */}
                  {/* ========================= */}

                  <div className="mt-8">

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
                      font-black
                      px-6
                      py-4
                      rounded-2xl
                      md:rounded-3xl
                      transition-all
                      duration-300
                      text-sm
                      md:text-base
                      "
                    >

                      Pesan Lagi

                    </button>

                  </div>

                </div>

              </div>

            );

          }
        )}

      </div>

    </div>

  );

};

export default StatusPesananPembeli;