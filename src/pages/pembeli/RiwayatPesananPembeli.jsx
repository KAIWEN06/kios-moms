import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import toast from "react-hot-toast";

const RiwayatPesananPembeli = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  // =========================
  // STATE
  // =========================
  const [loading, setLoading] = useState(true);
  const [riwayat, setRiwayat] = useState([]);
  const [search, setSearch] = useState("");

  const now = new Date();
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const bulanList = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // =========================
  // FETCH DATA
  // =========================
  const fetchRiwayat = async () => {
    try {
      setLoading(true);
      let token = tokenFromUrl || localStorage.getItem("guestToken");

      if (!token) {
        setRiwayat([]);
        setLoading(false);
        return;
      }

      if (tokenFromUrl) {
        localStorage.setItem("guestToken", tokenFromUrl);
      }

      const { data: guest, error: guestError } = await supabase
        .from("guest_customer")
        .select("id")
        .eq("access_token", token)
        .single();

      if (guestError || !guest) {
        setRiwayat([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("pesanan")
        .select(`
          *,
          meja (nomor_meja)
        `)
        .eq("guest_customer_id", guest.id)
        .in("status", ["selesai", "dibatalkan"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRiwayat(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePesanLagi = (pesanan) => {
    try {
      const items = typeof pesanan.items === "string" ? JSON.parse(pesanan.items) : pesanan.items;
      const keranjangBaru = items.map((menu, index) => ({
        id: menu.id,
        nama: menu.nama,
        harga: menu.harga,
        gambar: menu.gambar || menu.img,
        qty: menu.qty,
        varian: menu.varian,
        harga_extra: menu.harga_extra,
        cartKey: `${menu.id}-${menu.varian || "biasa"}-${index}`
      }));

      localStorage.setItem("keranjang", JSON.stringify(keranjangBaru));
      toast.success("Pesanan berhasil dimuat ke keranjang");
      navigate("/keranjang");
    } catch (error) {
      console.error(error);
      toast.error("Gagal memesan ulang");
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
        { event: "*", schema: "public", table: "pesanan" },
        () => { fetchRiwayat(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =========================
  // MEMOIZED LOGIKA FILTER
  // =========================
  const availableYears = useMemo(() => {
    const years = riwayat.map((item) => new Date(item.created_at).getFullYear());
    return [...new Set([now.getFullYear(), ...years])].sort((a, b) => b - a);
  }, [riwayat]);

  const availableMonths = useMemo(() => {
    const months = riwayat
      .filter((item) => new Date(item.created_at).getFullYear() === selectedYear)
      .map((item) => new Date(item.created_at).getMonth());
    
    if (selectedYear === now.getFullYear()) {
      months.push(now.getMonth());
    }
    return [...new Set(months)].sort((a, b) => a - b);
  }, [riwayat, selectedYear]);

  const availableDays = useMemo(() => {
    const days = riwayat
      .filter((item) => {
        const date = new Date(item.created_at);
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
      })
      .map((item) => new Date(item.created_at).getDate());

    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth()) {
      days.push(now.getDate());
    }
    return [...new Set(days)].sort((a, b) => a - b);
  }, [riwayat, selectedMonth, selectedYear]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  useEffect(() => {
    if (availableDays.length > 0 && !availableDays.includes(selectedDay)) {
      setSelectedDay(availableDays[0]);
    }
  }, [availableDays, selectedDay]);

  const handleResetFilter = () => {
    const currentDate = new Date();
    setSelectedDay(currentDate.getDate());
    setSelectedMonth(currentDate.getMonth());
    setSelectedYear(currentDate.getFullYear());
  };

  const filteredRiwayat = riwayat.filter((item) => {
    if (!item.created_at) return false;
    const tanggal = new Date(item.created_at);

    const matchDate = 
      tanggal.getDate() === selectedDay &&
      tanggal.getMonth() === selectedMonth &&
      tanggal.getFullYear() === selectedYear;

    const kode = item.kode_pesanan?.toLowerCase().includes(search.toLowerCase());
    const meja = `m${item.meja?.nomor_meja || ""}`.toLowerCase().includes(search.toLowerCase());
    
    return matchDate && (kode || meja);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
        <div className="w-12 h-12 border-4 border-[#002366] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        
        {/* HEADER */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#002366] tracking-tight">
            Riwayat <span className="text-[#FF8C00]">Pesanan</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 mt-1">
            Daftar transaksi pesanan selesai dan dibatalkan.
          </p>
        </div>

        {/* CONTROLLER ACTION BAR (Satu Baris di Desktop, Stack Berurutan di HP) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 sm:mb-8">
          
          {/* FILTER PANEL KALENDER (Kiri Pada Desktop, Pertama Pada HP) */}
          <div className="w-full md:w-auto flex flex-wrap items-center gap-2 bg-white rounded-xl p-2 md:p-2.5 shadow-xs border border-gray-100">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="flex-1 md:flex-none md:w-[120px] px-3 py-2.5 rounded-lg bg-[#f1f3f5] border-none outline-none font-bold text-[#002366] text-xs md:text-sm cursor-pointer"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="flex-1 md:flex-none md:w-[150px] px-3 py-2.5 rounded-lg bg-[#f1f3f5] border-none outline-none font-bold text-[#002366] text-xs md:text-sm cursor-pointer"
            >
              {bulanList
                .map((bulan, index) => ({ bulan, index }))
                .filter((item) => availableMonths.includes(item.index))
                .map((item) => (
                  <option key={item.index} value={item.index}>{item.bulan}</option>
                ))}
            </select>

            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="flex-1 md:flex-none md:w-[120px] px-3 py-2.5 rounded-lg bg-[#f1f3f5] border-none outline-none font-bold text-[#002366] text-xs md:text-sm cursor-pointer"
            >
              {availableDays.map((day) => (
                <option key={day} value={day}>Tgl {day}</option>
              ))}
            </select>

            <button
              onClick={handleResetFilter}
              className="w-full md:w-auto px-5 py-2.5 rounded-lg bg-[#002366] text-white font-bold text-xs md:text-sm hover:bg-blue-950 transition-all cursor-pointer text-center"
            >
              Hari Ini
            </button>
          </div>

          {/* SEARCH COMPONENT (Kanan Pada Desktop, Kedua Pada HP di bawah Filter) */}
          <div className="w-full md:w-[380px] flex flex-col">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode pesanan / m12..."
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs md:text-sm outline-none focus:border-[#002366] focus:ring-1 focus:ring-[#002366] shadow-xs"
            />
            <p className="text-gray-400 text-[10px] md:text-xs mt-1.5 pl-1">
              Gunakan awalan "m" untuk mencari nomor meja (cth: m12)
            </p>
          </div>

        </div>

        {/* EMPTY STATE */}
        {filteredRiwayat.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center shadow-xs border border-gray-100">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-xl md:text-2xl font-bold text-[#002366]">Tidak Ada Riwayat</h2>
            <p className="text-xs md:text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              Tidak ditemukan aktivitas transaksi pada tanggal {selectedDay} {bulanList[selectedMonth]} {selectedYear}.
            </p>
          </div>
        )}

        {/* LIST RIWAYAT DATA */}
        <div className="space-y-5">
          {filteredRiwayat.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              
              {/* HEADER CARD */}
              <div className="bg-[#f8f9fa] border-b border-gray-100 px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] md:text-xs uppercase font-bold tracking-wider text-gray-400 block leading-none">Kode Pesanan</span>
                    <span className="text-sm md:text-base font-black text-[#002366] mt-0.5 block">{item.kode_pesanan}</span>
                  </div>
                  <span className="text-gray-300 md:text-lg">|</span>
                  <div className="text-xs md:text-sm text-gray-500 font-medium">
                    {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                <span className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold leading-none ${
                  item.status === "selesai" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {item.status === "selesai" ? "Selesai" : "Dibatalkan"}
                </span>
              </div>

              {/* CONTENT */}
              <div className="p-5 sm:p-6">
                
                {/* ALASAN PEMBATALAN */}
                {item.status === "dibatalkan" && item.alasan_pembatalan && (
                  <div className="mb-4 bg-red-50/60 border border-red-100 rounded-xl p-4 text-xs md:text-sm text-red-800">
                    <span className="font-bold block mb-1">Alasan Pembatalan:</span>
                    {item.alasan_pembatalan}
                  </div>
                )}

                {/* METADATA INFO */}
                <div className="grid grid-cols-3 gap-3 mb-4 bg-[#f8f9fa] p-4 rounded-xl border border-gray-50">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] md:text-xs text-gray-400 block uppercase font-bold tracking-wider">Meja</span>
                    <span className="text-base md:text-lg font-black text-[#002366] mt-0.5 block">{item.meja?.nomor_meja || "-"}</span>
                  </div>
                  <div className="text-center sm:text-left border-x border-gray-200/60 px-3">
                    <span className="text-[10px] md:text-xs text-gray-400 block uppercase font-bold tracking-wider">Pembayaran</span>
                    <span className="text-xs md:text-sm font-bold text-gray-700 truncate mt-0.5 block">{item.metode_pembayaran}</span>
                  </div>
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] md:text-xs text-gray-400 block uppercase font-bold tracking-wider">Total</span>
                    <span className="text-sm md:text-base font-black text-[#FF8C00] mt-0.5 block">Rp {Number(item.total_harga).toLocaleString("id-ID")}</span>
                  </div>
                </div>

                {/* ITEMS LIST */}
                <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {(Array.isArray(item.items) ? item.items : JSON.parse(item.items || "[]")).map((menu, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={menu.gambar || menu.img || "/no-image.png"}
                          alt={menu.nama}
                          className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100 border border-gray-50"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm md:text-base font-bold text-[#002366] truncate">
                            {menu.nama}
                            {Number(menu.harga_extra) > 0 && (
                              <span className="ml-1 text-[10px] md:text-xs text-[#FF8C00] font-bold">({menu.varian})</span>
                            )}
                          </h4>
                          <p className="text-[11px] md:text-xs text-gray-400 mt-1">
                            {menu.qty} x Rp {Number(menu.harga).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm md:text-base font-bold text-gray-700 flex-shrink-0">
                        Rp {(Number(menu.harga) * Number(menu.qty)).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ACTIONS */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => handlePesanLagi(item)}
                    className="w-full sm:w-auto min-w-[160px] px-6 py-3 rounded-xl bg-[#002366] hover:bg-blue-950 text-white font-bold text-xs md:text-sm transition-colors shadow-xs cursor-pointer text-center"
                  >
                    Pesan Lagi
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default RiwayatPesananPembeli;