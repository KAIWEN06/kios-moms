import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate,
  useSearchParams
} from "react-router-dom";

import {
  supabase
} from "../../lib/supabaseClient";

import toast
from "react-hot-toast";

const StatusPesananPembeli = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* =====================================================
     STATE MANAGEMENT
  ===================================================== */
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pesanan, setPesanan] = useState([]);
  const [menuPage, setMenuPage] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  // Ganti Menu Overlay State
  const [showGantiMenu, setShowGantiMenu] = useState(false);
  const [menuTersedia, setMenuTersedia] = useState([]);
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [targetPesananGanti, setTargetPesananGanti] = useState(null);

  // Custom Modal Konfirmasi State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "", // 'batal' | 'hapus_menu'
    title: "",
    message: "",
    targetId: null,
    targetMenuId: null,
    targetNamaMenu: ""
  });

  /* =====================================================
     QUERY PARAM INDICATION
  ===================================================== */
  const kodePesanan = searchParams.get("kode");
  const tokenFromUrl = searchParams.get("token");

  /* =====================================================
     AUTO CANCEL IF EMPTY (PROTECTION AGAINST LOG IMAGE)
  ===================================================== */
  const handleAutoCancelPesanan = async (pesananId, mejaId) => {
    try {
      await supabase
        .from("pesanan")
        .update({
          status: "dibatalkan",
          alasan_pembatalan: "Sistem: Semua menu dalam pesanan telah dihapus",
          dibatalkan_pada: new Date()
        })
        .eq("id", pesananId);

      if (mejaId) {
        await supabase.from("meja").update({ status: "tersedia" }).eq("id", mejaId);
      }
    } catch (err) {
      console.error("Gagal auto-cancel pesanan kosong:", err);
    }
  };

  /* =====================================================
     FETCH DATA (INTEGRATED MENU & TABLE)
  ===================================================== */
  const fetchPesanan = async () => {
    try {
      setLoading(true);

      let token = tokenFromUrl || localStorage.getItem("guestToken");
      if (!token) {
        setPesanan([]);
        return;
      }

      if (tokenFromUrl) {
        localStorage.setItem("guestToken", tokenFromUrl);
      }

      // 1. Ambil data customer guest token
      const { data: guest, error: guestError } = await supabase
        .from("guest_customer")
        .select("id")
        .eq("access_token", token)
        .single();

      if (guestError || !guest) {
        setPesanan([]);
        return;
      }

      // 2. Ambil data master menu untuk cek sinkronisasi stok habis
      const { data: menuMasterData, error: menuMasterError } = await supabase
        .from("menu")
        .select("id, stok, is_aktif");

      if (menuMasterError) throw menuMasterError;

      // 3. Query utama pesanan aktif milik pembeli
      let query = supabase
        .from("pesanan")
        .select(`
          *,
          meja (
            id,
            nomor_meja
          )
        `)
        .eq("guest_customer_id", guest.id)
        .in("status", ["menunggu_pembayaran", "diproses"])
        .order("created_at", { ascending: false });

      if (kodePesanan) {
        query = query.eq("kode_pesanan", kodePesanan);
      }

      const { data: pesananData, error: pesananError } = await query;
      if (pesananError) throw pesananError;

      // 4. Struktur ulang data agar sinkron dengan status menu terbaru
      const hasilPemrosesan = [];
      
      for (const p of (pesananData || [])) {
        let items = [];
        try {
          items = Array.isArray(p.items) ? p.items : JSON.parse(p.items || "[]");
        } catch {
          items = [];
        }

        // PROTEKSI: Jika admin menghapus semua item dari backend sehingga kosong (seperti image_872f86.png)
        if (items.length === 0 && p.status === "menunggu_pembayaran") {
          await handleAutoCancelPesanan(p.id, p.meja_id);
          continue; // Lewati card ini agar tidak muncul zonk di pembeli
        }

        const itemsDenganStatus = items.map((item) => {
          const menuInfo = menuMasterData.find((m) => Number(m.id) === Number(item.id));
          
          const statusHabis = menuInfo?.stok === "kosong" || menuInfo?.stok <= 0;
          const statusDihapus = menuInfo ? menuInfo.is_aktif === false : true;

          return {
            ...item,
            menu_habis: p.status === "menunggu_pembayaran" ? statusHabis : false,
            dihapus_admin: p.status === "menunggu_pembayaran" ? statusDihapus : false
          };
        });

        hasilPemrosesan.push({
          ...p,
          items: itemsDenganStatus,
          nomor_meja: p.meja?.nomor_meja || "-"
        });
      }

      setPesanan(hasilPemrosesan);

      // Inisialisasi Pagination per pesanan card
      let initPage = {};
      hasilPemrosesan.forEach((item) => {
        initPage[item.id] = 1;
      });
      setMenuPage(initPage);

    } catch (error) {
      console.error(error);
      toast.error("Gagal mengambil status pesanan");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     LIFECYCLE & REALTIME SUBSCRIPTION MULTI-TABLE
  ===================================================== */
  useEffect(() => {
    fetchPesanan();
  }, [kodePesanan, tokenFromUrl]);

  useEffect(() => {
    const channelPesanan = supabase
      .channel("realtime-pembeli-komplit")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pesanan" },
        () => {
          fetchPesanan();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu" },
        () => {
          fetchPesanan();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelPesanan);
    };
  }, []);

  /* =====================================================
     FILTER SEARCH FUNCTION
  ===================================================== */
  const filteredPesanan = useMemo(() => {
    return pesanan.filter((item) => {
      const keyword = search.toLowerCase().trim();
      const kode = item.kode_pesanan?.toLowerCase().includes(keyword);
      const meja = `m${String(item.nomor_meja)}`.toLowerCase().includes(keyword);
      return kode || meja;
    });
  }, [pesanan, search]);

  /* =====================================================
     ACTION CONTROLLER & SUPABASE OPERATION
  ===================================================== */
  const updateQtyMenu = async (pesananId, menuId, perubahan) => {
    try {
      const target = pesanan.find((p) => Number(p.id) === Number(pesananId));
      if (!target) return;

      const updatedItems = target.items.map((item) => {
        if (Number(item.id) === Number(menuId)) {
          return { ...item, qty: Number(item.qty) + perubahan };
        }
        return item;
      });

      const totalBaru = updatedItems.reduce((total, item) => {
        if (item.menu_habis || item.dihapus_admin) return total;
        return total + Number(item.harga || 0) * Number(item.qty || 0);
      }, 0);

      const { error } = await supabase
        .from("pesanan")
        .update({ items: updatedItems, total_harga: totalBaru })
        .eq("id", pesananId);

      if (error) throw error;
      fetchPesanan();
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengubah kuantitas menu");
    }
  };

  const handleGantiMenu = async (pesananItem) => {
    try {
      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .eq("stok", "ada")
        .eq("is_aktif", true)
        .order("Total_Terjual", { ascending: false });

      if (error) throw error;

      const menuMasihAktif = pesananItem.items.filter((item) => !item.menu_habis && !item.dihapus_admin);
      const initialSelected = menuMasihAktif.map((item) => ({
        id: item.id,
        nama: item.nama,
        harga: item.harga,
        gambar: item.gambar || item.img,
        qty: item.qty
      }));

      setTargetPesananGanti(pesananItem);
      setMenuTersedia(data || []);
      setSelectedMenus(initialSelected);
      setShowGantiMenu(true);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat menu pengganti");
    }
  };

  const updateQtyOverlay = (menu, perubahan) => {
    setSelectedMenus((prev) => {
      const existing = prev.find((item) => Number(item.id) === Number(menu.id));
      if (!existing) {
        if (perubahan < 0) return prev;
        return [...prev, { id: menu.id, nama: menu.nama, harga: menu.harga, gambar: menu.img, qty: 1 }];
      }
      const qtyBaru = existing.qty + perubahan;
      if (qtyBaru <= 0) {
        return prev.filter((item) => Number(item.id) !== Number(menu.id));
      }
      return prev.map((item) =>
        Number(item.id) === Number(menu.id) ? { ...item, qty: qtyBaru } : item
      );
    });
  };

  const simpanPerubahanMenu = async () => {
    try {
      if (!targetPesananGanti) return;
      const totalBaru = selectedMenus.reduce((total, item) => total + Number(item.harga) * Number(item.qty), 0);

      const { error } = await supabase
        .from("pesanan")
        .update({ items: selectedMenus, total_harga: totalBaru })
        .eq("id", targetPesananGanti.id);

      if (error) throw error;
      toast.success("Menu pesanan berhasil diperbarui");
      setShowGantiMenu(false);
      setTargetPesananGanti(null);
      setSelectedMenus([]);
      fetchPesanan();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan perubahan menu");
    }
  };

  /* =====================================================
     MODAL CONTROLLER SYSTEM
  ===================================================== */
  const bukaModalKonfirmasi = (type, id, namaMenu = "", menuId = null) => {
    let title = "";
    let message = "";

    if (type === "batal") {
      title = "Batalkan Pesanan";
      message = "Apakah Anda yakin ingin membatalkan pesanan ini? Tindakan ini tidak dapat diurungkan.";
    } else if (type === "hapus_menu") {
      title = "Hapus Menu Dari Pesanan";
      message = `Apakah Anda yakin ingin menghapus "${namaMenu}" dari daftar pesanan Anda?`;
    }

    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      targetId: id,
      targetMenuId: menuId,
      targetNamaMenu: namaMenu
    });
  };

  const tutupModal = () => {
    setModalConfig({ isOpen: false, type: "", title: "", message: "", targetId: null, targetMenuId: null, targetNamaMenu: "" });
  };

  const eksekusiAksi = async () => {
    const { type, targetId, targetMenuId } = modalConfig;
    tutupModal();

    try {
      setActionLoading(targetId);

      if (type === "batal") {
        const target = pesanan.find((p) => p.id === targetId);
        const { error } = await supabase
          .from("pesanan")
          .update({
            status: "dibatalkan",
            alasan_pembatalan: "Dibatalkan oleh pelanggan/sistem",
            dibatalkan_pada: new Date()
          })
          .eq("id", targetId);

        if (error) throw error;

        if (target?.meja_id) {
          await supabase.from("meja").update({ status: "tersedia" }).eq("id", target.meja_id);
        }
        toast.success("Pesanan berhasil dibatalkan");

      } else if (type === "hapus_menu") {
        const target = pesanan.find((p) => p.id === targetId);
        if (!target) return;

        const updatedItems = target.items.filter((item) => Number(item.id) !== Number(targetMenuId));
        
        // JIKA SETELAH DIHAPUS JADI KOSONG, MAKA OTOMATIS BATALKAN PESANAN
        if (updatedItems.length === 0) {
          const { error } = await supabase
            .from("pesanan")
            .update({
              status: "dibatalkan",
              alasan_pembatalan: "Semua menu dihapus oleh pembeli",
              dibatalkan_pada: new Date()
            })
            .eq("id", targetId);

          if (error) throw error;
          if (target?.meja_id) {
            await supabase.from("meja").update({ status: "tersedia" }).eq("id", target.meja_id);
          }
          toast.success("Semua menu kosong, pesanan otomatis dibatalkan");
        } else {
          // Jika masih ada menu lain, lanjutkan update biasa
          const totalBaru = updatedItems.reduce((total, item) => {
            if (item.menu_habis || item.dihapus_admin) return total;
            return total + Number(item.harga || 0) * Number(item.qty || 0);
          }, 0);

          const { error } = await supabase
            .from("pesanan")
            .update({ items: updatedItems, total_harga: totalBaru })
            .eq("id", targetId);

          if (error) throw error;
          toast.success("Menu berhasil dihapus");
        }
      }

      fetchPesanan();
    } catch (error) {
      console.error(error);
      toast.error("Gagal memproses permintaan");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePesanLagi = (items) => {
    try {
      const keranjangLama = JSON.parse(localStorage.getItem("keranjang")) || [];
      let updatedKeranjang = [...keranjangLama];

      items.forEach((menu) => {
        if (menu.dihapus_admin) return;
        const existingItem = updatedKeranjang.find((x) => x.id === menu.id);
        if (existingItem) {
          updatedKeranjang = updatedKeranjang.map((x) =>
            x.id === menu.id ? { ...x, qty: x.qty + menu.qty } : x
          );
        } else {
          updatedKeranjang.push({
            id: menu.id,
            nama: menu.nama,
            harga: menu.harga,
            gambar: menu.gambar || menu.img,
            qty: menu.qty
          });
        }
      });

      localStorage.setItem("keranjang", JSON.stringify(updatedKeranjang));
      toast.success("Pesanan berhasil dimasukkan ke keranjang");
      navigate("/keranjang");
    } catch (error) {
      console.error(error);
      toast.error("Gagal memesan ulang");
    }
  };

  /* =====================================================
     VIEW RENDER
  ===================================================== */
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50 gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#002366] rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Memuat Status Pesanan...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 md:p-8 lg:p-10 bg-slate-50 min-h-screen text-slate-800 antialiased relative">
      
      {/* CUSTOM CONFIRMATION MODAL */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={tutupModal} />
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 max-w-md w-full relative z-10 transform scale-100 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-slate-900">{modalConfig.title}</h3>
            </div>
            <p className="text-sm font-semibold text-slate-500 leading-relaxed mb-6">{modalConfig.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={tutupModal} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">Kembali</button>
              <button onClick={eksekusiAksi} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 shadow-xs shadow-rose-100 transition-colors">Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY SELEKSI GANTI MENU */}
      {showGantiMenu && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm">
          <div className="h-screen overflow-y-auto">
            <div className="min-h-screen p-4 md:p-8 flex items-start justify-center">
              <div className="w-full max-w-7xl bg-white rounded-3xl p-6 mt-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-[#002366]">Ganti Menu Pesanan</h2>
                  <button onClick={() => setShowGantiMenu(false)} className="font-bold text-xl">✕</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {menuTersedia.map((menu) => {
                    const selected = selectedMenus.find((x) => Number(x.id) === Number(menu.id));
                    const qty = selected?.qty || 0;
                    return (
                      <div key={menu.id} className="border rounded-2xl overflow-hidden shadow-xs">
                        <img src={menu.img} alt={menu.nama} className="w-full h-40 object-cover" />
                        <div className="p-4">
                          <h3 className="font-black text-[#002366] truncate">{menu.nama}</h3>
                          <p className="text-[#FF8C00] font-black text-xl mt-2">Rp {Number(menu.harga).toLocaleString("id-ID")}</p>
                          <div className="flex items-center justify-between mt-4">
                            <button onClick={() => updateQtyOverlay(menu, -1)} className="w-10 h-10 rounded-xl bg-slate-200 font-black">-</button>
                            <span className="font-black text-xl">{qty}</span>
                            <button onClick={() => updateQtyOverlay(menu, 1)} className="w-10 h-10 rounded-xl bg-[#002366] text-white font-black">+</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-3 mt-8">
                  <button onClick={() => setShowGantiMenu(false)} className="px-5 py-3 border rounded-xl font-bold">Batal</button>
                  <button onClick={simpanPerubahanMenu} className="px-5 py-3 rounded-xl bg-[#FF8C00] text-white font-black">Simpan Perubahan</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE LAYOUT */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#002366] tracking-tight">
              Status <span className="text-[#FF8C00]">Pesanan</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">
              Pantau progress pesanan Anda, sesuaikan hidangan aktif, dan lacak status pesanan secara real-time.
            </p>
          </div>
          <div className="inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-xs self-start md:self-auto">
            <div className="w-2.5 h-2.5 bg-[#FF8C00] rounded-full animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-slate-600">{filteredPesanan.length} Pesanan Aktif</span>
          </div>
        </div>

        {/* SEARCH BOX */}
        {!kodePesanan && (
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/60 mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-slate-400 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode invoice atau nomor meja Anda (cth: m1)..."
              className="w-full text-sm font-semibold text-slate-700 bg-transparent outline-none placeholder-slate-400 min-h-[36px]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-xs font-bold text-slate-400 hover:text-rose-500 bg-slate-100 p-1.5 rounded-lg">Clear</button>
            )}
          </div>
        )}

        {/* EMPTY STATE */}
        {filteredPesanan.length === 0 && (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xs flex flex-col items-center">
            <span className="text-6xl mb-4">🍽️</span>
            <h3 className="text-lg font-black text-[#002366]">Tidak Ada Pesanan Aktif</h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xs font-medium">Belum ada antrean berjalan yang ditemukan atas akun ini.</p>
            <button onClick={() => navigate("/daftar-menu")} className="mt-6 bg-[#FF8C00] hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider">Pesan Sekarang</button>
          </div>
        )}

        {/* PESANAN CARDS GRID */}
        {filteredPesanan.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {filteredPesanan.map((item) => {
              const rawItems = item.items || [];
              const itemsPerPage = 3;
              const activePage = menuPage[item.id] || 1;
              const totalPages = Math.ceil(rawItems.length / itemsPerPage);
              const visibleItems = rawItems.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

              const totalAktif = rawItems.reduce((total, pItem) => {
                if (pItem.menu_habis || pItem.dihapus_admin) return total;
                return total + Number(pItem.harga || 0) * Number(pItem.qty || 0);
              }, 0);

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden h-full">
                  
                  {/* HEADER CARD */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-[11px] font-black text-slate-400 font-mono">{item.kode_pesanan}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${item.status === "menunggu_pembayaran" ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                        {item.status === "menunggu_pembayaran" ? "Menunggu Pembayaran" : "Diproses Dapur"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 mt-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Waktu Pesan</p>
                        <h4 className="text-xs font-bold text-slate-500 mt-0.5">{new Date(item.created_at).toLocaleString("id-ID")}</h4>
                      </div>
                      <span className="inline-flex items-center bg-[#002366] text-white text-sm font-black px-3 py-1.5 rounded-xl">
                        MEJA {item.nomor_meja}
                      </span>
                    </div>
                  </div>

                  {/* BODY CARD */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2.5">Daftar Menu ({rawItems.length})</p>
                      <div className="space-y-2.5 min-h-[170px]">
                        {visibleItems.map((prod, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100 text-xs font-semibold">
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="text-slate-800 font-bold block truncate">{prod.nama}</span>
                              {prod.menu_habis && (
                                <span className="inline-block mt-1 text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded">MENU HABIS</span>
                              )}
                              {prod.dihapus_admin && (
                                <span className="inline-block mt-1 text-[10px] font-black text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">MENU DIHAPUS</span>
                              )}
                              <span className="text-[11px] text-slate-400 block mt-0.5">Rp {Number(prod.harga).toLocaleString("id-ID")}</span>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-2">
                              <div className="flex items-center gap-3">
                                {item.status === "menunggu_pembayaran" && !prod.dihapus_admin ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        // LOGIKA PROTEKSI BARU:
                                        // Jika ini adalah menu terakhir di pesanan (rawItems.length === 1) DAN qty-nya tinggal 1,
                                        // atau jika qty menu ini tinggal 1, arahkan ke popup konfirmasi pembatalan/penghapusan.
                                        if (rawItems.length === 1 && Number(prod.qty) <= 1) {
                                          bukaModalKonfirmasi("batal", item.id);
                                        } else if (Number(prod.qty) <= 1) {
                                          bukaModalKonfirmasi("hapus_menu", item.id, prod.nama, prod.id);
                                        } else {
                                          updateQtyMenu(item.id, prod.id, -1);
                                        }
                                      }}
                                      className="w-6 h-6 rounded-md bg-slate-200 hover:bg-slate-300 font-black flex items-center justify-center"
                                    >
                                      -
                                    </button>
                                    <span className="w-6 text-center text-[11px] font-bold">{prod.qty}</span>
                                    <button onClick={() => updateQtyMenu(item.id, prod.id, 1)} className="w-6 h-6 rounded-md bg-slate-200 hover:bg-slate-300 font-black flex items-center justify-center">+</button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">x{prod.qty}</span>
                                )}
                                <span className="font-extrabold text-[#002366] min-w-[65px] text-right">
                                  Rp {(Number(prod.harga) * Number(prod.qty)).toLocaleString("id-ID")}
                                </span>
                              </div>

                              {item.status === "menunggu_pembayaran" && !prod.dihapus_admin && (
                                <div className="flex items-center gap-2">
                                  {prod.menu_habis && (
                                    <button onClick={() => handleGantiMenu(item)} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg">Ganti Menu</button>
                                  )}
                                  <button 
                                    onClick={() => {
                                      if (rawItems.length === 1) {
                                        bukaModalKonfirmasi("batal", item.id);
                                      } else {
                                        bukaModalKonfirmasi("hapus_menu", item.id, prod.nama, prod.id);
                                      }
                                    }} 
                                    className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* PAGINATION LOGIC */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                          <button disabled={activePage === 1} onClick={() => setMenuPage((prev) => ({ ...prev, [item.id]: activePage - 1 }))} className="p-1 rounded-lg bg-slate-50 border text-slate-500 disabled:opacity-30 flex items-center justify-center"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                          <span className="text-[11px] font-extrabold text-slate-400">Halaman {activePage} dari {totalPages}</span>
                          <button disabled={activePage === totalPages} onClick={() => setMenuPage((prev) => ({ ...prev, [item.id]: activePage + 1 }))} className="p-1 rounded-lg bg-slate-50 border text-slate-500 disabled:opacity-30 flex items-center justify-center"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
                        </div>
                      )}
                    </div>

                    {/* CARD FOOTER INFO & ACTION */}
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Metode</p>
                          <span className="text-xs font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5 block w-max">{item.metode_pembayaran || "Tunai"}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Total Tagihan</p>
                          <strong className="text-lg font-black text-[#FF8C00] block mt-0.5">
                            Rp {Number(totalAktif).toLocaleString("id-ID")}
                          </strong>
                        </div>
                      </div>

                      {/* BUTTON ACTION CONTROLLERS */}
                      <div className="flex flex-col gap-2 mt-2">
                        {item.status === "menunggu_pembayaran" && (
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={() => bukaModalKonfirmasi("batal", item.id)}
                              disabled={actionLoading === item.id}
                              type="button"
                              className="flex-1 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 font-bold text-xs text-slate-500 min-h-[44px] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              <span>Batalkan Pesanan</span>
                            </button>
                            
                            <button
                              onClick={() => handleGantiMenu(item)}
                              type="button"
                              className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-1.5 active:scale-[0.98]"
                            >
                              Ganti Menu
                            </button>
                          </div>
                        )}

                        {item.status !== "menunggu_pembayaran" && (
                          <button
                            onClick={() => handlePesanLagi(rawItems)}
                            type="button"
                            className="w-full rounded-xl bg-[#002366] hover:bg-blue-950 text-white font-black text-xs uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-1.5 active:scale-[0.98]"
                          >
                            Pesan Lagi
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusPesananPembeli;