import React, {
  useEffect,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabaseClient";

const RiwayatPesananPembeli = () => {

  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================

  const [loading, setLoading] =
    useState(true);

  const [riwayat, setRiwayat] =
    useState([]);

  const [search, setSearch] =
    useState("");

  // =========================
  // FETCH DATA
  // =========================

  const fetchRiwayat = async () => {

    try {

      setLoading(true);

      const {
        data,
        error
      } = await supabase
        .from("history_pesanan")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );

      if (error) throw error;

      setRiwayat(data || []);

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    fetchRiwayat();

  }, []);

  // =========================
  // FILTER
  // =========================

  const filteredRiwayat =
    riwayat.filter((item) => {

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

    });

  // =========================
  // LOADING
  // =========================

  if (loading) {

    return (

      <div className="flex items-center justify-center min-h-screen bg-[#f0f2f5]">

        <div className="w-14 h-14 border-4 border-[#002366] border-t-transparent rounded-full animate-spin"></div>

      </div>

    );

  }

  return (

    <div className="min-h-screen bg-[#f0f2f5] px-6 md:px-12 py-10">

      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

        <div>

          <h1 className="text-4xl md:text-5xl font-black text-[#002366]">

            Riwayat <span className="text-[#FF8C00]">Pesanan</span>

          </h1>

          <p className="text-gray-500 mt-3">

            Lihat daftar riwayat pesanan yang telah dilakukan.

          </p>

        </div>

        {/* SEARCH */}
        <div className="w-full md:w-[350px]">

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Cari kode pesanan / m12"
            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:border-[#002366] shadow-sm"
          />

          <p className="text-gray-400 text-sm mt-2">

            Untuk mencari meja gunakan format m + nomor meja

          </p>

        </div>

      </div>

      {/* ========================= */}
      {/* EMPTY */}
      {/* ========================= */}

      {filteredRiwayat.length === 0 && (

        <div className="bg-white rounded-[40px] p-16 text-center shadow-sm">

          <div className="text-8xl mb-8">

            📄

          </div>

          <h2 className="text-4xl font-black text-[#002366]">

            Riwayat Tidak Ditemukan

          </h2>

          <p className="text-gray-500 mt-5 leading-relaxed">

            Belum ada data riwayat pesanan.

          </p>

        </div>

      )}

      {/* ========================= */}
      {/* LIST RIWAYAT */}
      {/* ========================= */}

      <div className="space-y-8">

        {filteredRiwayat.map((item) => (

          <div
            key={item.id}
            className="bg-white rounded-[40px] shadow-sm overflow-hidden"
          >

            {/* ========================= */}
            {/* HEADER CARD */}
            {/* ========================= */}

            <div className="bg-[#002366] px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">

              <div>

                <p className="text-white/70 text-sm">

                  Kode Pesanan

                </p>

                <h2 className="text-white text-3xl font-black">

                  {item.kode_pesanan}

                </h2>

              </div>

              {/* STATUS */}
              <div>

                <div
                  className={`px-6 py-3 rounded-2xl font-black text-lg

                  ${
                    item.status ===
                    "Selesai"

                      ? "bg-green-500 text-white"

                    : item.status ===
                      "Dibatalkan"

                      ? "bg-red-500 text-white"

                    : "bg-[#FF8C00] text-white"
                  }
                  
                  `}
                >

                  {item.status}

                </div>

              </div>

            </div>

            {/* ========================= */}
            {/* CONTENT */}
            {/* ========================= */}

            <div className="p-8">

              {/* INFO */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

                {/* MEJA */}
                <div className="bg-[#f8f9fc] rounded-3xl p-5">

                  <p className="text-gray-400 mb-2">

                    Nomor Meja

                  </p>

                  <h3 className="text-3xl font-black text-[#002366]">

                    {item.nomor_meja}

                  </h3>

                </div>

                {/* PEMBAYARAN */}
                <div className="bg-[#f8f9fc] rounded-3xl p-5">

                  <p className="text-gray-400 mb-2">

                    Pembayaran

                  </p>

                  <h3 className="text-2xl font-black text-[#002366]">

                    {item.metode_pembayaran}

                  </h3>

                </div>

                {/* TOTAL */}
                <div className="bg-[#f8f9fc] rounded-3xl p-5">

                  <p className="text-gray-400 mb-2">

                    Total Harga

                  </p>

                  <h3 className="text-2xl font-black text-[#FF8C00]">

                    Rp{" "}
                    {Number(
                      item.total_harga
                    ).toLocaleString()}

                  </h3>

                </div>

                {/* TANGGAL */}
                <div className="bg-[#f8f9fc] rounded-3xl p-5">

                  <p className="text-gray-400 mb-2">

                    Tanggal

                  </p>

                  <h3 className="text-lg font-black text-[#002366]">

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

                <h2 className="text-3xl font-black text-[#002366] mb-6">

                  Daftar Menu

                </h2>

                <div className="space-y-5">

                  {(Array.isArray(item.items)

                    ? item.items

                    : JSON.parse(
                        item.items || "[]"
                      )

                  ).map((menu, index) => (

                    <div
                      key={index}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 bg-[#f8f9fc] rounded-3xl p-5"
                    >

                      {/* KIRI */}
                      <div className="flex items-center gap-5">

                        {/* IMAGE */}
                        <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gray-200">

                          <img
                            src={menu.img}
                            alt={menu.nama}
                            className="w-full h-full object-cover"
                          />

                        </div>

                        {/* NAMA */}
                        <div>

                          <h3 className="text-2xl font-black text-[#002366]">

                            {menu.nama}

                          </h3>

                          <p className="text-gray-500 mt-2">

                            {menu.qty} x Rp{" "}
                            {Number(
                              menu.harga
                            ).toLocaleString()}

                          </p>

                        </div>

                      </div>

                      {/* TOTAL */}
                      <h2 className="text-3xl font-black text-[#FF8C00]">

                        Rp{" "}
                        {(
                          Number(menu.harga) *
                          Number(menu.qty)
                        ).toLocaleString()}

                      </h2>

                    </div>

                  ))}

                </div>

              </div>

              {/* ========================= */}
              {/* BUTTON */}
              {/* ========================= */}

              <div className="flex flex-wrap gap-4 mt-10">

                <button
                  onClick={() =>
                    navigate(
                      "/daftar-menu"
                    )
                  }
                  className="bg-[#002366] hover:bg-blue-950 text-white font-black px-8 py-4 rounded-3xl transition-all duration-300"
                >

                  Pesan Lagi

                </button>

                {item.status !==
                  "Dibatalkan" &&

                  item.status !==
                    "Selesai" && (

                  <button
                    className="bg-red-500 hover:bg-red-600 text-white font-black px-8 py-4 rounded-3xl transition-all duration-300"
                  >

                    Batalkan Pesanan

                  </button>

                )}

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

};

export default RiwayatPesananPembeli;