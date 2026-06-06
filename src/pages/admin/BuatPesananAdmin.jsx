import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../../lib/supabaseClient";
import toast from 'react-hot-toast';

const AdminBuatPesanan = ({ cart = {}, updateQty }) => {
  const navigate = useNavigate();

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Format: { [menuId]: 'biasa' | 'extra' }
  const [selectedVariants, setSelectedVariants] = useState({});

  // Gunakan ref untuk menyimpan data cart terbaru agar useEffect sinkronisasi tidak menyebabkan infinite loop
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // TOTAL ITEM
  const totalItem = Object.values(cart).reduce((a, b) => a + b, 0);

  // FETCH MENU
  const fetchMenu = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('menu')
        .select('*')
        .neq('stok', 'nonaktif');

      if (error) throw error;

      /* ======================================================
         AMBIL TOTAL PENJUALAN
      ====================================================== */
      const { data: pesananData } = await supabase
        .from("pesanan")
        .select("items")
        .eq("status", "selesai");

      const totalTerjual = {};
      (pesananData || []).forEach((pesanan) => {
        let items = [];
        try {
          items = typeof pesanan.items === "string" ? JSON.parse(pesanan.items) : pesanan.items || [];
        } catch {
          items = [];
        }

        items.forEach((item) => {
          const menuId = item.id;
          if (menuId) {
            if (!totalTerjual[menuId]) totalTerjual[menuId] = 0;
            totalTerjual[menuId] += Number(item.qty) || 0;
          }
        });
      });

      /* ======================================================
         SORT MENU (Kosong di bawah, Terlaris di atas)
      ====================================================== */
      const sortedMenu = [...(data || [])].sort((a, b) => {
        if (a.stok === "kosong" && b.stok !== "kosong") return 1;
        if (a.stok !== "kosong" && b.stok === "kosong") return -1;
        return (totalTerjual[b.id] || 0) - (totalTerjual[a.id] || 0);
      });

      // Jalankan fungsi evaluasi stok & reset item ilegal di keranjang
      evaluasiStokDanKeranjang(sortedMenu);
      setMenu(sortedMenu);
    } catch (error) {
      console.error('Error fetching menu:', error.message);
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     FUNGSI OTOMATIS: EVALUASI STOK & BERSIHKAN KERANJANG
  ====================================================== */
  const evaluasiStokDanKeranjang = (currentMenuData) => {
    const updatedVariants = { ...selectedVariants };

    currentMenuData.forEach((m) => {
      const hasExtra = Number(m.harga_extra) > 0;
      
      // 1. Tentukan default atau paksa pindah varian aktif jika yang dipilih ternyata habis
      if (m.stok === 'extra_ada') {
        updatedVariants[m.id] = 'extra';
      } else if (m.stok === 'biasa_ada' || !hasExtra) {
        updatedVariants[m.id] = 'biasa';
      } else if (!updatedVariants[m.id]) {
        updatedVariants[m.id] = 'biasa';
      }

      // 2. Cek isi keranjang saat ini untuk menu terkait
      const keyBiasa = `${m.id}-biasa`;
      const keyExtra = `${m.id}-extra`;

      // Jika status 'kosong' (Semua varian habis), hapus biasa maupun extra dari keranjang
      if (m.stok === 'kosong') {
        if (cartRef.current[keyBiasa] > 0) updateQty(keyBiasa, -cartRef.current[keyBiasa]);
        if (cartRef.current[keyExtra] > 0) updateQty(keyExtra, -cartRef.current[keyExtra]);
      } 
      // Jika hanya varian ekstra yang ada, tendang varian biasa dari keranjang
      else if (m.stok === 'extra_ada') {
        if (cartRef.current[keyBiasa] > 0) {
          updateQty(keyBiasa, -cartRef.current[keyBiasa]);
          toast.error(`Varian Biasa untuk "${m.nama}" habis! Otomatis dikeluarkan.`);
        }
      } 
      // Jika hanya varian biasa yang ada, tendang varian extra dari keranjang
      else if (m.stok === 'biasa_ada') {
        if (cartRef.current[keyExtra] > 0) {
          updateQty(keyExtra, -cartRef.current[keyExtra]);
          toast.error(`Varian Extra untuk "${m.nama}" habis! Otomatis dikeluarkan.`);
        }
      }
    });

    setSelectedVariants(updatedVariants);
  };

  // Real-time listener: Sinkronisasi jika ada perubahan data stok di database utama
  useEffect(() => {
    fetchMenu();

    const channel = supabase
      .channel("realtime-stok-buat-pesanan")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu" }, () => {
        fetchMenu();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#002366]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 bg-[#f0f2f5] min-h-screen relative pb-32">
      {/* TITLE */}
      <h2 className="text-center text-3xl font-black mb-10 text-[#002366]">
        Katalog <span className="text-[#FF8C00]">Kios Mom's</span>
      </h2>

      {/* GRID MENU */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 w-full">
        {menu.map((m) => {
          const hasExtra = Number(m.harga_extra) > 0;
          const currentVariant = selectedVariants[m.id] || 'biasa';
          const activeHarga = currentVariant === 'extra' ? m.harga_extra : m.harga_biasa;
          
          const cartKey = `${m.id}-${currentVariant}`;
          const currentQty = cart[cartKey] || 0;

          const isBiasaDisabled = m.stok === 'kosong' || m.stok === 'extra_ada';
          const isExtraDisabled = m.stok === 'kosong' || m.stok === 'biasa_ada';
          const isCardDisabled = m.stok === 'kosong';

          return (
            <div
              key={m.id}
              className={`bg-white rounded-3xl shadow-sm border overflow-hidden flex flex-col transition-all duration-300 ${
                isCardDisabled ? 'grayscale opacity-60' : 'hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              {/* IMAGE */}
              <div className="aspect-square w-full overflow-hidden relative bg-gray-100">
                <img
                  src={m.img}
                  alt={m.nama}
                  className="w-full h-full object-cover"
                />
                {isCardDisabled && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white font-black text-xl italic -rotate-12 uppercase tracking-tighter">
                      Habis
                    </span>
                  </div>
                )}
              </div>

              {/* CONTENT */}
              <div className="p-4 flex flex-col flex-grow justify-between">
                <div>
                  {/* NAMA MENU */}
                  <h4 className="font-black text-gray-800 text-sm leading-tight mb-2 line-clamp-2 capitalize">
                    {m.nama}
                  </h4>

                  {/* PILIHAN VARIAN */}
                  {hasExtra && (
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-3 text-[11px] font-bold">
                      <button
                        type="button"
                        disabled={isBiasaDisabled}
                        onClick={() => setSelectedVariants(prev => ({ ...prev, [m.id]: 'biasa' }))}
                        className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                          currentVariant === 'biasa'
                            ? 'bg-[#002366] text-white shadow-xs'
                            : isBiasaDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        Biasa ({m.stok === 'extra_ada' ? 'Habis' : 'Tersedia'})
                      </button>
                      <button
                        type="button"
                        disabled={isExtraDisabled}
                        onClick={() => setSelectedVariants(prev => ({ ...prev, [m.id]: 'extra' }))}
                        className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                          currentVariant === 'extra'
                            ? 'bg-red-500 text-white shadow-xs'
                            : isExtraDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        Extra ({m.stok === 'biasa_ada' ? 'Habis' : 'Tersedia'})
                      </button>
                    </div>
                  )}

                  {/* DISPLAY HARGA AKTIF */}
                  <p className={`${currentVariant === 'extra' ? 'text-red-500' : 'text-[#FF8C00]'} font-black text-base`}>
                    Rp {Number(activeHarga).toLocaleString()}
                    {hasExtra && <span className="text-[10px] text-gray-400 font-normal ml-1">({currentVariant})</span>}
                  </p>
                </div>

                {/* CONTROLLER QUANTITY */}
                <div className="flex items-center justify-between mt-4 bg-gray-50 rounded-2xl p-2 border">
                  {/* BUTTON MINUS */}
                  <button
                    type="button"
                    onClick={() => {
                      if (currentQty > 0) {
                        updateQty(cartKey, -1);
                      }
                    }}
                    disabled={currentQty === 0}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl font-black text-sm transition-all ${
                      currentQty === 0 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-white shadow-sm text-[#002366] hover:bg-gray-100'
                    }`}
                  >
                    -
                  </button>

                  {/* QUANTITY VALUE */}
                  <span className="text-sm font-black text-[#002366]">
                    {currentQty}
                  </span>

                  {/* BUTTON PLUS */}
                  <button
                    type="button"
                    onClick={() => {
                      const isCurrentDisabled = currentVariant === 'extra' ? isExtraDisabled : isBiasaDisabled;
                      if (!isCurrentDisabled) {
                        updateQty(cartKey, 1);
                      }
                    }}
                    disabled={currentVariant === 'extra' ? isExtraDisabled : isBiasaDisabled}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl shadow-sm text-white transition-all font-black ${
                      (currentVariant === 'extra' ? isExtraDisabled : isBiasaDisabled)
                        ? 'bg-gray-300 cursor-not-allowed'
                        : currentVariant === 'extra' 
                          ? 'bg-red-500 hover:bg-red-600 hover:scale-105' 
                          : 'bg-[#002366] hover:bg-blue-900 hover:scale-105'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FLOAT CHECKOUT BUTTON */}
      {totalItem > 0 && (
        <div className="fixed bottom-10 right-6 z-50">
          <button
            onClick={() => {
              if (totalItem <= 0) {
                toast.error("Pilih menu terlebih dahulu");
                return;
              }
              navigate('/admin/pesanan');
            }}
            className="bg-[#FF8C00] text-white flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] font-bold opacity-80 uppercase">Selesai Pilih</span>
              <span className="text-lg font-black">{totalItem} Produk</span>
            </div>
            <span className="text-xl">→</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminBuatPesanan;