import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "react-hot-toast";

export default function BerandaPembeli() {
  const navigate = useNavigate();
  const [kiosBuka, setKiosBuka] = useState(true);
  const [menuTerlaris, setMenuTerlaris] = useState([]);
  
  // State untuk melacak varian yang aktif dipilih pembeli pada masing-masing item menu terlaris
  // Format: { [menuId]: 'biasa' | 'extra' }
  const [selectedVariants, setSelectedVariants] = useState({});

  const ambilStatusKios = async () => {
    const { data, error } = await supabase
      .from("pengaturan_kios")
      .select("buka")
      .eq("id", 1)
      .single();

    if (!error && data) {
      setKiosBuka(data.buka);
    }
  };

  /* ======================================================
      LOAD DATA UTAMA
  ====================================================== */
  useEffect(() => {
    getMenuTerlaris();
    ambilStatusKios();
  }, []);

  /* ======================================================
      REALTIME PESANAN (UPDATE MENU TERLARIS)
  ====================================================== */
  useEffect(() => {
    const channel = supabase
      .channel("realtime-beranda-pembeli")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pesanan"
        },
        async () => {
          await getMenuTerlaris();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ======================================================
      REALTIME STATUS KIOS
  ====================================================== */
  useEffect(() => {
    const kiosChannel = supabase
      .channel("realtime-kios-beranda")
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
      supabase.removeChannel(kiosChannel);
    };
  }, []);

  /* ======================================================
    REALTIME MENU (STOK / VARIAN)
====================================================== */
useEffect(() => {
  const menuChannel = supabase
    .channel("realtime-menu-beranda")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "menu"
      },
      async () => {
        await getMenuTerlaris();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(menuChannel);
  };
}, []);

  /* ======================================================
      GET & PROCESSING MENU TERLARIS
  ====================================================== */
  const getMenuTerlaris = async () => {
    try {
      const sekarang = new Date();
      const awalBulan = new Date(
        sekarang.getFullYear(),
        sekarang.getMonth(),
        1
      ).toISOString();
      const akhirBulan = new Date(
        sekarang.getFullYear(),
        sekarang.getMonth() + 1,
        1
      ).toISOString();

      const { data, error } = await supabase
        .from("pesanan")
        .select("items")
        .eq("status", "selesai")
        .gte("created_at", awalBulan)
        .lt("created_at", akhirBulan);

      if (error) {
        console.log(error);
        return;
      }

      let allItems = [];
      data.forEach((pesanan) => {
        let items = [];
        try {
          items = typeof pesanan.items === "string"
            ? JSON.parse(pesanan.items)
            : pesanan.items;
        } catch {
          items = [];
        }
        allItems.push(...items);
      });

      const groupedMenu = {};
      allItems.forEach((item) => {
        const nama = (item.nama || "")
        .replace(/\s*\(biasa\)|\s*\(extra\)/gi, "")
        .trim();
        if (!groupedMenu[nama]) {
            groupedMenu[nama] = {
              ...item,
              nama,
              totalQty: Number(item.qty) || 0,
            };
        } else {
          groupedMenu[nama].totalQty += Number(item.qty) || 0;
        }
      });

      const sortedMenu = Object.values(groupedMenu)
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 4);

      const { data: menuData, error: menuError } = await supabase
        .from("menu")
        .select("*");

      if (menuError) {
        console.log(menuError);
        return;
      }

      const initialVariants = {};

      const finalMenu = sortedMenu.map((item) => {
        const menuAktif = menuData.find((m) => m.id === item.id);
        const currentStok = menuAktif?.stok || "kosong";
        const hasExtra = Number(menuAktif?.harga_extra) > 0;

        // Tentukan inisialisasi default varian berdasarkan kondisi stok (Sinkronisasi BuatPesananAdmin)
        if (currentStok === 'extra_ada') {
          initialVariants[item.id] = 'extra';
        } else {
          initialVariants[item.id] = 'biasa';
        }

        return {
          ...item,
          harga_biasa: menuAktif?.harga_biasa || menuAktif?.harga || item.harga,
          harga_extra: menuAktif?.harga_extra || 0,
          stok: currentStok
        };
      });

setSelectedVariants(prev => {
  const updated = { ...prev };

  finalMenu.forEach(item => {
    const current = updated[item.id];

    if (!current) {
      updated[item.id] =
        item.stok === "extra_ada"
          ? "extra"
          : "biasa";
      return;
    }

    if (
      current === "extra" &&
      item.stok === "biasa_ada"
    ) {
      updated[item.id] = "biasa";
    }

    if (
      current === "biasa" &&
      item.stok === "extra_ada"
    ) {
      updated[item.id] = "extra";
    }

    if (item.stok === "kosong") {
      updated[item.id] = "biasa";
    }
  });

  return updated;
});

setMenuTerlaris(finalMenu);
      


    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="bg-[#F4F5F7] min-h-screen w-full overflow-x-hidden">
      {/* CONTAINER UTAMA */}
      <div className="w-full px-4 sm:px-6 md:px-10 xl:px-16 py-6 md:py-10 max-w-[1440px] mx-auto">
        
        {/* HERO SECTION */}
        <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 sm:p-8 md:p-12 shadow-sm w-full">
          <div className="max-w-[900px]">
            <h3 className="text-[#FF8C00] font-black uppercase text-sm md:text-lg tracking-wider">
              Selamat Datang
            </h3>

            <h1 className="text-[38px] sm:text-[55px] md:text-[80px] xl:text-[90px] leading-[1.1] font-black text-[#002366] mt-3 md:mt-5 break-words">
              Pemesanan
              <br />
              Makanan
              <span className="text-[#FF8C00]"> Online</span>
            </h1>

            <p className="text-gray-500 text-base sm:text-lg md:text-2xl mt-4 md:mt-8 max-w-[700px] leading-relaxed">
              Pesan makanan favorit Anda dengan cepat, mudah, dan praktis langsung dari meja Anda.
            </p>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-4 mt-6 md:mt-10">
              <button
                disabled={!kiosBuka}
                onClick={() => {
                  if (!kiosBuka) {
                    toast.error("Kios sedang tutup");
                    return;
                  }
                  navigate("/daftar-menu");
                }}
                className={`w-full sm:w-auto text-center bg-[#FF8C00] text-white px-8 md:px-10 py-4 md:py-5 rounded-[16px] md:rounded-[22px] font-black text-base md:text-lg transition-all shadow-md active:scale-95 ${
                  kiosBuka
                    ? "hover:bg-orange-600 cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                {kiosBuka ? "Pesan Sekarang" : "Kios Tutup"}
              </button>

              <button
                onClick={() => navigate("/status-pesanan")}
                className="w-full sm:w-auto text-center bg-[#002366] hover:bg-blue-950 text-white px-8 md:px-10 py-4 md:py-5 rounded-[16px] md:rounded-[22px] font-black text-base md:text-lg transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Cek Pesanan
              </button>
            </div>
          </div>
        </div>

        {/* SECTION MENU TERLARIS */}
        <div className="mt-12 md:mt-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-black text-[#002366]">
            Menu Terlaris
          </h2>
          <p className="text-gray-500 text-sm sm:text-base md:text-lg mt-2">
            Menu paling sering dipesan pelanggan bulan ini.
          </p>

          {/* DYNAMIC RENDERING (GRID ATAU EMPTY STATE) */}
          {menuTerlaris.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8 md:mt-10">
              {menuTerlaris.map((item, index) => {
                const hasExtra = Number(item.harga_extra) > 0;
                const currentVariant = selectedVariants[item.id] || 'biasa';
                const activeHarga = currentVariant === 'extra' ? item.harga_extra : item.harga_biasa;

                const isBiasaDisabled = item.stok === 'kosong' || item.stok === 'extra_ada';
                const isExtraDisabled = item.stok === 'kosong' || item.stok === 'biasa_ada';
                const isCardDisabled = item.stok === 'kosong';

                return (
                  <div
                    key={index}
                    className={`bg-white rounded-[24px] md:rounded-[30px] overflow-hidden shadow-sm w-full relative flex flex-col justify-between transition-all duration-300 ${
                      isCardDisabled ? 'grayscale opacity-60' : ''
                    }`}
                  >
                    {/* BADGE RANKING */}
                    <div className="absolute top-4 left-4 bg-[#FF8C00] text-white px-3.5 py-1.5 rounded-xl font-black text-xs md:text-sm z-10 shadow-sm">
                      #{index + 1}
                    </div>

                    {/* GAMBAR MENU */}
                    <div className="w-full h-[220px] md:h-[260px] overflow-hidden bg-gray-100 relative">
                      <img
                        src={item.gambar || item.img || "https://placehold.co/600x400?text=No+Image"}
                        alt={item.nama}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      {isCardDisabled && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                          <span className="text-white font-black text-xl italic -rotate-12 uppercase tracking-tighter">
                            Habis
                          </span>
                        </div>
                      )}
                    </div>

                    {/* KONTEN KARTU */}
                    <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h1 className="text-xl md:text-2xl font-black text-[#002366] line-clamp-2 min-h-[3.5rem] leading-tight">
                          {item.nama}
                        </h1>

                        <p className="text-gray-500 mt-1.5 text-sm md:text-base">
                          Dipesan <span className="text-[#FF8C00] font-black">{item.totalQty}x</span>
                        </p>
                      </div>

                      <div>
                        {/* PILIHAN VARIAN HARGA (KONDISIONAL SEPERTI DI BUATPESANANADMIN) */}
                        {hasExtra && !isCardDisabled && (
                          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mt-4 mb-2 text-[11px] font-bold">
                            <button
                              type="button"
                              disabled={isBiasaDisabled}
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [item.id]: 'biasa' }))}
                              className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                                currentVariant === 'biasa'
                                  ? 'bg-[#002366] text-white shadow-xs font-black'
                                  : isBiasaDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              Biasa {item.stok === 'extra_ada' && '(Habis)'}
                            </button>
                            <button
                              type="button"
                              disabled={isExtraDisabled}
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [item.id]: 'extra' }))}
                              className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                                currentVariant === 'extra'
                                  ? 'bg-red-500 text-white shadow-xs font-black'
                                  : isExtraDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              Extra {item.stok === 'biasa_ada' && '(Habis)'}
                            </button>
                          </div>
                        )}

                        {/* DISPLAY HARGA AKTIF */}
                        <h2 className={`text-2xl md:text-3xl font-black mt-3 whitespace-nowrap ${currentVariant === 'extra' ? 'text-red-500' : 'text-[#FF8C00]'}`}>
                          Rp {Number(activeHarga).toLocaleString("id-ID")}
                          {hasExtra && !isCardDisabled && (
                            <span className="text-xs font-normal text-gray-400 ml-1.5">({currentVariant})</span>
                          )}
                        </h2>

                        {/* TOMBOL PESAN */}
                        <button
                          disabled={!kiosBuka || isCardDisabled}
                          onClick={() => {
                            try {
                              if (!kiosBuka) {
                                toast.error("Kios sedang tutup");
                                return;
                              }

                              if (item.stok === "kosong") {
                                toast.error(`${item.nama} sedang habis`);
                                navigate("/daftar-menu");
                                return;
                              }

                              // Ambil varian aktif untuk dimasukkan ke keranjang dengan format unik (id-varian) jika memakai multi-varian
                              const finalCartKey = hasExtra ? `${item.id}-${currentVariant}` : `${item.id}-biasa`;

                              const keranjangLama = JSON.parse(localStorage.getItem("keranjang")) || [];
                              
                              // Menyesuaikan identifikasi pencarian keranjang agar mendukung pemisahan varian biasa/extra
                              const existingItem = keranjangLama.find((x) => x.cartKey === finalCartKey || (x.id === item.id && x.varian === currentVariant));
                              let updatedKeranjang;

                              if (existingItem) {
                                updatedKeranjang = keranjangLama.map((x) => {
                                  if (x.cartKey === finalCartKey || (x.id === item.id && x.varian === currentVariant)) {
                                    return { ...x, qty: x.qty + 1 };
                                  }
                                  return x;
                                });
                              } else {
                                updatedKeranjang = [
                                  ...keranjangLama,
                                  {
                                    cartKey: finalCartKey,
                                    id: item.id,
                                    nama: item.nama,
                                    harga: activeHarga,
                                    harga_biasa: item.harga_biasa,
                                    harga_extra: item.harga_extra,
                                    varian: hasExtra ? currentVariant : 'biasa',
                                    gambar: item.gambar || item.img,
                                    deskripsi: item.deskripsi || "",
                                    qty: 1
                                  }
                                ];
                              }

                              localStorage.setItem("keranjang", JSON.stringify(updatedKeranjang));
                              toast.success(`${item.nama} (${hasExtra ? currentVariant : 'Biasa'}) ditambahkan`);
                              navigate("/daftar-menu");
                            } catch (error) {
                              console.log(error);
                              toast.error("Gagal menambahkan menu");
                            }
                          }}
                          className={`w-full text-white py-3.5 rounded-[16px] md:rounded-[20px] font-black text-base md:text-lg mt-5 transition-all shadow-sm active:scale-95 ${
                            kiosBuka && !isCardDisabled
                              ? currentVariant === 'extra'
                                ? "bg-red-500 hover:bg-red-600 cursor-pointer"
                                : "bg-[#002366] hover:bg-blue-950 cursor-pointer"
                              : "bg-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {isCardDisabled ? "Habis" : kiosBuka ? "Pesan" : "Kios Tutup"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TAMPILAN JIKA BELUM ADA DATA PESANAN (EMPTY STATE) */
            <div className="bg-white rounded-[24px] md:rounded-[30px] p-8 md:p-12 shadow-sm text-center mt-8 md:mt-10 max-w-2xl mx-auto border border-dashed border-gray-300">
              <div className="text-5xl md:text-6xl mb-4 animate-bounce">🍽️</div>
              <h3 className="text-xl md:text-2xl font-black text-[#002366]">
                Belum Ada Data Pesanan Bulan Ini
              </h3>
              <p className="text-gray-500 mt-2 text-sm md:text-base leading-relaxed">
                Perhitungan menu terlaris akan otomatis terisi dan diperbarui setelah terdapat transaksi berhasil pada bulan baru ini.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}