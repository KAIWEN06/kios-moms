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

import toast from "react-hot-toast";

const KeranjangPembeli = () => {
  const navigate = useNavigate();

  /* =====================================================
     STATE
  ===================================================== */
  const [keranjang, setKeranjang] = useState([]);
  const [menuAktif, setMenuAktif] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kiosBuka, setKiosBuka] = useState(true);

  /* =====================================================
     LOAD AWAL
  ===================================================== */
  useEffect(() => {
    fetchMenu();
    fetchKeranjang();
    fetchStatusKios();
  }, []);

  /* =====================================================
     REALTIME MENU
  ===================================================== */
  useEffect(() => {
    const channel = supabase
      .channel("realtime-keranjang")
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
      supabase.removeChannel(channel);
    };
  }, []);

  /* =====================================================
     REALTIME KIOS
  ===================================================== */
  useEffect(() => {
    const channel = supabase
      .channel("realtime-kios-keranjang")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pengaturan_kios"
        },
        (payload) => {
          setKiosBuka(payload.new.buka);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!kiosBuka) {
      localStorage.removeItem("keranjang");
      setKeranjang([]);
      toast.error("Kios ditutup. Keranjang Anda dikosongkan.");
      navigate("/beranda");
    }
  }, [kiosBuka, navigate]);

  /* =====================================================
     FETCH STATUS KIOS
  ===================================================== */
  const fetchStatusKios = async () => {
    try {
      const { data, error } = await supabase
        .from("pengaturan_kios")
        .select("buka")
        .eq("id", 1)
        .single();
      if (!error && data) {
        setKiosBuka(data.buka);
      }
    } catch (e) {
      console.log(e);
    }
  };

  /* =====================================================
     FETCH MENU & VALIDASI STOK / VARIAN SECARA REALTIME
  ===================================================== */
  const fetchMenu = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .neq("stok", "nonaktif")
        .eq("is_aktif", true);

      if (error) throw error;

      const currentMenu = data || [];
      setMenuAktif(currentMenu);

      const localCart = JSON.parse(localStorage.getItem("keranjang")) || [];
      const menuIds = currentMenu.map((m) => m.id);

      let cartChanged = false;

      const validatedCart = localCart.filter((item) => {
        const dbItem = currentMenu.find((m) => m.id === item.id);

        if (!dbItem || !menuIds.includes(item.id)) {
          toast.error(`"${item.nama}" sudah tidak tersedia`);
          cartChanged = true;
          return false;
        }

        if (dbItem.stok === "kosong") {
          toast.error(`"${item.nama}" telah habis`);
          cartChanged = true;
          return false;
        }

        if (dbItem.stok === "extra_ada" && item.varian === "biasa") {
          toast.error(`Varian Biasa untuk "${item.nama}" sudah habis`);
          cartChanged = true;
          return false;
        }
        if (dbItem.stok === "biasa_ada" && item.varian === "extra") {
          toast.error(`Varian Extra untuk "${item.nama}" sudah habis`);
          cartChanged = true;
          return false;
        }

        return true;
      });

      const finalCart = validatedCart.map((item) => {
        const dbItem = currentMenu.find((m) => m.id === item.id);
        const currentHargaDb = item.varian === "extra" ? dbItem.harga_extra : dbItem.harga_biasa;
        
        if (Number(item.harga) !== Number(currentHargaDb)) {
          cartChanged = true;
          return {
            ...item,
            harga: currentHargaDb,
            harga_biasa: dbItem.harga_biasa,
            harga_extra: dbItem.harga_extra
          };
        }
        return item;
      });

      if (cartChanged) {
        localStorage.setItem("keranjang", JSON.stringify(finalCart));
        setKeranjang(finalCart);
      }
    } catch (err) {
      console.log(err);
      toast.error("Gagal sinkronisasi data menu");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     FETCH LOCAL STORAGE KERANJANG
  ===================================================== */
  const fetchKeranjang = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("keranjang")) || [];
      setKeranjang(stored);
    } catch (e) {
      console.log(e);
    }
  };

  /* =====================================================
     OPERASI KONTROL JUMLAH QUANTITY
  ===================================================== */
  const tambahQty = (cartKey) => {
    const updated = keranjang.map((item) => {
      if (item.cartKey === cartKey) {
        return { ...item, qty: item.qty + 1 };
      }
      return item;
    });
    localStorage.setItem("keranjang", JSON.stringify(updated));
    setKeranjang(updated);
  };

  const kurangQty = (cartKey) => {
    let updated = keranjang.map((item) => {
      if (item.cartKey === cartKey) {
        return { ...item, qty: item.qty - 1 };
      }
      return item;
    });

    updated = updated.filter((item) => item.qty > 0);
    localStorage.setItem("keranjang", JSON.stringify(updated));
    setKeranjang(updated);
  };

  /* PERBAIKAN LOGIKA DISINI: Menyesuaikan notifikasi hapus */
  const hapusItem = (cartKey, namaItem, varian, harga_extra) => {
    const updated = keranjang.filter((item) => item.cartKey !== cartKey);
    localStorage.setItem("keranjang", JSON.stringify(updated));
    setKeranjang(updated);
    
    if (Number(harga_extra) > 0) {
      toast.success(`"${namaItem} (${varian || "biasa"})" dihapus dari keranjang`);
    } else {
      toast.success(`"${namaItem}" dihapus dari keranjang`);
    }
  };

  /* =====================================================
     TOTAL CALCULATION (MEMOIZED)
  ===================================================== */
  const totalHarga = useMemo(() => {
    return keranjang.reduce((acc, item) => acc + Number(item.harga) * item.qty, 0);
  }, [keranjang]);

  const totalItem = useMemo(() => {
    return keranjang.reduce((acc, item) => acc + item.qty, 0);
  }, [keranjang]);

  /* =====================================================
     PROSES CHECKOUT / LANJUT
  ===================================================== */
  const handleLanjut = () => {
    if (!kiosBuka) {
      toast.error("Kios sedang tutup");
      return;
    }
    if (keranjang.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    navigate("/konfirmasi-pesanan");
  };

  if (loading && menuAktif.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <div className="w-12 h-12 rounded-full border-4 border-[#002366] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F5F7] min-h-screen w-full overflow-x-hidden pb-40">
      <div className="w-full px-4 sm:px-6 md:px-10 xl:px-16 py-6 md:py-10 max-w-[1440px] mx-auto">
        
        {/* ROW JUDUL */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-[#002366]">
              Keranjang <span className="text-[#FF8C00]">Saya</span>
            </h1>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">
              Manajemen item pesanan pilihan Anda sebelum checkout.
            </p>
          </div>
          <button
            onClick={() => navigate("/daftar-menu")}
            className="hidden sm:block font-black text-sm text-[#002366] bg-white border border-gray-200 px-5 py-3 rounded-2xl shadow-xs hover:bg-gray-50 transition-all cursor-pointer"
          >
          Tambah Menu Lain
          </button>
        </div>

        {/* CONTAINER UTAMA GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start mt-4">
          
          {/* SISI KIRI: DAFTAR ITEM PESANAN */}
          <div className="xl:col-span-2 space-y-4 w-full">
            {keranjang.length === 0 ? (
              <div className="bg-white rounded-[24px] md:rounded-[35px] p-10 md:p-16 text-center border border-dashed border-gray-300">
                <span className="text-5xl md:text-6xl block mb-4">🛒</span>
                <h3 className="text-xl md:text-2xl font-black text-[#002366]">
                  Keranjang Belanja Kosong
                </h3>
                <p className="text-gray-400 text-sm mt-1 mb-6 max-w-sm mx-auto">
                  Anda belum menambahkan menu apapun ke dalam keranjang.
                </p>
                <button
                  onClick={() => navigate("/daftar-menu")}
                  className="bg-[#002366] hover:bg-blue-950 text-white font-black px-6 py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Lihat Menu Makanan
                </button>
              </div>
            ) : (
              keranjang.map((item) => {
                return (
                  <div
                    key={item.cartKey || `${item.id}-${item.varian}`}
                    className="bg-white rounded-[24px] md:rounded-[30px] p-4 sm:p-5 flex gap-4 items-center justify-between shadow-xs w-full relative"
                  >
                    {/* GAMBAR DAN DETIL NAMA */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                        <img
                          src={item.gambar || "https://placehold.co/150"}
                          alt={item.nama}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg sm:text-xl font-black text-[#002366] line-clamp-1 capitalize">
                          {item.nama}
                        </h3>
                        
                        {/* BADGE VARIAN */}
                        {Number(item.harga_extra) > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2.5 py-0.5 text-[10px] uppercase font-black tracking-wider rounded-md ${
                              item.varian === "extra"
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : "bg-blue-50 text-[#002366] border border-blue-100"
                            }`}>
                              Varian: {item.varian || "Biasa"}
                            </span>
                          </div>
                        )}

                        <h4 className={`text-base sm:text-lg font-black mt-2 ${item.varian === "extra" ? "text-red-500" : "text-[#FF8C00]"}`}>
                          Rp {Number(item.harga).toLocaleString("id-ID")}
                        </h4>
                      </div>
                    </div>

                    {/* KONTROL QUANTITY DAN TOMBOL HAPUS */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0">
                      
                      {/* PENGATUR JUMLAH BARIS */}
                      <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-1 rounded-xl sm:rounded-2xl">
                        <button
                          onClick={() => kurangQty(item.cartKey)}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white text-[#002366] hover:bg-gray-100 font-black text-lg flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        >
                          -
                        </button>
                        <span className="text-base sm:text-lg font-black text-[#002366] min-w-[20px] text-center tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => tambahQty(item.cartKey)}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-white font-black text-lg flex items-center justify-center transition-all cursor-pointer shadow-2xs bg-[#002366] hover:bg-blue-950"
                        >
                          +
                        </button>
                      </div>

                      {/* TOMBOL SAMPAH (HAPUS) */}
                      <button
                        onClick={() => hapusItem(item.cartKey, item.nama, item.varian, item.harga_extra)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Hapus menu"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* SISI KANAN: RINGKASAN PEMBAYARAN */}
          {keranjang.length > 0 && (
            <div className="bg-white rounded-[24px] md:rounded-[35px] p-6 shadow-sm border border-gray-100 w-full space-y-5 sticky top-6">
              <h3 className="text-xl font-black text-[#002366] border-b pb-3 border-gray-100">
                Ringkasan Pesanan
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Total Kuantitas</span>
                  <span className="font-bold text-[#002366] tabular-nums">{totalItem} Item</span>
                </div>

                <div className="border-t border-dashed border-gray-100 pt-3 flex justify-between items-center">
                  <span className="text-base font-black text-[#002366]">Subtotal</span>
                  <span className="text-2xl font-black text-[#FF8C00] tabular-nums">
                    Rp {totalHarga.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <button
                disabled={!kiosBuka}
                onClick={handleLanjut}
                className={`w-full py-4 rounded-2xl font-black text-white text-base transition-all shadow-sm active:scale-95 text-center cursor-pointer block ${
                  kiosBuka ? "bg-[#FF8C00] hover:bg-orange-600" : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {kiosBuka ? "Konfirmasi Pesanan" : "Kios Sedang Tutup"}
              </button>

              <button
                onClick={() => navigate("/daftar-menu")}
                className="w-full text-center text-sm font-bold text-gray-400 hover:text-[#002366] transition-colors py-1 block cursor-pointer"
              >
                Kembali Belanja
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default KeranjangPembeli;