import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import toast from "react-hot-toast";

const KonfirmasiPesananPembeli = () => {
  const navigate = useNavigate();

  /* =====================================================
     STATE
  ===================================================== */
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [namaPembeli, setNamaPembeli] = useState("");
  const [email, setEmail] = useState("");
  const [metodePembayaran, setMetodePembayaran] = useState("Tunai");
  const [selectedMeja, setSelectedMeja] = useState(null);
  const [showPopupMeja, setShowPopupMeja] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [mejaDipakai, setMejaDipakai] = useState([]);
  const [kiosBuka, setKiosBuka] = useState(true);

  /* =====================================================
     LOAD AWAL & VALIDASI REALTIME STATUS KIOS
  ===================================================== */
  useEffect(() => {
    fetchStatusKios();

    // Jalankan Realtime listener untuk status kios
    const channelKios = supabase
      .channel("realtime-kios-konfirmasi")
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
      supabase.removeChannel(channelKios);
    };
  }, []);

  // Tendang user jika terdeteksi kios tutup
  useEffect(() => {
    if (!kiosBuka) {
      localStorage.removeItem("keranjang");
      setCart([]);
      toast.error("Maaf, kios baru saja ditutup oleh admin.");
      navigate("/beranda");
    }
  }, [kiosBuka, navigate]);

  const fetchStatusKios = async () => {
    try {
      const { data, error } = await supabase
        .from("pengaturan_kios")
        .select("buka")
        .eq("id", 1)
        .single();
      
      if (!error && data) {
        setKiosBuka(data.buka);
        if (!data.buka) {
          toast.error("Kios sedang tutup");
          navigate("/beranda");
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const loadGuestData = async () => {
    try {
      const token = localStorage.getItem("guestToken");
      if (!token) return;

      const { data: guest, error } = await supabase
        .from("guest_customer")
        .select("nama_pembeli,email")
        .eq("access_token", token)
        .single();

      if (error || !guest) return;

      setNamaPembeli(guest.nama_pembeli || "");
      setEmail(guest.email || "");
    } catch (err) {
      console.log("LOAD GUEST ERROR:", err);
    }
  };

  /* =====================================================
     AMBIL DATA KERANJANG
  ===================================================== */
  useEffect(() => {
    const syncKeranjang = () => {
      const dataKeranjang = JSON.parse(localStorage.getItem("keranjang")) || [];
      setCart(dataKeranjang);

      if (dataKeranjang.length === 0) {
        toast.error("Keranjang kosong");
        navigate("/keranjang");
      }
    };

    syncKeranjang();

    window.addEventListener("focus", syncKeranjang);
    document.addEventListener("visibilitychange", syncKeranjang);
    getMejaDipakai();

    return () => {
      window.removeEventListener("focus", syncKeranjang);
      document.removeEventListener("visibilitychange", syncKeranjang);
    };
  }, []);

  /* =====================================================
     REALTIME MEJA
  ===================================================== */
  useEffect(() => {
    const channel = supabase
      .channel("realtime-meja")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pesanan"
        },
        () => {
          getMejaDipakai();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* =====================================================
     AMBIL MEJA DIPAKAI
  ===================================================== */
  const getMejaDipakai = async () => {
    try {
      const { data, error } = await supabase
        .from("pesanan")
        .select(`
          meja_id,
          status,
          meja (
            nomor_meja
          )
        `)
        .in("status", ["menunggu_pembayaran", "diproses"]);

      if (error) throw error;

      const mejaUsed = data.map((item) => Number(item.meja?.nomor_meja));
      setMejaDipakai(mejaUsed);
    } catch (error) {
      console.log(error);
    }
  };

  /* =====================================================
     TOTAL HARGA
  ===================================================== */
  const totalHarga = useMemo(() => {
    return cart.reduce((total, item) => {
      return total + Number(item.harga) * Number(item.qty);
    }, 0);
  }, [cart]);

  /* =====================================================
     DATA MEJA
  ===================================================== */
  const mejaPerPage = 10;
  const totalMeja = 100;
  const allMeja = Array.from({ length: totalMeja }, (_, i) => i + 1);

  const currentMeja = useMemo(() => {
    const start = (currentPage - 1) * mejaPerPage;
    const end = start + mejaPerPage;
    return allMeja.slice(start, end);
  }, [currentPage]);

  /* =====================================================
     PILIH MEJA
  ===================================================== */
  const pilihMeja = (nomor) => {
    const sedangDipakai = mejaDipakai.includes(nomor);
    if (sedangDipakai) {
      toast.error("Meja sedang digunakan");
      return;
    }
    setSelectedMeja(nomor);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  useEffect(() => {
    loadGuestData();
  }, []);

  /* =====================================================
     KONFIRMASI PESANAN
  ===================================================== */
  const handleKonfirmasiPesanan = async () => {
    try {
      setLoading(true);

      // Cek status kios kembali sebelum memproses transaksi database
      const { data: kiosData } = await supabase
        .from("pengaturan_kios")
        .select("buka")
        .eq("id", 1)
        .single();

      if (!kiosData?.buka) {
        toast.error("Kios sedang tutup. Tidak dapat melakukan pesanan.");
        localStorage.removeItem("keranjang");
        navigate("/beranda");
        return;
      }

      if (cart.length === 0) {
        toast.error("Keranjang kosong");
        return;
      }

      if (!namaPembeli.trim()) {
        toast.error("Nama pembeli wajib diisi");
        return;
      }

      if (namaPembeli.trim().length < 2) {
        toast.error("Nama terlalu pendek");
        return;
      }

      if (!email) {
        toast.error("Email wajib diisi");
        return;
      }

      if (!isValidEmail(email)) {
        toast.error("Format email tidak valid");
        return;
      }

      if (!selectedMeja) {
        toast.error("Pilih meja terlebih dahulu");
        return;
      }

      const { data: mejaData, error: mejaError } = await supabase
        .from("meja")
        .select("*")
        .eq("nomor_meja", Number(selectedMeja))
        .maybeSingle();

      if (mejaError || !mejaData) {
        toast.error("Meja tidak ditemukan atau gagal divalidasi");
        return;
      }

      if (mejaData.status === "dipakai") {
        toast.error(`Meja ${selectedMeja} sedang digunakan`);
        return;
      }

      const kodePesanan = "ORD-" + Date.now();
      const cleanedEmail = email.trim().toLowerCase();

      const normalizedItems = cart.map((item) => ({
        ...item,
        gambar: item.gambar || item.img || ""
      }));

      let guestCustomer = null;

      const { data: existingGuest, error: guestError } = await supabase
        .from("guest_customer")
        .select("*")
        .eq("email", cleanedEmail)
        .maybeSingle();

      if (existingGuest) {
        guestCustomer = existingGuest;
        await supabase
          .from("guest_customer")
          .update({
            nama_pembeli: namaPembeli.trim(),
            last_order_at: new Date().toISOString()
          })
          .eq("id", existingGuest.id);
      } else {
        const accessToken = crypto.randomUUID();
        const { data: newGuest, error: createGuestError } = await supabase
          .from("guest_customer")
          .insert({
            email: cleanedEmail,
            nama_pembeli: namaPembeli.trim(),
            access_token: accessToken
          })
          .select()
          .single();

        if (createGuestError) {
          toast.error("Gagal membuat akun pelanggan");
          return;
        }
        guestCustomer = newGuest;
      }

      localStorage.setItem("guestToken", guestCustomer.access_token);

      const payload = {
        guest_customer_id: guestCustomer.id,
        kode_pesanan: kodePesanan,
        nama_pembeli: namaPembeli.trim(),
        email: cleanedEmail,
        meja_id: mejaData.id,
        metode_pembayaran: metodePembayaran,
        items: normalizedItems,
        total_harga: totalHarga,
        status: "menunggu_pembayaran",
        is_checkout: true,
      };

      const { error: insertError } = await supabase
        .from("pesanan")
        .insert([payload]);

    if (insertError) {

      console.error(insertError);

      const isMejaConflict =
        insertError.code === "23505" ||
        insertError.message?.includes("unique_meja_aktif") ||
        insertError.details?.includes("meja_id");

      if (isMejaConflict) {

        toast.error(
          `Meja ${selectedMeja} baru saja dipilih pelanggan lain. Silakan pilih meja lain.`
        );

        return;
      }

      toast.error("Gagal menyimpan pesanan");

      return;
    }

      await supabase
        .from("meja")
        .update({ status: "dipakai" })
        .eq("id", mejaData.id);

      localStorage.removeItem("keranjang");
      localStorage.removeItem("checkoutItems");

      toast.success("Pesanan berhasil dikonfirmasi");
      navigate("/status-pesanan", { state: { kodePesanan } });
    } catch (err) {
      console.log(err);
      toast.error("Gagal konfirmasi pesanan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F3F4F6] px-4 md:px-7 py-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-6xl font-black text-[#002366]">
          Konfirmasi <span className="text-[#FF8C00]">Pesanan</span>
        </h1>
        <p className="text-gray-500 mt-2">Pastikan data pesanan sudah benar.</p>
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_450px] gap-6">
        {/* LEFT */}
        <div className="bg-white rounded-[35px] p-6 shadow-sm">
          <h2 className="text-3xl font-black text-[#002366] mb-8">Data Pembeli</h2>

          {/* NAMA */}
          <div className="mb-5">
            <p className="font-bold text-[#002366] mb-2">Nama Pembeli</p>
            <input
              type="text"
              maxLength={30}
              value={namaPembeli}
              onChange={(e) => setNamaPembeli(e.target.value)}
              className="w-full h-[60px] rounded-2xl border border-gray-300 px-5 outline-none"
            />
          </div>

          {/* EMAIL */}
          <div className="mb-8">
            <p className="font-bold text-[#002366] mb-2">Email</p>
            <input
              type="email"
              maxLength={50}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[60px] rounded-2xl border border-gray-300 px-5 outline-none"
            />
          </div>

          {/* PILIH MEJA */}
          <div className="mb-10">
            <p className="font-bold text-[#002366] text-2xl mb-4">Pilih Meja</p>
            <button
              onClick={() => setShowPopupMeja(true)}
              className="w-full md:w-[280px] h-[60px] rounded-2xl bg-[#002366] text-white font-bold text-lg"
            >
              {selectedMeja ? `Meja ${selectedMeja}` : "Pilih Meja"}
            </button>
          </div>

          {/* PEMBAYARAN */}
          <div>
            <p className="font-bold text-[#002366] text-2xl mb-5">Metode Pembayaran</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMetodePembayaran("Tunai")}
                className={`h-[70px] rounded-2xl border-2 font-black text-base transition-all flex items-center justify-center gap-3 min-h-[44px] ${
                  metodePembayaran === "Tunai"
                    ? "bg-[#002366] text-white border-[#002366] shadow-md shadow-indigo-100"
                    : "bg-white text-slate-500 border-slate-200 hover:border-[#002366] hover:text-[#002366]"
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Tunai
              </button>

              <button
                type="button"
                onClick={() => setMetodePembayaran("QRIS")}
                className={`h-[70px] rounded-2xl border-2 font-black text-base transition-all flex items-center justify-center gap-3 min-h-[44px] ${
                  metodePembayaran === "QRIS"
                    ? "bg-[#FF8C00] text-white border-[#FF8C00] shadow-md shadow-orange-100"
                    : "bg-white text-slate-500 border-slate-200 hover:border-[#FF8C00] hover:text-[#FF8C00]"
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                QRIS
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT (RINGKASAN PESANAN DENGAN ADAPTASI VARIAN) */}
        <div className="bg-white rounded-[35px] p-6 shadow-sm h-fit sticky top-28">
          <h2 className="text-3xl font-black text-[#002366] mb-8">Ringkasan Pesanan</h2>

          <div className="flex flex-col gap-5">
            {cart.map((item, index) => {
              const memilikiVarian = Number(item.harga_extra) > 0;
              return (
                <div key={index} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-none">
                  <div>
                    <h3 className="font-black text-[#002366] text-lg capitalize">
                      {item.nama}
                    </h3>
                    
                    {/* HANYA KELUAR JIKA ADA VARIAN DI DATABASE MASTER */}
                    {memilikiVarian && (
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded mt-0.5 tracking-wider ${
                        item.varian === "extra" 
                          ? "bg-red-50 text-red-600 border border-red-100" 
                          : "bg-blue-50 text-[#002366] border border-blue-100"
                      }`}>
                        Varian: {item.varian || "Biasa"}
                      </span>
                    )}

                    <p className="text-gray-400 text-sm mt-1">
                      {item.qty} x Rp {Number(item.harga).toLocaleString("id-ID")}
                    </p>
                  </div>

                  <p className="font-black text-[#FF8C00] text-xl tabular-nums">
                    Rp {(Number(item.qty) * Number(item.harga)).toLocaleString("id-ID")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* TOTAL */}
          <div className="border-t mt-7 pt-7 flex items-center justify-between">
            <h1 className="text-3xl font-black text-[#002366]">Total</h1>
            <h1 className="text-4xl font-black text-[#FF8C00] tabular-nums">
              Rp {totalHarga.toLocaleString("id-ID")}
            </h1>
          </div>

          {/* BUTTON ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              type="button"
              onClick={() => navigate("/keranjang")}
              className="w-full sm:w-1/3 h-[65px] rounded-2xl bg-red-100 hover:bg-red-200 text-red-600 font-black text-xl transition-all order-2 sm:order-1"
            >
              Batalkan
            </button>

            <button
              onClick={handleKonfirmasiPesanan}
              disabled={loading || !kiosBuka}
              className="w-full sm:w-2/3 h-[65px] rounded-2xl bg-[#FF8C00] hover:bg-orange-600 text-white font-black text-xl disabled:opacity-50 transition-all order-1 sm:order-2"
            >
              {loading ? "MEMPROSES..." : "Konfirmasi Pesanan"}
            </button>
          </div>
        </div>
      </div>

      {/* POPUP MEJA */}
      {showPopupMeja && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full Southport max-w-[650px] rounded-[38px] p-6 shadow-2xl animate-[fadeIn_.2s_ease]">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-black text-[#002366]">Pilih Meja</h1>
              <button
                onClick={() => setShowPopupMeja(false)}
                className="w-[45px] h-[45px] rounded-2xl bg-red-500 hover:bg-red-600 text-white text-2xl font-black transition-all"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {currentMeja.map((nomor) => {
                const dipakai = mejaDipakai.includes(nomor);
                const selected = selectedMeja === nomor;

                return (
                  <button
                    key={nomor}
                    onClick={() => pilihMeja(nomor)}
                    disabled={dipakai}
                    className={`h-[74px] rounded-[20px] font-black text-2xl transition-all duration-300 ${
                      selected
                        ? "bg-[#FF8C00] text-white scale-105"
                        : dipakai
                        ? "bg-gray-300 text-white cursor-not-allowed"
                        : "bg-[#56657F] hover:bg-[#002366] text-white"
                    }`}
                  >
                    {nomor}
                  </button>
                );
              })}
            </div>

            {/* PAGINATION */}
            <div className="flex items-center justify-between mt-6 flex-shrink-0 gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="flex-1 sm:flex-none px-3 sm:px-6 h-[45px] sm:h-[50px] rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm sm:text-base transition-all disabled:opacity-40"
              >
                Sebelumnya
              </button>

              <p className="font-black text-[#002366] text-sm sm:text-lg whitespace-nowrap">
                {currentMeja[0]} - {currentMeja[currentMeja.length - 1]}
              </p>

              <button
                disabled={currentPage === 10}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="flex-1 sm:flex-none px-3 sm:px-6 h-[45px] sm:h-[50px] rounded-2xl bg-[#FF8C00] hover:bg-orange-600 text-white font-bold text-sm sm:text-base transition-all disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>

            <button
              onClick={() => setShowPopupMeja(false)}
              disabled={!selectedMeja}
              className="w-full h-[56px] rounded-[20px] bg-[#8A9BC0] hover:bg-[#6F84B3] text-white font-black text-xl mt-6 transition-all disabled:opacity-50"
            >
              Gunakan Meja {selectedMeja || ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KonfirmasiPesananPembeli;