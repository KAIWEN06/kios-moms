import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import toast from "react-hot-toast";

const AdminProsesPesanan = () => {

  const [pesanan, setPesanan] = useState([]);
  const [loading, setLoading] = useState(true);

  // SEARCH
  const [search, setSearch] = useState("");

  // PAGINATION MENU
  const [menuPage, setMenuPage] = useState({});

  // =========================
  // FETCH DATA
  // =========================

  const fetchPesanan = async () => {

    try {

      setLoading(true);

      const { data, error } = await supabase
        .from("history_pesanan")
        .select("*")
        .eq("status", "Diproses")
        .order("id", { ascending: false });

      if (error) throw error;

      setPesanan(data || []);

    } catch (error) {

      console.log(error);
      toast.error("Gagal mengambil pesanan");

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    fetchPesanan();

  }, []);

  // =========================
  // SEARCH FILTER
  // =========================

  const filteredPesanan = pesanan.filter((item) => {

    const keyword = search.toLowerCase().trim();

    // SEARCH KODE PESANAN
    const searchKode =
      item.kode_pesanan
        ?.toLowerCase()
        .includes(keyword);

    // SEARCH NOMOR MEJA
    // FORMAT: m + nomor meja
    const searchMeja =
      keyword.startsWith("m") &&
      `m${item.nomor_meja}` === keyword;

    return searchKode || searchMeja;

  });

  // =========================
  // SELESAIKAN PESANAN
  // =========================

  const handleSelesai = async (id) => {

    try {

      const { error } = await supabase
        .from("history_pesanan")
        .update({
          status: "Selesai"
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(
        "Pesanan selesai"
      );

      fetchPesanan();

    } catch (error) {

      console.log(error);

      toast.error(
        "Gagal menyelesaikan pesanan"
      );

    }

  };

  // =========================
  // PAGINATION MENU
  // =========================

  const ITEMS_PER_PAGE = 5;

  const handleNextMenu = (id, totalItems) => {

    const totalPage =
      Math.ceil(
        totalItems / ITEMS_PER_PAGE
      );

    setMenuPage((prev) => ({
      ...prev,
      [id]:
        (prev[id] || 0) + 1 >= totalPage
          ? prev[id] || 0
          : (prev[id] || 0) + 1
    }));

  };

  const handlePrevMenu = (id) => {

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

      <div className="flex items-center justify-center h-screen bg-[#f3f4f6]">

        <div className="w-14 h-14 rounded-full border-4 border-[#002366] border-t-transparent animate-spin"></div>

      </div>

    );

  }

  return (

    <div className="min-h-screen bg-[#f3f4f6] p-5 md:p-9">

      {/* HEADER */}
      <div className="mb-8">

        <h1 className="text-4xl font-black text-[#002366]">

          Monitoring <span className="text-[#FF8C00]">Meja Aktif</span>

        </h1>

      </div>

      {/* SEARCH */}
      <div className="mb-8">

        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Cari kode pesanan / meja..."
          className="w-full md:w-[380px] h-[55px] rounded-2xl border-2 border-[#FF8C00] bg-white px-5 outline-none font-semibold text-gray-700"
        />

        <p className="text-gray-400 text-sm mt-2 ml-1">

          Untuk cari meja gunakan format:
          <span className="font-bold text-[#002366]">
            {" "}m kemudian nomor meja
          </span>

        </p>

      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        {filteredPesanan.length === 0 && (

          <div className="col-span-full bg-white rounded-3xl p-20 text-center shadow">

            <h1 className="text-2xl font-black text-gray-400">

              Pesanan tidak ditemukan

            </h1>

          </div>

        )}

        {filteredPesanan.map((item) => {

          const currentMenuPage =
            menuPage[item.id] || 0;

          const start =
            currentMenuPage * ITEMS_PER_PAGE;

          const end =
            start + ITEMS_PER_PAGE;

          const parsedItems =
            item.items || [];

          const currentItems =
            parsedItems.slice(start, end);

          const totalPage =
            Math.ceil(
              parsedItems.length /
              ITEMS_PER_PAGE
            );

          return (

            <div
              key={item.id}
              className="bg-white rounded-[30px] overflow-hidden border border-gray-300 shadow-md flex flex-col min-h-[470px]"
            >

              {/* HEADER */}
              <div className="bg-[#002366] text-white p-5">

                <div className="flex justify-between items-start">

                  <div>

                    <h1 className="text-2xl font-black">

                      MEJA {item.nomor_meja}

                    </h1>

                    <p className="text-sm mt-1 font-bold text-gray-300">

                      ID: {item.id}

                    </p>

                    <p className="text-[#FF8C00] font-black mt-1">

                      {item.kode_pesanan}

                    </p>

                    <p className="text-sm text-gray-200 mt-1">

                      {new Date(
                        item.created_at
                      ).toLocaleString("id-ID")}

                    </p>

                  </div>

                  <div className="bg-[#FF8C00] text-white text-xs font-black px-3 py-2 rounded-lg">

                    DIPROSES

                  </div>

                </div>

              </div>

              {/* BODY */}
              <div className="flex-1 p-5 flex flex-col">

                {/* MENU */}
                <div className="flex-1">

                  {currentItems.map((menu, index) => (

                    <div
                      key={index}
                      className="flex justify-between border-b border-gray-400 py-2"
                    >

                      <div className="font-semibold text-gray-700">

                        <span className="text-[#FF8C00] font-black">

                          {menu.qty}x

                        </span>{" "}

                        {menu.nama}

                      </div>

                      <div className="font-black text-gray-400">

                        Rp {Number(
                          menu.subtotal
                        ).toLocaleString()}

                      </div>

                    </div>

                  ))}

                </div>

                {/* PAGINATION MENU */}
                {parsedItems.length > 5 && (

                  <div className="flex items-center justify-between mt-4">

                    <button
                      onClick={() =>
                        handlePrevMenu(item.id)
                      }
                      disabled={currentMenuPage === 0}
                      className={`px-4 py-2 rounded-xl font-bold text-sm

                      ${
                        currentMenuPage === 0
                          ? 'bg-gray-100 text-gray-300'
                          : 'bg-[#002366] text-white'
                      }`}
                    >

                      Prev

                    </button>

                    <div className="font-black text-[#002366]">

                      {currentMenuPage + 1} / {totalPage}

                    </div>

                    <button
                      onClick={() =>
                        handleNextMenu(
                          item.id,
                          parsedItems.length
                        )
                      }
                      disabled={
                        currentMenuPage + 1 >= totalPage
                      }
                      className={`px-4 py-2 rounded-xl font-bold text-sm

                      ${
                        currentMenuPage + 1 >= totalPage
                          ? 'bg-gray-100 text-gray-300'
                          : 'bg-[#FF8C00] text-white'
                      }`}
                    >

                      Next

                    </button>

                  </div>

                )}

                {/* METODE */}
                <div className="mt-6 flex justify-between items-center">

                  <div>

                    <p className="text-gray-400 text-sm font-black uppercase">

                      Metode

                    </p>

                  </div>

                  <div
                    className={`px-4 py-1 rounded-full text-sm font-black text-white

                    ${
                      item.metode_pembayaran === "QRIS"
                        ? "bg-blue-500"
                        : "bg-green-500"
                    }`}
                  >

                    {item.metode_pembayaran}

                  </div>

                </div>

                {/* TOTAL */}
                <div className="mt-5">

                  <p className="text-gray-400 text-sm font-black uppercase">

                    Total Bayar

                  </p>

                  <h1 className="text-4xl font-black text-[#002366] text-right">

                    Rp {Number(
                      item.total_harga
                    ).toLocaleString()}

                  </h1>

                </div>

                {/* BUTTON */}
                <button
                  onClick={() =>
                    handleSelesai(item.id)
                  }
                  className="mt-6 h-[55px] rounded-2xl bg-[#00C951] text-white font-black tracking-wider hover:scale-[1.02] transition-all"
                >

                  SELESAIKAN PESANAN

                </button>

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

};

export default AdminProsesPesanan;