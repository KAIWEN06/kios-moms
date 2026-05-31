import React, {
  useEffect,
  useState
} from "react";

import {
  useNavigate,
  useSearchParams
} from "react-router-dom";

import { supabase } from "../../lib/supabaseClient";

import toast
from "react-hot-toast";

const RiwayatPesananPembeli = () => {

  const navigate = useNavigate();

  const [searchParams] =
  useSearchParams();

const tokenFromUrl =
  searchParams.get("token");

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

      let token =
      tokenFromUrl ||
      localStorage.getItem(
        "guestToken"
      );

    if (!token) {

      setRiwayat([]);

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

  setRiwayat([]);

  setLoading(false);

  return;
}

const {
  data,
  error
} = await supabase
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
    "selesai",
    "dibatalkan"
  ])
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

const handlePesanLagi = (pesanan) => {

  try {

    const items =
      typeof pesanan.items === "string"
        ? JSON.parse(pesanan.items)
        : pesanan.items;

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
      JSON.stringify(keranjangBaru)
    );

    toast.success(
      "Pesanan berhasil dimuat ke keranjang"
    );

    navigate("/keranjang");

  } catch (error) {

    console.error(error);

    toast.error(
      "Gagal memesan ulang"
    );

  }

};

useEffect(() => {

  fetchRiwayat();

}, [tokenFromUrl]);

  useEffect(() => {

  const channel = supabase
    .channel("riwayat-pesanan")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pesanan"
      },
      () => {
        fetchRiwayat();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };

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
        `m${item.meja?.nomor_meja || ""}`
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
                    item.status === "selesai"

                      ? "bg-green-500 text-white"

                    : item.status === "dibatalkan"

                      ? "bg-red-500 text-white"

                    : "bg-[#FF8C00] text-white"
                  }
                  
                  `}
                >

                  {
                    item.status === "selesai"
                      ? "Selesai"

                    : item.status === "dibatalkan"
                      ? "Dibatalkan"

                    : item.status === "diproses"
                      ? "Diproses"

                    : "Menunggu Pembayaran"
                  }

                </div>

                {
                  item.status === "dibatalkan" &&
                  item.alasan_pembatalan && (

                    <div
                      className="
                      mt-4
                      bg-red-50
                      border
                      border-red-200
                      rounded-2xl
                      p-4
                      "
                    >

                      <p
                        className="
                        text-sm
                        font-bold
                        text-red-600
                        mb-1
                        "
                      >

                        Keterangan Pembatalan

                      </p>

                      <p
                        className="
                        text-red-800
                        font-semibold
                        "
                      >

                        {item.alasan_pembatalan}

                      </p>

                    </div>

                  )
                }

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

                    {item.meja?.nomor_meja || "-"}

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
                              src={
                                  menu.gambar ||
                                  menu.img ||
                                  "/no-image.png"
                                }
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
                  onClick={() => handlePesanLagi(item)}
                  className="bg-[#002366] hover:bg-blue-950 text-white font-black px-8 py-4 rounded-3xl transition-all duration-300"
                >

                  Pesan Lagi

                </button>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

};

export default RiwayatPesananPembeli;