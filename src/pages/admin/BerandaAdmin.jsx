import React, {
  useEffect,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabaseClient";
import toast from "react-hot-toast";

const BerandaPembeli = () => {

  const [kiosBuka, setKiosBuka] =
  useState(true);

  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================

  const [menuTerlaris, setMenuTerlaris] =
    useState([]);

  const [heroImage, setHeroImage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const fetchStatusKios =
  async () => {

    const { data, error } =
      await supabase
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

  const toggleStatusKios = async () => {

  try {

    console.log(
      "Status lama:",
      kiosBuka
    );

    const { data, error } =
      await supabase
        .from("pengaturan_kios")
        .update({
          buka: !kiosBuka
        })
        .eq("id", 1)
        .select();

    console.log(
      "Hasil update:",
      data
    );

    if (error) {
      console.error(error);
      toast.error(error.message);
      return;
    }

    // =========================
// JIKA KIOS DITUTUP
// =========================

if (kiosBuka) {

  const {
    data: pesananBatal,
    error: pesananError
  } = await supabase
    .from("pesanan")
    .select("id, meja_id")
    .eq(
      "status",
      "menunggu_pembayaran"
    );

  if (pesananError) {

    console.log(
      pesananError
    );

  } else {

    // BATALKAN PESANAN

    await supabase
      .from("pesanan")
      .update({

        status:
          "dibatalkan",

        alasan_pembatalan:
          "Kios ditutup",

        dibatalkan_pada:
          new Date()

      })
      .eq(
        "status",
        "menunggu_pembayaran"
      );

    // KEMBALIKAN STATUS MEJA

    const mejaIds =
      [
        ...new Set(
          (pesananBatal || [])
            .map(
              (item) =>
                item.meja_id
            )
            .filter(Boolean)
        )
      ];

    if (
      mejaIds.length > 0
    ) {

      await supabase
        .from("meja")
        .update({
          status:
            "tersedia"
        })
        .in(
          "id",
          mejaIds
        );

    }

  }

}

    setKiosBuka(!kiosBuka);

    toast.success(
      !kiosBuka
        ? "Kios berhasil dibuka"
        : "Kios berhasil ditutup"
    );

  } catch (error) {

    console.error(error);

    toast.error(
      "Gagal mengubah status kios"
    );

  }

};
  // =========================
  // FETCH HERO IMAGE
  // =========================

  const fetchHeroImage =
    async () => {

      try {

        const {
          data,
          error
        } = await supabase
          .from("menu")
          .select("*")
          .ilike(
            "nama",
            "%ayam goreng%"
          )
          .single();

        if (error) throw error;

        if (data) {

          setHeroImage(
            data.img
          );

        }

      } catch (error) {

        console.log(error);

      }

    };

// =========================
// FETCH MENU TERLARIS BULAN INI
// =========================

const fetchMenuTerlaris = async () => {
  try {
    setLoading(true);

    const sekarang = new Date();
    const awalBulan = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1).toISOString();
    const akhirBulan = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 1).toISOString();

    // 1. Ambil data pesanan selesai bulan ini
    const { data: dataPesanan, error: errorPesanan } = await supabase
      .from("pesanan")
      .select("*")
      .eq("status", "selesai")
      .gte("created_at", awalBulan)
      .lt("created_at", akhirBulan);

    if (errorPesanan) throw errorPesanan;

    // 2. Ambil data menu terbaru dari master tabel menu (ambil harga_biasa dan harga_extra)
    const { data: dataMasterMenu, error: errorMenu } = await supabase
      .from("menu")
      .select("nama, harga_biasa, harga_extra");

    if (errorMenu) throw errorMenu;

    // Buat map untuk mempermudah pencarian harga berdasarkan nama menu
    const hargaMenuMap = {};
    dataMasterMenu.forEach((m) => {
      hargaMenuMap[m.nama] = {
        harga_biasa: m.harga_biasa,
        harga_extra: m.harga_extra
      };
    });

    let countMenu = {};

    dataPesanan.forEach((pesanan) => {
      let items = Array.isArray(pesanan.items)
        ? pesanan.items
        : JSON.parse(pesanan.items || "[]");

      items.forEach((item) => {
        // Cek apakah item ini varian extra (sesuaikan indikatornya: item.varian, item.tipe, atau item.is_extra)
        const isExtra = 
          item.varian?.toLowerCase().includes("extra") || 
          item.keterangan?.toLowerCase().includes("extra") ||
          item.is_extra === true;

        // Tentukan harga master yang cocok, jika tidak ada di master baru pakai harga dari riwayat transaksi
        let hargaFinal = item.harga;
        if (hargaMenuMap[item.nama] !== undefined) {
          hargaFinal = isExtra && hargaMenuMap[item.nama].harga_extra > 0
            ? hargaMenuMap[item.nama].harga_extra
            : hargaMenuMap[item.nama].harga_biasa;
        }

        const keyPencarian = (item.nama || "")
        .replace(/\s*\(biasa\)|\s*\(extra\)/gi, "")
        .trim();

        if (countMenu[keyPencarian]) {
          countMenu[keyPencarian].qty += Number(item.qty || 0);
        } else {
          countMenu[keyPencarian] = {
            ...item,
            img: item.gambar || item.img || "",
            nama: keyPencarian,
            qty: Number(item.qty || 0),
            harga_tampil: hargaFinal,
            punya_harga_extra: hargaMenuMap[item.nama]?.harga_extra > 0,
            harga_extra_master: hargaMenuMap[item.nama]?.harga_extra || 0,
            harga_biasa_master: hargaMenuMap[item.nama]?.harga_biasa || 0
          };
        }
      });
    });

    const sortedMenu = Object.values(countMenu).sort((a, b) => b.qty - a.qty);

    setMenuTerlaris(sortedMenu.slice(0, 3));
  } catch (error) {
    console.log("Error menu terlaris:", error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {

  const channel = supabase
    .channel("menu-terlaris-admin")

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pesanan",
      },
      async () => {

        await fetchMenuTerlaris();

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
  // USE EFFECT
  // =========================

  useEffect(() => {

    fetchHeroImage();

    fetchMenuTerlaris();

    fetchStatusKios();

  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-orange-500 selection:text-white">

      {/* ========================= */}
      {/* HERO SECTION */}
      {/* ========================= */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:py-20 lg:py-24">
        {/* Dekorasi Background Minimalis */}
        <div className="absolute top-0 right-0 -z-10 w-72 h-72 bg-orange-100 rounded-full blur-3xl opacity-60 pointer-events-none transform translate-x-1/3 -translate-y-1/4 md:w-96 md:h-96" />
        <div className="absolute bottom-0 left-0 -z-10 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-80 pointer-events-none transform -translate-x-1/4 translate-y-1/4" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            
            {/* TEXT & ACTION CONTENT (KIRI) */}
            <div className="lg:col-span-7 order-2 lg:order-1 text-center lg:text-left">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-bold tracking-wider text-[#FF8C00] bg-orange-50 uppercase mb-4 sm:mb-6 shadow-sm border border-orange-100">
                Selamat Datang Admin
              </span>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#002366] leading-[1.15]">
                Sistem Pemesanan
                <br />
                Makanan <span className="text-[#FF8C00] relative inline-block">Online<span className="absolute left-0 bottom-1 w-full h-1 sm:h-2 bg-orange-200 -z-10 rounded" /></span>
              </h1>

              <p className="text-slate-500 text-sm sm:text-base lg:text-lg leading-relaxed mt-4 sm:mt-6 max-w-xl mx-auto lg:mx-0">
                Kelola status operasional kios, buat pesanan manual untuk pelanggan, 
                serta pantau daftar menu terlaris secara real-time dari satu dashboard modern.
              </p>

              {/* KIOS STATUS BADGE & BUTTONS AREA */}
              <div className="mt-8 p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-sm max-w-xl mx-auto lg:mx-0 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`relative flex h-3.5 w-3.5`}>
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${kiosBuka ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${kiosBuka ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    </span>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status Kios Saat Ini</p>
                      <p className={`text-sm font-extrabold tracking-wide ${kiosBuka ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {kiosBuka ? "KIOS SEDANG BUKA" : "KIOS SEDANG TUTUP"}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={toggleStatusKios}
                    type="button"
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-300 min-h-[44px] flex items-center justify-center shadow-sm active:scale-95 ${
                      kiosBuka
                        ? "bg-rose-600 hover:bg-rose-700 shadow-rose-100"
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                    }`}
                  >
                    {kiosBuka ? "Tutup Kios Sekarang" : "Buka Kios Sekarang"}
                  </button>
                </div>
              </div>

              {/* MAIN NAVIGATION BUTTONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 max-w-xl mx-auto lg:mx-0">
                <button
                  onClick={() => navigate("/admin/buat-pesanan")}
                  type="button"
                  className="w-full bg-[#FF8C00] hover:bg-orange-600 text-white px-6 py-3.5 rounded-xl font-bold text-base transition-all duration-300 hover:shadow-lg hover:shadow-orange-100 active:scale-98 min-h-[48px] flex items-center justify-center"
                >
                  Buat Pesanan Baru
                </button>

                <button
                  onClick={() => navigate("/admin/proses-pesanan")}
                  type="button"
                  className="w-full bg-white hover:bg-slate-50 text-[#002366] border border-slate-200 px-6 py-3.5 rounded-xl font-bold text-base transition-all duration-300 hover:shadow-sm active:scale-98 min-h-[48px] flex items-center justify-center"
                >
                  Cek Semua Pesanan
                </button>
              </div>
            </div>

            {/* IMAGE BANNER (KANAN) */}
            <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center w-full px-4 sm:px-0">
              <div className="relative w-full max-w-[340px] sm:max-w-[420px] lg:max-w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/4.5]">
                {/* Efek Border Estetik Belakang */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#FF8C00] to-orange-400 rounded-3xl sm:rounded-[40px] transform rotate-3 scale-[1.02] opacity-95 shadow-xl" />
                
                {/* Gambar Hero Utama */}
                <img
                  src={
                    heroImage ||
                    "https://images.unsplash.com/photo-1504674900247-0877df9cc836"
                  }
                  alt="Hero Pemesanan"
                  className="relative w-full h-full object-cover rounded-3xl sm:rounded-[40px] shadow-md border border-white/10"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================= */}
      {/* MENU TERLARIS SECTION */}
      {/* ========================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        
        {/* SECTION TITLE */}
        <div className="mb-8 sm:mb-12 text-center sm:text-left">
          <span className="text-xs sm:text-sm font-extrabold tracking-widest text-[#FF8C00] bg-orange-50 px-3 py-1 rounded-md uppercase">
            Paling Favorit
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-[#002366] mt-3">
            Menu Terlaris Bulan Ini
          </h2>
          <p className="text-slate-400 mt-2 text-xs sm:text-sm max-w-md">
            Daftar produk makanan atau minuman yang paling diminati oleh pelanggan saat ini.
          </p>
        </div>

        {/* LOADING ANIMATION */}
        {loading && (
          <div className="flex justify-center items-center py-16 sm:py-24">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-slate-200 border-t-[#002366] rounded-full animate-spin"></div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && menuTerlaris.length === 0 && (
          <div className="bg-white rounded-2xl p-8 sm:p-16 text-center shadow-sm border border-slate-100 max-w-xl mx-auto">
            <div className="text-5xl sm:text-6xl mb-4 sm:mb-5 animate-bounce duration-1000">🍽️</div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#002366]">
              Belum Ada Data Pesanan
            </h3>
            <p className="text-slate-400 mt-2 text-xs sm:text-sm max-w-xs mx-auto">
              Perhitungan menu terlaris akan otomatis terisi dan diperbarui setelah terdapat transaksi berhasil pada bulan baru ini.
            </p>
          </div>
        )}

        {/* LIST / GRID DATA */}
        {!loading && menuTerlaris.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {menuTerlaris.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100/80 transition-all duration-300 group flex flex-col h-full"
              >
                {/* Bagian Gambar Produk */}
                <div className="relative overflow-hidden aspect-video sm:aspect-[4/3] w-full bg-slate-100">
                  <img
                    src={item.img}
                    alt={item.nama}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                    loading="lazy"
                  />
                  
                  {/* Badge Peringkat */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#002366] px-3.5 py-1.5 rounded-xl font-extrabold text-xs shadow-md border border-slate-100 flex items-center gap-1">
                    <span className="text-[#FF8C00]">#{index + 1}</span> Terlaris
                  </div>
                </div>

                {/* Bagian Konten/Keterangan */}
                <div className="p-5 sm:p-6 flex flex-col flex-grow justify-between">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#002366] tracking-tight group-hover:text-[#FF8C00] transition-colors duration-200 line-clamp-1">
                      {item.nama}
                    </h3>
                    
                    <p className="text-slate-400 mt-2 text-xs sm:text-sm">
                      Telah dipesan sebanyak{" "}
                      <span className="font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-sm">
                        {item.qty}x
                      </span>
                    </p>
                  </div>
                {/* Bagian Harga */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Harga Menu
                  </span>
                  
                  <div className="flex flex-col gap-1.5 min-w-[140px]">
                    {item.punya_harga_extra ? (
                      <>
                        {/* Baris Biasa */}
                        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-600">
                          <span className="w-14 text-center bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-tight shrink-0">
                            Biasa
                          </span>
                          <span className="tabular-nums text-right w-full text-lg">
                            Rp {Number(item.harga_biasa_master).toLocaleString("id-ID")}
                          </span>
                        </div>

                        {/* Baris Extra */}
                        <div className="flex items-center justify-between gap-3 text-sm font-black text-[#FF8C00]">
                          <span className="w-14 text-center bg-orange-50 text-[#FF8C00] px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-tight shrink-0">
                            Extra
                          </span>
                          <span className="tabular-nums text-right w-full text-lg">
                            Rp {Number(item.harga_extra_master).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-[#FF8C00] text-lg font-black tracking-tight text-right">
                        Rp {Number(item.harga_tampil || 0).toLocaleString("id-ID")}
                      </span>
                    )}
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>
    </div>
  );
};

export default BerandaPembeli;