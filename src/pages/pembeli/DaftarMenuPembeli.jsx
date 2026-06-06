import {
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

import {
  toast
} from "react-hot-toast";

export default function DaftarMenuPembeli() {
  const navigate = useNavigate();

  /* =====================================================
     STATE
  ===================================================== */
  const [menu, setMenu] = useState([]);
  const [keranjang, setKeranjang] = useState([]);
  const [kiosBuka, setKiosBuka] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // State untuk melacak varian pilihan pembeli aktif per menuId: { [menuId]: 'biasa' | 'extra' }
  const [selectedVariants, setSelectedVariants] = useState({});

  const ambilStatusKios = async () => {
    try {
      const { data, error } = await supabase
        .from("pengaturan_kios")
        .select("buka")
        .eq("id", 1)
        .single();

      if (error) throw error;
      setKiosBuka(data?.buka ?? true);
    } catch (error) {
      console.log(error);
    }
  };

  /* =====================================================
     LOAD AWAL
  ===================================================== */
  useEffect(() => {
    ambilMenu();
    ambilKeranjang();
    ambilStatusKios();
  }, []);

  /* =====================================================
     REALTIME MENU & KIOS
  ===================================================== */
  useEffect(() => {
    const channel = supabase
      .channel("realtime-menu-pembeli")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu"
        },
        async () => {
          await ambilMenu();
          ambilKeranjang();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("realtime-kios")
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
      toast.error("Kios telah ditutup. Keranjang dikosongkan.");
    }
  }, [kiosBuka]);

  /* =====================================================
     EVALUASI STOK DAN RESET VARIAN ILEGAL
  ===================================================== */
  const evaluasiStokDanKeranjang = (currentMenuData, currentCart) => {
    const updatedVariants = { ...selectedVariants };
    let cartUpdated = false;
    let localCart = [...currentCart];

    currentMenuData.forEach((m) => {
      const hasExtra = Number(m.harga_extra) > 0;
      
      // 1. Sinkronisasi default varian aktif berdasarkan ketersediaan stok
      if (m.stok === 'extra_ada') {
        updatedVariants[m.id] = 'extra';
      } else if (m.stok === 'biasa_ada' || !hasExtra) {
        updatedVariants[m.id] = 'biasa';
      } else if (!updatedVariants[m.id]) {
        updatedVariants[m.id] = 'biasa';
      }

      // 2. Bersihkan item ilegal di keranjang secara otomatis jika stok berubah dari DB
      if (m.stok === 'kosong') {
        const filterCart = localCart.filter(x => x.id !== m.id);
        if (filterCart.length !== localCart.length) {
          localCart = filterCart;
          cartUpdated = true;
        }
      } else if (m.stok === 'extra_ada') {
        const filterCart = localCart.filter(x => !(x.id === m.id && x.varian === 'biasa'));
        if (filterCart.length !== localCart.length) {
          localCart = filterCart;
          cartUpdated = true;
          toast.error(`Varian Biasa untuk "${m.nama}" habis! Otomatis dikeluarkan.`);
        }
      } else if (m.stok === 'biasa_ada') {
        const filterCart = localCart.filter(x => !(x.id === m.id && x.varian === 'extra'));
        if (filterCart.length !== localCart.length) {
          localCart = filterCart;
          cartUpdated = true;
          toast.error(`Varian Extra untuk "${m.nama}" habis! Otomatis dikeluarkan.`);
        }
      }
    });

    setSelectedVariants(updatedVariants);

    if (cartUpdated) {
      localStorage.setItem("keranjang", JSON.stringify(localCart));
      setKeranjang(localCart);
    }
  };

  /* =====================================================
     AMBIL MENU
  ===================================================== */
  const ambilMenu = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .neq("stok", "nonaktif")
        .eq("is_aktif", true)
        .order("id", { ascending: true });

      if (error) throw error;
      const menuReady = data || [];

      // HITUNG TOTAL TERJUAL
      const { data: pesananData } = await supabase
        .from("pesanan")
        .select("items")
        .eq("is_checkout", true);

      const totalTerjual = {};
      (pesananData || []).forEach((pesanan) => {
        let items = [];
        try {
          items = typeof pesanan.items === "string" ? JSON.parse(pesanan.items) : pesanan.items || [];
        } catch {
          items = [];
        }
        items.forEach((item) => {
          if (!totalTerjual[item.id]) totalTerjual[item.id] = 0;
          totalTerjual[item.id] += Number(item.qty) || 0;
        });
      });

      // SORTING MENU (Kosong ke bawah, terlaris ke atas)
      const sortedMenu = [...menuReady].sort((a, b) => {
        if (a.stok === "kosong" && b.stok !== "kosong") return 1;
        if (a.stok !== "kosong" && b.stok === "kosong") return -1;
        return (totalTerjual[b.id] || 0) - (totalTerjual[a.id] || 0);
      });

      setMenu(sortedMenu);

      const currentCart = JSON.parse(localStorage.getItem("keranjang")) || [];
      evaluasiStokDanKeranjang(sortedMenu, currentCart);
      validasiKeranjang(menuReady, currentCart);

    } catch (error) {
      console.log(error);
      toast.error("Gagal mengambil menu");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     AMBIL KERANJANG
  ===================================================== */
  const ambilKeranjang = () => {
    try {
      const dataKeranjang = JSON.parse(localStorage.getItem("keranjang")) || [];
      setKeranjang(dataKeranjang);
    } catch (error) {
      console.log(error);
    }
  };

  /* =====================================================
     VALIDASI KERANJANG
  ===================================================== */
  const validasiKeranjang = (menuAktif, currentCart) => {
    try {
      const cart = currentCart || JSON.parse(localStorage.getItem("keranjang")) || [];
      const menuIds = menuAktif.map((x) => x.id);

      const removedItems = cart.filter((item) => !menuIds.includes(item.id));
      if (removedItems.length > 0) {
        removedItems.forEach((item) => {
          toast.error(`${item.nama} sudah tidak tersedia`);
        });
      }

      const updatedCart = cart.filter((item) => menuIds.includes(item.id));
      localStorage.setItem("keranjang", JSON.stringify(updatedCart));
      setKeranjang(updatedCart);
    } catch (error) {
      console.log(error);
    }
  };

  /* =====================================================
     TAMBAH PESANAN (MENDUKUNG MULTI-VARIAN)
  ===================================================== */
  const tambahPesanan = (item, varianDipilih) => {
    try {
      if (!kiosBuka) {
        toast.error("Kios sedang tutup");
        return;
      }

      const menuValid = menu.find((x) => x.id === item.id);
      if (!menuValid) {
        toast.error("Menu tidak tersedia");
        return;
      }

      const activeHarga = varianDipilih === 'extra' ? item.harga_extra : item.harga_biasa;
      const targetCartKey = `${item.id}-${varianDipilih}`;

      const keranjangLama = JSON.parse(localStorage.getItem("keranjang")) || [];
      const cek = keranjangLama.find((x) => x.cartKey === targetCartKey);
      let updatedKeranjang;

      if (cek) {
        updatedKeranjang = keranjangLama.map((x) => {
          if (x.cartKey === targetCartKey) {
            return { ...x, qty: x.qty + 1 };
          }
          return x;
        });
      } else {
        updatedKeranjang = [
          ...keranjangLama,
          {
            cartKey: targetCartKey,
            id: item.id,
            nama: item.nama,
            harga: activeHarga,
            harga_biasa: item.harga_biasa,
            harga_extra: item.harga_extra,
            varian: varianDipilih,
            gambar: item.img,
            deskripsi: item.deskripsi || "",
            qty: 1
          }
        ];
      }

      localStorage.setItem("keranjang", JSON.stringify(updatedKeranjang));
setKeranjang(updatedKeranjang);

const punyaVarianExtra =
  item.harga_extra !== null &&
  item.harga_extra !== undefined &&
  Number(item.harga_extra) > 0;

toast.success(
  punyaVarianExtra
    ? `${item.nama} (${varianDipilih}) ditambahkan`
    : `${item.nama} ditambahkan`
);

    } catch (error) {
      console.log(error);
      toast.error("Gagal tambah pesanan");
    }
  };

  /* =====================================================
     TAMBAH QTY
  ===================================================== */
  const tambahQty = (cartKey) => {
    try {
      const updated = keranjang.map((x) => {
        if (x.cartKey === cartKey) {
          return { ...x, qty: x.qty + 1 };
        }
        return x;
      });

      localStorage.setItem("keranjang", JSON.stringify(updated));
      setKeranjang(updated);
    } catch (error) {
      console.log(error);
    }
  };

  /* =====================================================
     KURANG QTY
  ===================================================== */
  const kurangQty = (cartKey) => {
    try {
      let updated = keranjang.map((x) => {
        if (x.cartKey === cartKey) {
          return { ...x, qty: x.qty - 1 };
        }
        return x;
      });

      updated = updated.filter((x) => x.qty > 0);
      localStorage.setItem("keranjang", JSON.stringify(updated));
      setKeranjang(updated);
    } catch (error) {
      console.log(error);
    }
  };

  /* =====================================================
     TOTAL ITEM
  ===================================================== */
  const totalItem = useMemo(() => {
    return keranjang.reduce((acc, item) => acc + item.qty, 0);
  }, [keranjang]);

  /* =====================================================
     LOADING STATE RENDER
  ===================================================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa]">
        <div className="w-14 h-14 rounded-full border-4 border-[#002366] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] px-4 md:px-8 py-6 pb-40">
      
      {/* TITLE */}
      <h1 className="text-4xl md:text-6xl font-black text-[#002366]">
        Daftar <span className="text-[#FF8C00]">Menu</span>
      </h1>
      <p className="text-gray-500 mt-2">Pilih menu favorit Anda</p>

      {!kiosBuka && (
        <div className="mt-6 bg-red-100 border border-red-300 text-red-700 rounded-2xl p-4 font-bold">
          Kios Mom's sedang tutup. Pemesanan sementara tidak tersedia.
        </div>
      )}

      {/* EMPTY STATE */}
      {menu.length === 0 && (
        <div className="bg-white rounded-[30px] p-12 text-center mt-8">
          <h1 className="text-3xl font-black text-gray-400">Menu belum tersedia</h1>
        </div>
      )}

      {/* LIST MENU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
        {menu.map((item) => {
          const hasExtra = Number(item.harga_extra) > 0;
          const currentVariant = selectedVariants[item.id] || 'biasa';
          const activeHarga = currentVariant === 'extra' ? item.harga_extra : item.harga_biasa;

          const targetCartKey = `${item.id}-${currentVariant}`;
          const existingItem = keranjang.find((x) => x.cartKey === targetCartKey);

          const isBiasaDisabled = item.stok === 'kosong' || item.stok === 'extra_ada';
          const isExtraDisabled = item.stok === 'kosong' || item.stok === 'biasa_ada';
          const isCardDisabled = item.stok === 'kosong';

          return (
            <div
              key={item.id}
              className={`bg-white rounded-[30px] overflow-hidden shadow-sm flex flex-col justify-between transition-all duration-300 ${
                isCardDisabled ? 'grayscale opacity-60' : ''
              }`}
            >
              {/* IMAGE */}
              <div className="relative aspect-video sm:h-[240px] w-full bg-gray-100 overflow-hidden">
                <img
                  src={item.img}
                  alt={item.nama}
                  className="w-full h-full object-cover"
                />
                {isCardDisabled && (
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center backdrop-blur-xs">
                    <span className="bg-red-600 text-white font-black uppercase px-6 py-2.5 rounded-full tracking-wide text-sm shadow-md">
                      Menu Habis
                    </span>
                  </div>
                )}
              </div>

              {/* CONTENT */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* NAMA */}
                  <h1 className="text-[26px] leading-tight font-black text-[#002366] line-clamp-2 capitalize">
                    {item.nama}
                  </h1>

                  {/* PILIHAN VARIAN */}
                  {hasExtra && !isCardDisabled && (
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mt-4 mb-1 text-[11px] font-bold">
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

                  {/* HARGA AKTIF */}
                  <h2 className={`text-[28px] font-black mt-4 transition-colors ${currentVariant === 'extra' ? 'text-red-500' : 'text-[#FF8C00]'}`}>
                    Rp {Number(activeHarga).toLocaleString("id-ID")}
                    {hasExtra && !isCardDisabled && (
                      <span className="text-xs font-bold text-gray-400 ml-1.5">({currentVariant})</span>
                    )}
                  </h2>
                </div>

                {/* ACTION BLOCK */}
                <div>
                  {isCardDisabled ? (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 py-4 rounded-[20px] font-black text-lg mt-5 cursor-not-allowed"
                    >
                      Menu Habis
                    </button>
                  ) : !existingItem ? (
                    <button
                      disabled={!kiosBuka}
                      onClick={() => tambahPesanan(item, currentVariant)}
                      className={`w-full py-4 rounded-[20px] font-black text-lg mt-5 transition-all cursor-pointer ${
                        kiosBuka
                          ? currentVariant === 'extra'
                            ? "bg-[#002366] hover:bg-blue-950 text-white"
                            : "bg-[#002366] hover:bg-blue-950 text-white"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {kiosBuka ? "Tambah Pesanan" : "Kios Tutup"}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between mt-5 bg-gray-50 p-1.5 rounded-[22px] border">
                      {/* MINUS */}
                      <button
                        onClick={() => kurangQty(targetCartKey)}
                        className="w-[52px] h-[52px] rounded-[18px] bg-[#E5E7EB] text-[#002366] hover:bg-gray-300 text-3xl font-black transition-all cursor-pointer"
                      >
                        -
                      </button>

                      {/* QUANTITY VALUE */}
                      <h1 className="text-3xl font-black text-[#002366]">
                        {existingItem.qty}
                      </h1>

                      {/* PLUS */}
                      <button
                        onClick={() => tambahQty(targetCartKey)}
                        className={`w-[52px] h-[52px] rounded-[18px] text-white text-3xl font-black transition-all cursor-pointer ${
                          currentVariant === 'extra' 
                            ? 'bg-red-500 hover:bg-red-600' 
                            : 'bg-[#002366] hover:bg-blue-950'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FLOATING CHECKOUT BUTTON */}
      {keranjang.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50">
          <button
            onClick={() => navigate("/keranjang")}
            className="bg-[#FF8C00] hover:bg-orange-600 text-white shadow-2xl rounded-[28px] px-7 py-5 flex items-center gap-4 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
              🛒
            </div>
            <div className="text-left">
              <h2 className="font-black text-xl">Pesan Sekarang</h2>
              <p className="text-sm text-white/80">
                {totalItem} menu dipilih
              </p>
            </div>
          </button>
        </div>
      )}

    </div>
  );
}