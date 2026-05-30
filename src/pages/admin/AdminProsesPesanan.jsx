import React, {
  useEffect,
  useState
} from "react";

import { supabase }
from "../../lib/supabaseClient";

import toast
from "react-hot-toast";

const AdminProsesPesanan = () => {

  const [pesanan, setPesanan] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(null);

  // SEARCH
  const [search, setSearch] =
    useState("");

  // PAGINATION MENU
  const [menuPage, setMenuPage] =
    useState({});

  // =========================
  // FETCH DATA
  // =========================

  const fetchPesanan = async () => {

  try {

    setLoading(true);

    // AMBIL PESANAN
    const {
      data: pesananData,
      error: pesananError
    } = await supabase
      .from("pesanan")
      .select("*")
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

    if (pesananError)
      throw pesananError;

    // AMBIL MEJA
    const {
      data: mejaData,
      error: mejaError
    } = await supabase
      .from("meja")
      .select("*");

    if (mejaError)
      throw mejaError;

    // GABUNGKAN MANUAL
    const finalData =
      (pesananData || []).map(
        (item) => {

          const meja =
            mejaData.find(
              (m) =>
                m.id === item.meja_id
            );

          return {

            ...item,

            meja: meja || null

          };

        }
      );

    setPesanan(finalData);

  } catch (error) {

    console.log(error);

    toast.error(
      "Gagal mengambil pesanan"
    );

  } finally {

    setLoading(false);

  }

};

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {

    fetchPesanan();

  }, []);

  // =========================
  // REALTIME
  // =========================

  useEffect(() => {

  const channel = supabase
    .channel("admin-pesanan-realtime")

    // INSERT
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "pesanan"
      },
      async (payload) => {

        console.log(
          "INSERT REALTIME:",
          payload
        );

        const newPesanan =
          payload.new;

        // AMBIL DATA MEJA
        const {
          data: mejaData
        } = await supabase
          .from("meja")
          .select("nomor_meja")
          .eq(
            "id",
            newPesanan.meja_id
          )
          .single();

        const finalData = {

          ...newPesanan,

          meja: mejaData

        };

        // MASUKKAN KE STATE
        setPesanan((prev) => [

          finalData,

          ...prev

        ]);

      }
    )

    // UPDATE
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "pesanan"
      },
      (payload) => {

        console.log(
          "UPDATE REALTIME:",
          payload
        );

        const updated =
          payload.new;

        setPesanan((prev) =>

          prev.map((item) =>

            item.id === updated.id

              ? {
                  ...item,
                  ...updated
                }

              : item
          )
        );

      }
    )

    .subscribe((status) => {

      console.log(
        "STATUS REALTIME:",
        status
      );

    });

  return () => {

    supabase.removeChannel(
      channel
    );

  };

}, []);
  // =========================
  // SEARCH FILTER
  // =========================

  const filteredPesanan =
    pesanan.filter(
      (item) => {

        const keyword =
          search
            .toLowerCase()
            .trim();

        const searchKode =
          item.kode_pesanan
            ?.toLowerCase()
            .includes(
              keyword
            );

        const searchMeja =
          keyword.startsWith(
            "m"
          ) &&
          `m${item.meja?.nomor_meja || ""}` ===
            keyword;

        return (
          searchKode ||
          searchMeja
        );

      }
    );

  // =========================
  // KONFIRMASI PEMBAYARAN
  // =========================

  const handleKonfirmasiPembayaran =
    async (id) => {

      try {

        setActionLoading(id);

        const currentPesanan =
          pesanan.find(
            (x) => x.id === id
          );

        if (!currentPesanan) {

          toast.error(
            "Pesanan tidak ditemukan"
          );

          return;

        }

        // UPDATE STATUS PESANAN
        const {
          error
        } = await supabase
          .from("pesanan")
          .update({
            status:
              "diproses"
          })
          .eq("id", id);

        if (error)
          throw error;

        // UPDATE STATUS MEJA
        const {
          error: mejaError
        } = await supabase
          .from("meja")
          .update({
            status:
              "dipakai"
          })
          .eq(
            "id",
            currentPesanan.meja_id
          );
          

        if (mejaError)
          throw mejaError;

        toast.success(
          "Pembayaran dikonfirmasi"
        );

        await fetchPesanan();

      } catch (error) {

        console.log(error);

        toast.error(
          "Gagal konfirmasi pembayaran"
        );

      } finally {

        setActionLoading(null);

      }

    };

  // =========================
  // SELESAIKAN PESANAN
  // =========================

  const handleSelesai =
  async (id) => {

    try {

      setActionLoading(id);

      const currentPesanan =
        pesanan.find(
          (x) => x.id === id
        );

      if (!currentPesanan) {

        toast.error(
          "Pesanan tidak ditemukan"
        );

        return;

      }

      // UPDATE STATUS PESANAN

      const {
        error
      } = await supabase
        .from("pesanan")
        .update({
          status:
            "selesai"
        })
        .eq("id", id);

      if (error)
        throw error;

      // MASUKKAN KE HISTORY

      await supabase
        .from("history_pesanan")
        .insert([
          {

            nomor_meja:
              currentPesanan.meja
                ?.nomor_meja || 0,

            total_harga:
              currentPesanan.total_harga,

            metode_pembayaran:
              currentPesanan.metode_pembayaran,

            status:
              "Selesai",

            items: (
              Array.isArray(currentPesanan.items)
                ? currentPesanan.items
                : JSON.parse(
                    currentPesanan.items || "[]"
                  )
            ).map((item) => ({

              ...item,

              subtotal:
                item.subtotal ||
                (item.harga * item.qty)

            })),

            kode_pesanan:
              currentPesanan.kode_pesanan

          }
        ]);

      // UPDATE STATUS MEJA

      const {
        error: mejaError
      } = await supabase
        .from("meja")
        .update({
          status:
            "tersedia"
        })
        .eq(
          "id",
          currentPesanan.meja_id
        );

      if (mejaError)
        throw mejaError;

      toast.success(
        "Pesanan selesai"
      );

      // REFRESH DATA

      await fetchPesanan();

    } catch (error) {

      console.log(error);

      toast.error(
        "Gagal menyelesaikan pesanan"
      );

    } finally {

      setActionLoading(null);

    }

  };

  // =========================
  // PAGINATION MENU
  // =========================

  const ITEMS_PER_PAGE = 5;

  const handleNextMenu =
    (
      id,
      totalItems
    ) => {

      const totalPage =
        Math.ceil(
          totalItems /
          ITEMS_PER_PAGE
        );

      setMenuPage((prev) => ({

        ...prev,

        [id]:
          (prev[id] || 0) + 1 >=
          totalPage

            ? prev[id] || 0

            : (prev[id] || 0) + 1

      }));

    };

  const handlePrevMenu =
    (id) => {

      setMenuPage((prev) => ({

        ...prev,

        [id]:
          (prev[id] || 0) - 1 < 0

            ? 0

            : (prev[id] || 0) - 1

      }));

    };

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
        h-screen
        bg-[#f3f4f6]
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
      bg-[#f3f4f6]
      p-5
      md:p-9
      "
    >

      {/* HEADER */}

      <div className="mb-8">

        <h1
          className="
          text-4xl
          font-black
          text-[#002366]
          "
        >

          Monitoring{" "}

          <span className="text-[#FF8C00]">

            Pesanan

          </span>

        </h1>

      </div>

      {/* SEARCH */}

      <div className="mb-8">

        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Cari kode pesanan / meja..."
          className="
          w-full
          md:w-[380px]
          h-[55px]
          rounded-2xl
          border-2
          border-[#FF8C00]
          bg-white
          px-5
          outline-none
          font-semibold
          text-gray-700
          "
        />

      </div>

      {/* GRID */}

      <div
        className="
        grid
        grid-cols-1
        md:grid-cols-2
        xl:grid-cols-3
        gap-5
        "
      >

        {
          filteredPesanan.length ===
          0 && (

            <div
              className="
              col-span-full
              bg-white
              rounded-3xl
              p-20
              text-center
              shadow
              "
            >

              <h1
                className="
                text-2xl
                font-black
                text-gray-400
                "
              >

                Tidak ada pesanan aktif

              </h1>

            </div>

          )
        }

        {
          filteredPesanan.map(
            (item) => {

              const currentMenuPage =
                menuPage[item.id] || 0;

              const start =
                currentMenuPage *
                ITEMS_PER_PAGE;

              const end =
                start + ITEMS_PER_PAGE;

              let parsedItems = [];

              try {

                parsedItems =
                  Array.isArray(
                    item.items
                  )

                    ? item.items

                    : JSON.parse(
                        item.items ||
                        "[]"
                      );

              } catch {

                parsedItems = [];

              }

              const currentItems =
                parsedItems.slice(
                  start,
                  end
                );

              const totalPage =
                Math.ceil(
                  parsedItems.length /
                  ITEMS_PER_PAGE
                );

              return (

                <div
                  key={item.id}
                  className="
                  bg-white
                  rounded-[30px]
                  overflow-hidden
                  border
                  border-gray-300
                  shadow-md
                  flex
                  flex-col
                  min-h-[470px]
                  "
                >

                  {/* HEADER */}

                  <div
                    className="
                    bg-[#002366]
                    text-white
                    p-5
                    "
                  >

                    <div
                      className="
                      flex
                      justify-between
                      items-start
                      "
                    >

                      <div>

                        <h1
                          className="
                          text-2xl
                          font-black
                          "
                        >
                          MEJA {item.meja?.nomor_meja || "-"}
                        </h1>

                        <p
                          className="
                          text-base
                          mt-1
                          font-bold
                          text-white
                          "
                        >
                          {item.nama_pembeli || "Tanpa Nama"}
                        </p>

                        <p
                          className="
                          text-sm
                          mt-1
                          font-bold
                          text-gray-300
                          "
                        >
                          {item.kode_pesanan}
                        </p>

                        <p
                          className="
                          text-sm
                          text-gray-200
                          mt-1
                          "
                        >

                          {
                            new Date(
                              item.created_at
                            ).toLocaleString(
                              "id-ID"
                            )
                          }

                        </p>

                      </div>

                      <div
                        className={`
                        text-white
                        text-xs
                        font-black
                        px-3
                        py-2
                        rounded-lg

                        ${
                          item.status ===
                          "menunggu_pembayaran"

                            ? "bg-red-500"

                            : "bg-[#FF8C00]"
                        }
                        `}
                      >

                        {
                          item.status ===
                          "menunggu_pembayaran"

                            ? "MENUNGGU PEMBAYARAN"

                            : "DIPROSES"
                        }

                      </div>

                    </div>

                  </div>

                  {/* BODY */}

                  <div
                    className="
                    flex-1
                    p-5
                    flex
                    flex-col
                    "
                  >

                    {/* MENU */}

                    <div className="flex-1">

                      {
                        currentItems.map(
                          (
                            menu,
                            index
                          ) => (

                            <div
                              key={index}
                              className="
                              flex
                              justify-between
                              border-b
                              border-gray-300
                              py-2
                              "
                            >

                              <div
                                className="
                                font-semibold
                                text-gray-700
                                "
                              >

                                <span
                                  className="
                                  text-[#FF8C00]
                                  font-black
                                  "
                                >

                                  {menu.qty}x

                                </span>{" "}

                                {menu.nama}

                              </div>

                              <div
                                className="
                                font-black
                                text-gray-400
                                "
                              >

                                Rp{" "}

                                {
                                  Number(
                                    menu.subtotal ||
                                    menu.harga * menu.qty
                                  ).toLocaleString()
                                }

                              </div>

                            </div>

                          )
                        )
                      }

                    </div>

                    {/* PAGINATION */}

                    {
                      parsedItems.length > 5 && (

                        <div
                          className="
                          flex
                          items-center
                          justify-between
                          mt-4
                          "
                        >

                          <button
                            onClick={() =>
                              handlePrevMenu(
                                item.id
                              )
                            }
                            disabled={
                              currentMenuPage === 0
                            }
                            className={`
                            px-4
                            py-2
                            rounded-xl
                            font-bold

                            ${
                              currentMenuPage === 0

                                ? "bg-gray-100 text-gray-300"

                                : "bg-[#002366] text-white"
                            }
                            `}
                          >

                            Prev

                          </button>

                          <div
                            className="
                            font-black
                            text-[#002366]
                            "
                          >

                            {currentMenuPage + 1}
                            {" / "}
                            {totalPage}

                          </div>

                          <button
                            onClick={() =>
                              handleNextMenu(
                                item.id,
                                parsedItems.length
                              )
                            }
                            disabled={
                              currentMenuPage + 1 >=
                              totalPage
                            }
                            className={`
                            px-4
                            py-2
                            rounded-xl
                            font-bold

                            ${
                              currentMenuPage + 1 >= totalPage

                                ? "bg-gray-100 text-gray-300"

                                : "bg-[#FF8C00] text-white"
                            }
                            `}
                          >

                            Next

                          </button>

                        </div>

                      )
                    }

                    {/* TOTAL */}

                    {/* TOTAL */}

                    <div
                      className="
                      mt-6
                      flex
                      items-center
                      justify-between
                      gap-4
                      "
                    >

                      <p
                        className="
                        text-gray-400
                        text-lg
                        font-black
                        uppercase
                        leading-none
                        "
                      >
                        Total Bayar
                      </p>

                      <h1
                        className="
                        text-5xl
                        font-black
                        text-[#002366]
                        leading-none
                        "
                      >

                        Rp{" "}

                        {
                          Number(
                            item.total_harga
                          ).toLocaleString()
                        }

                      </h1>

                    </div>

                    {/* ACTION */}

                    <div
                      className="
                      flex
                      gap-3
                      mt-6
                      "
                    >

                      {
                        item.status ===
                        "menunggu_pembayaran" && (

                          <button
                            onClick={() =>
                              handleKonfirmasiPembayaran(
                                item.id
                              )
                            }
                            disabled={
                              actionLoading === item.id
                            }
                            className="
                            flex-1
                            h-[55px]
                            rounded-2xl
                            bg-[#FF8C00]
                            text-white
                            font-black
                            tracking-wider
                            disabled:opacity-50
                            "
                          >

                            {
                              actionLoading === item.id

                                ? "MEMPROSES..."

                                : "KONFIRMASI PEMBAYARAN"
                            }

                          </button>

                        )
                      }

                      {
                        item.status ===
                        "diproses" && (

                          <button
                            onClick={() =>
                              handleSelesai(
                                item.id
                              )
                            }
                            disabled={
                              actionLoading === item.id
                            }
                            className="
                            flex-1
                            h-[55px]
                            rounded-2xl
                            bg-[#00C951]
                            text-white
                            font-black
                            tracking-wider
                            disabled:opacity-50
                            "
                          >

                            {
                              actionLoading === item.id

                                ? "MEMPROSES..."

                                : "SELESAIKAN PESANAN"
                            }

                          </button>

                        )
                      }

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

export default AdminProsesPesanan;