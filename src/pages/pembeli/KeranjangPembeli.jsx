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

  const fetchStatusKios = async () => {
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

  useEffect(() => {
    const channel = supabase
      .channel("realtime-status-kios")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pengaturan_kios"
        },
        () => {
          fetchStatusKios();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* =====================================================
     FETCH MENU
  ===================================================== */
  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .eq("stok", "ada")
        .eq("is_aktif", true);

      if (error) throw error;

      const availableMenu = data || [];
      setMenuAktif(availableMenu);
      validasiKeranjang(availableMenu);
    } catch (error) {
      console.log(error);
    }
  };

  /* =====================================================
     FETCH KERANJANG
  ===================================================== */
  const fetchKeranjang = () => {
    try {
      setLoading(true);
      const dataKeranjang = JSON.parse(localStorage.getItem("keranjang")) || [];
      setKeranjang(dataKeranjang);
    } catch (error) {
      console.log(error);
      toast.error("Gagal memuat keranjang");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     VALIDASI KERANJANG
  ===================================================== */
  const validasiKeranjang = (availableMenu) => {
    try {
      const cart = JSON.parse(localStorage.getItem("keranjang")) || [];
      const menuIds = availableMenu.map((item) => item.id);

      const invalidItems = cart.filter((item) => !menuIds.includes(item.id));

      if (invalidItems.length > 0) {
        invalidItems.forEach((item) => {
          toast.error(`${item.nama} sudah tidak tersedia`);
        });
      }

      const updatedCart = cart.filter((item) => menuIds.includes(item.id));
      setKeranjang(updatedCart);
      localStorage.setItem("keranjang", JSON.stringify(updatedCart));
    } catch (error) {
      console.log(error);
    }
  };

  /* =====================================================
     VALIDASI MENU
  ===================================================== */
  const menuMasihAda = (id) => {
    return menuAktif.some((item) => item.id === id);
  };

  /* =====================================================
     TAMBAH QTY
  ===================================================== */
  const tambahQty = (id) => {
    try {
      if (!menuMasihAda(id)) {
        toast.error("Menu sudah tidak tersedia");
        return;
      }

      const updated = keranjang.map((item) => {
        if (item.id === id) {
          return { ...item, qty: item.qty + 1 };
        }
        return item;
      });

      setKeranjang(updated);
      localStorage.setItem("keranjang", JSON.stringify(updated));
    } catch (error) {
      console.log(error);
    }
  };

  /* =====================================================
     KURANG QTY
  ===================================================== */
  const kurangQty = (id) => {
    try {
      let updated = keranjang.map((item) => {
        if (item.id === id) {
          return { ...item, qty: item.qty - 1 };
        }
        return item;
      });

      updated = updated.filter((item) => item.qty > 0);
      setKeranjang(updated);
      localStorage.setItem("keranjang", JSON.stringify(updated));
    } catch (error) {
      console.log(error);
    }
  };

  /* =====================================================
     HAPUS ITEM
  ===================================================== */
  const hapusItem = (id) => {
    try {
      const updated = keranjang.filter((item) => item.id !== id);
      setKeranjang(updated);
      localStorage.setItem("keranjang", JSON.stringify(updated));
      toast.success("Menu dihapus");
    } catch (error) {
      console.log(error);
    }
  };

  /* =====================================================
     TOTAL HARGA
  ===================================================== */
  const totalHarga = useMemo(() => {
    return keranjang.reduce((acc, item) => {
      return acc + Number(item.harga) * Number(item.qty);
    }, 0);
  }, [keranjang]);

  /* =====================================================
     LANJUT KONFIRMASI
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

    const invalidItems = keranjang.filter((item) => !menuMasihAda(item.id));

    if (invalidItems.length > 0) {
      invalidItems.forEach((item) => {
        toast.error(`${item.nama} sudah tidak tersedia`);
      });
      validasiKeranjang(menuAktif);
      return;
    }

    localStorage.setItem("checkoutItems", JSON.stringify(keranjang));
    navigate("/konfirmasi-pesanan");
  };

  /* =====================================================
     LOADING
  ===================================================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa]">
        <div className="w-14 h-14 rounded-full border-4 border-[#002366] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] px-4 md:px-8 py-6 pb-44 md:pb-40 w-full overflow-x-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-[#002366]">
            Keranjang
            <span className="text-[#FF8C00]"> Pesanan</span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Daftar menu yang dipilih pelanggan.
          </p>
        </div>

        <button
          onClick={() => navigate("/daftar-menu")}
          className="bg-[#002366] hover:bg-blue-950 text-white px-5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-sm sm:text-base text-center w-full sm:w-auto shadow-sm active:scale-95 transition-all"
        >
          + Tambah Menu
        </button>
      </div>

      {/* BANNER STATUS KIOS */}
      {!kiosBuka && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-2xl mb-5 font-bold text-sm sm:text-base">
          Kios sedang tutup. Pemesanan sementara tidak tersedia.
        </div>
      )}

      {/* EMPTY STATE */}
      {keranjang.length === 0 && (
        <div className="bg-white rounded-[24px] md:rounded-[30px] p-8 md:p-12 text-center shadow-sm max-w-xl mx-auto border border-gray-100">
          <div className="text-5xl sm:text-7xl">🛒</div>
          <h1 className="text-xl sm:text-3xl font-black text-[#002366] mt-4">
            Keranjang Kosong
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Silakan pilih hidangan lezat kami di halaman menu.
          </p>
        </div>
      )}

      {/* LIST ITEMS */}
      <div className="space-y-4 md:space-y-5">
        {keranjang.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-[20px] md:rounded-[30px] p-4 md:p-5 shadow-sm border border-gray-50"
          >
            <div className="flex flex-row lg:flex-row gap-4 md:gap-6 items-center lg:items-start">
              
              {/* IMAGE */}
              <img
                src={item.gambar}
                alt={item.nama}
                className="w-24 h-24 sm:w-32 sm:h-32 lg:w-52 lg:h-52 object-cover rounded-2xl md:rounded-3xl flex-shrink-0"
              />

              {/* CONTENT */}
              <div className="flex-1 min-w-0 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg sm:text-2xl md:text-5xl font-black text-[#002366] truncate pr-1">
                      {item.nama}
                    </h1>
                    <h2 className="text-[#FF8C00] font-black text-base sm:text-xl md:text-3xl mt-1 md:mt-3">
                      Rp {Number(item.harga).toLocaleString("id-ID")}
                    </h2>
                  </div>

                  {/* HAPUS */}
                  <button
                    onClick={() => hapusItem(item.id)}
                    className="bg-red-100 hover:bg-red-200 text-red-600 px-3 sm:px-5 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex-shrink-0 transition-colors"
                  >
                    Hapus
                  </button>
                </div>

                {/* QUANTITY CONTROLLER */}
                <div className="flex items-center gap-4 sm:gap-5 mt-4 lg:mt-10">
                  {/* MIN BUTTON */}
                  <button
                    onClick={() => kurangQty(item.id)}
                    className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gray-200 hover:bg-gray-300 rounded-xl sm:rounded-2xl text-xl sm:text-3xl font-black flex items-center justify-center transition-colors select-none"
                  >
                    -
                  </button>

                  {/* QUANTITY DISPLAY */}
                  <div className="text-xl sm:text-3xl font-black text-[#002366] w-6 text-center select-none">
                    {item.qty}
                  </div>

                  {/* PLUS BUTTON */}
                  <button
                    onClick={() => tambahQty(item.id)}
                    className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-[#002366] hover:bg-blue-950 rounded-xl sm:rounded-2xl text-xl sm:text-3xl font-black text-white flex items-center justify-center transition-colors select-none"
                  >
                    +
                  </button>
                </div>

              </div>

            </div>
          </div>
        ))}
      </div>

      {/* BOTTOM FLOATING TOTAL */}
      {keranjang.length > 0 && (
        <div 
          className="
            fixed 
            z-50 
            bg-white 
            shadow-2xl 
            border 
            border-gray-100
            
            /* Style untuk Layar HP (Kecil) */
            bottom-4 
            left-4 
            right-4
            rounded-[20px] 
            p-4 
            
            /* Style untuk Layar Desktop (md ke atas) */
            md:bottom-5 
            md:right-5 
            md:left-auto 
            md:translate-x-0
            md:w-[350px] 
            md:rounded-[30px] 
            md:p-5
          "
        >
          <div className="flex justify-between items-center mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-2xl font-black text-[#002366]">
              Total
            </h2>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-[#FF8C00]">
              Rp {totalHarga.toLocaleString("id-ID")}
            </h2>
          </div>

          <button
            disabled={!kiosBuka}
            onClick={handleLanjut}
            className={`w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-white text-sm sm:text-base transition-all shadow-sm active:scale-95 text-center ${
              kiosBuka
                ? "bg-[#FF8C00] hover:bg-orange-600 cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {kiosBuka ? "Lanjut Konfirmasi" : "Kios Sedang Tutup"}
          </button>
        </div>
      )}

    </div>
  );
};

export default KeranjangPembeli;