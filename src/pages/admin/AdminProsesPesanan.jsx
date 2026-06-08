import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import toast from "react-hot-toast";

const AdminProsesPesanan = () => {
  const [pesanan, setPesanan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // SEARCH & PAGINATION
  const [search, setSearch] = useState("");
  const [menuPage, setMenuPage] = useState({});

  // STATE UNTUK OVERLAY GANTI MENU
  const [showGantiMenu, setShowGantiMenu] = useState(false);
  const [menuTersedia, setMenuTersedia] = useState([]);
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [targetPesananGanti, setTargetPesananGanti] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [menuPerPage, setMenuPerPage] = useState(8);
  const [overlayPage, setOverlayPage] = useState(1);

  // STATE UNTUK MODAL KUSTOM
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "", // 'bayar' | 'selesai' | 'batal' | 'hapus_menu' | 'hapus_overlay'
    title: "",
    message: "",
    targetId: null,
    targetMejaId: null,
    targetStatus: null,
    targetMenuId: null,
    extraData: null 
  });

  // =========================
  // FETCH DATA UTAMA
  // =========================
  const fetchPesanan = async (
      showLoading = false
    ) => {
      try {

        if (showLoading) {
          setLoading(true);
        }
      const { data: pesananData, error: pesananError } = await supabase
        .from("pesanan")
        .select(`
          *,
          guest_customer (
            access_token
          )
        `)
        .in("status", ["menunggu_pembayaran", "diproses"])
        .order("created_at", { ascending: false });

      if (pesananError) throw pesananError;

      const { data: mejaData, error: mejaError } = await supabase
        .from("meja")
        .select("*");

      if (mejaError) throw mejaError;

      const { data: menuData, error: menuError } = await supabase
        .from("menu")
        .select("id, stok, harga_biasa, harga_extra");

      if (menuError) throw menuError;

      const hasilGabung = (pesananData || []).map((p) => {
        let items = [];
        try {
          items = Array.isArray(p.items) ? p.items : JSON.parse(p.items || "[]");
        } catch {
          items = [];
        }

        const itemsDenganStatus = items.map((item) => {
          if (p.status !== "menunggu_pembayaran") {
            return { ...item, menu_habis: false };
          }

          const menuInfo = menuData.find((menu) => Number(menu.id) === Number(item.id));
          
          let isHabis = false;
          if (!menuInfo) {
            isHabis = true; 
          } else {
            const currentStok = menuInfo.stok;
            const itemVarian = item.varian || "biasa";

            if (currentStok === "kosong") {
              isHabis = true;
            } else if (itemVarian === "biasa" && currentStok === "extra_ada") {
              isHabis = true; 
            } else if (itemVarian === "extra" && currentStok === "biasa_ada") {
              isHabis = true; 
            }
            
            item.harga_extra = menuInfo.harga_extra;
            item.harga_biasa = menuInfo.harga_biasa;
          }

          return {
            ...item,
            menu_habis: isHabis
          };
        });

        const m = (mejaData || []).find((item) => Number(item.id) === Number(p.meja_id));

        return {
          ...p,
          items: itemsDenganStatus,
          nomor_meja: m ? m.nomor_meja : p.meja_id
        };
      });

      setPesanan(hasilGabung);

      let initPage = {};
      hasilGabung.forEach((item) => { initPage[item.id] = 1; });
      setMenuPage(initPage);
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengambil data pesanan");
    } finally {

      if (showLoading) {
        setLoading(false);
      }

    }
  };

  useEffect(() => {

  fetchPesanan(true);

  const channel = supabase
      .channel("realtime-proses-pesanan")
      .on("postgres_changes", { event: "*", schema: "public", table: "pesanan" }, () => {
        fetchPesanan(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "menu" }, () => {
        fetchPesanan(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "meja" }, () => {
        fetchPesanan(false);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {

  const updateMenuPerPage = () => {

    if (window.innerWidth < 768) {
      setMenuPerPage(4);
    } else {
      setMenuPerPage(8);
    }

  };

  updateMenuPerPage();

  window.addEventListener(
    "resize",
    updateMenuPerPage
  );

  return () =>
    window.removeEventListener(
      "resize",
      updateMenuPerPage
    );

}, []);

useEffect(() => {

  const markAsRead =
    async () => {

      await supabase
        .from("pesanan")
        .update({
          dilihat_admin: true
        })
        .eq(
          "dilihat_admin",
          false
        );

    };

  markAsRead();

}, []);

  // ==========================================
  // LOGIKA AMBIL MENU TERLARIS BULAN BERJALAN
  // ==========================================
  const handleGantiMenu = async (pesananItem) => {
    if (pesananItem.status !== "menunggu_pembayaran") {
      toast.error("Menu hanya dapat dimodifikasi pada status menunggu pembayaran!");
      return;
    }

    try {
      const sekarang = new Date();
      const awalBulan = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1).toISOString();
      const akhirBulan = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      const { data: dataBulanIni, error: errorBulanIni } = await supabase
        .from("pesanan")
        .select("items")
        .in("status", ["diproses", "selesai"])
        .gte("created_at", awalBulan)
        .lte("created_at", akhirBulan);

      if (errorBulanIni) throw errorBulanIni;

      const akumulasiTerjualBulanIni = {};

      (dataBulanIni || []).forEach((order) => {
        let orderItems = [];
        try {
          orderItems = Array.isArray(order.items) ? order.items : JSON.parse(order.items || "[]");
        } catch {
          orderItems = [];
        }

        orderItems.forEach((it) => {
          if (it.id) {
            const qtyItem = Number(it.qty || 0);
            akumulasiTerjualBulanIni[it.id] = (akumulasiTerjualBulanIni[it.id] || 0) + qtyItem;
          }
        });
      });

      const { data: masterMenu, error: errorMaster } = await supabase
        .from("menu")
        .select("*")
        .neq("stok", "nonaktif")
        .eq("is_aktif", true);

      if (errorMaster) throw errorMaster;

      const menuDiurutkan =
      (masterMenu || [])
      .map((m) => ({
        ...m,
        terjual_bulan_ini:
          akumulasiTerjualBulanIni[m.id] || 0,

        menu_habis:
          m.stok === "kosong"
      }))
      .sort((a, b) => {

        if (a.menu_habis && !b.menu_habis)
          return 1;

        if (!a.menu_habis && b.menu_habis)
          return -1;

        return (
          b.terjual_bulan_ini -
          a.terjual_bulan_ini
        );
      });

      const menuMasihAktif = (pesananItem.items || []).filter((item) => !item.menu_habis && !item.dihapus_admin);
      const initialSelected = menuMasihAktif.map((item) => {
        const namaBersih = item.nama.replace(/\(Extra\)/gi, "").replace(/\(Biasa\)/gi, "").trim();
        return {
          id: item.id,
          nama: namaBersih,
          harga: item.harga,
          gambar: item.gambar || item.img,
          varian: item.varian || "biasa",
          qty: item.qty
        };
      });

      const initialVariants = {};
      menuDiurutkan.forEach((menu) => {
        const hasExtra = Number(menu.harga_extra) > 0;
        if (menu.stok === "extra_ada") {
          initialVariants[menu.id] = "extra";
        } else if (menu.stok === "biasa_ada" || !hasExtra) {
          initialVariants[menu.id] = "biasa";
        } else {
          initialVariants[menu.id] = "biasa";
        }
      });

      setSelectedVariants(initialVariants);
      setTargetPesananGanti(pesananItem);
      setMenuTersedia(menuDiurutkan);
      setSelectedMenus(initialSelected);
      setOverlayPage(1);
      setShowGantiMenu(true);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat urutan menu terlaris bulan ini");
    }
  };

  const updateQtyOverlay = (menu, varian, perubahan) => {
    const harga = varian === "extra" ? Number(menu.harga_extra || 0) : Number(menu.harga_biasa || 0);

    setSelectedMenus((prev) => {
      const existing = prev.find((item) => Number(item.id) === Number(menu.id) && item.varian === varian);

      if (!existing) {
        if (perubahan < 0) return prev;
        return [
          ...prev,
          { id: menu.id, nama: menu.nama, harga, gambar: menu.img || menu.gambar, varian, qty: 1 }
        ];
      }

      const qtyBaru = existing.qty + perubahan;

      if (existing.qty === 1 && perubahan === -1) {
        bukaModalHapusOverlay(menu, varian);
        return prev; 
      }

      if (qtyBaru <= 0) {
        return prev.filter((item) => !(Number(item.id) === Number(menu.id) && item.varian === varian));
      }

      return prev.map((item) =>
        Number(item.id) === Number(menu.id) && item.varian === varian ? { ...item, qty: qtyBaru, harga } : item
      );
    });
  };

  const eksekusiHapusOverlay = (menuId, varian) => {
    setSelectedMenus((prev) => prev.filter((item) => !(Number(item.id) === Number(menuId) && item.varian === varian)));
    toast.success("Menu berhasil dihapus dari daftar");
  };

  const simpanPerubahanMenu = async () => {
    try {
      if (!targetPesananGanti) return;
      if (selectedMenus.length === 0) {
        toast.error("Daftar pesanan baru tidak boleh kosong!");
        return;
      }
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
      fetchPesanan(false);
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan perubahan menu");
    }
  };

  // LOGIKA UPDATE KUANTITAS DARI KARTU UTAMA
  const updateQtyMenu = async (pesananId, menuId, perubahan) => {
    const target = pesanan.find((p) => p.id === pesananId);
    if (!target) return;

    if (target.status !== "menunggu_pembayaran") {
      toast.error("Menu hanya dapat dimodifikasi pada status menunggu pembayaran!");
      return;
    }

    const currentItems = target.items || [];
    const itemTarget = currentItems.find((it) => it.id === menuId);
    if (!itemTarget) return;

    const menuAktif = currentItems.filter(
  item =>
    !item.menu_habis &&
    !item.dihapus_admin
);

if (
  itemTarget.qty === 1 &&
  perubahan === -1
) {

  if (menuAktif.length === 1) {

    bukaModalMenuTerakhir(
      target.id,
      target.meja_id,
      itemTarget.nama
    );

  } else {

    bukaModalHapusMenu(
      target.id,
      itemTarget.id,
      itemTarget.nama
    );

  }

  return;
}

    try {
      const updatedItems = currentItems.map((it) => {
        if (it.id === menuId) {
          return { ...it, qty: it.qty + perubahan };
        }
        return it;
      });

      const totalBaru = updatedItems.reduce((total, item) => total + Number(item.harga || 0) * Number(item.qty || 0), 0);

      const { error } = await supabase
        .from("pesanan")
        .update({ items: updatedItems, total_harga: totalBaru })
        .eq("id", pesananId);

      if (error) throw error;
      toast.success("Jumlah item berhasil diperbarui");
      fetchPesanan();
    } catch (error) {
      console.error(error);
      toast.error("Gagal memperbarui jumlah item");
    }
  };

  const bukaModalKonfirmasi = (type, id, mejaId, statusSaatIni = null) => {
    let title = ""; let message = "";
    if (type === "batal") { 
      title = "Batalkan Pesanan"; 
      message = "Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin membatalkan pesanan ini?"; 
    }
    else if (type === "bayar") { 
      title = "Konfirmasi Pembayaran"; 
      message = "Apakah Anda yakin ingin mengonfirmasi pembayaran tunai untuk pesanan ini?"; 
    }
    else if (type === "selesai") { 
      title = "Selesaikan Pesanan"; 
      message = "Pesanan selesai diproses? Meja pelanggan akan otomatis dikosongkan kembali."; 
    }

    setModalConfig({ isOpen: true, type, title, message, targetId: id, targetMejaId: mejaId, targetStatus: statusSaatIni });
  };

  const bukaModalHapusMenu = (pesananId, menuId, namaMenu) => {
    setModalConfig({ isOpen: true, type: "hapus_menu", title: "Hapus Menu", message: `Yakin ingin menghapus "${namaMenu}" dari pesanan ini?`, targetId: pesananId, targetMenuId: menuId });
  };

  const bukaModalMenuTerakhir = (
  pesananId,
  mejaId,
  namaMenu
) => {
  setModalConfig({
    isOpen: true,
    type: "batal_menu_terakhir",
    title: "Menu Terakhir",
    message:
      `"${namaMenu}" adalah menu aktif terakhir dalam pesanan ini. ` +
      "Jika dihapus, pesanan akan otomatis dibatalkan. Apakah Anda yakin?",
    targetId: pesananId,
    targetMejaId: mejaId
  });
};

  const bukaModalHapusOverlay = (menu, varian) => {
    setModalConfig({ isOpen: true, type: "hapus_overlay", title: "Hapus Pilihan Menu", message: `Apakah Anda yakin ingin menghapus "${menu.nama} (${varian})" dari daftar pesanan baru ini?`, targetId: menu.id, targetMenuId: menu.id, extraData: { menu, varian } });
  };

  const tutupModal = () => {
    setModalConfig({ isOpen: false, type: "", title: "", message: "", targetId: null, targetMejaId: null, targetStatus: null, targetMenuId: null, extraData: null });
  };

  const eksekusiAksi = async () => {
    const { type, targetId, targetMejaId, targetMenuId, extraData } = modalConfig;
    tutupModal();

    if (type === "hapus_overlay" && extraData) {
      eksekusiHapusOverlay(extraData.menu.id, extraData.varian);
      return;
    }

    try {
      setActionLoading(targetId);
      const targetPesanan = pesanan.find((p) => Number(p.id) === Number(targetId));

      if (type === "bayar") {
        if (!targetPesanan) throw new Error("Pesanan tidak ditemukan");
        const rawItems = targetPesanan.items || [];
        const itemsAktif = rawItems.filter((item) => !item.menu_habis && !item.dihapus_admin);
        const totalBaru = itemsAktif.reduce((total, item) => total + Number(item.harga || 0) * Number(item.qty || 0), 0);

        const { error } = await supabase
          .from("pesanan")
          .update({
            items: itemsAktif,
            total_harga: totalBaru,
            status: "diproses"
          })
          .eq("id", targetId);

        if (error) throw error;

        const { error: emailError } =
        await supabase.functions.invoke(
          "send-order-email",
          {
            body: {
              email:
                targetPesanan.email,

              nama_pembeli:
                targetPesanan.nama_pembeli,

              kode_pesanan:
                targetPesanan.kode_pesanan,

              nomor_meja:
                targetPesanan.nomor_meja,

              total_harga:
                totalBaru,

              items:
                itemsAktif,

              access_token:
                targetPesanan
                  ?.guest_customer
                  ?.access_token || ""
            }
          }
        );

        console.log("EMAIL ERROR:", emailError);

      if (emailError) {
        console.error(
          "EMAIL ERROR:",
          emailError
        );
      }

        console.log(targetPesanan);

        toast.success(
          "Pembayaran berhasil dikonfirmasi!"
        );

      } else if (type === "hapus_menu") {
        if (!targetPesanan) throw new Error("Pesanan tidak ditemukan");
        const rawItems = targetPesanan.items || [];
        const updatedItems = rawItems.filter((item) => Number(item.id) !== Number(targetMenuId));

        if (updatedItems.length === 0) {
          await supabase.from("pesanan").update({ status: "dibatalkan", alasan_pembatalan: "Dibatalkan oleh admin (Semua menu dihapus)", dibatalkan_pada: new Date() }).eq("id", targetId);
          if (targetPesanan.meja_id) await supabase.from("meja").update({ status: "tersedia" }).eq("id", targetPesanan.meja_id);
          toast.success("Menu kosong, pesanan otomatis dibatalkan!");
        } else {
          const totalBaru = updatedItems.reduce((total, item) => total + Number(item.harga || 0) * Number(item.qty || 0), 0);
          await supabase.from("pesanan").update({ items: updatedItems, total_harga: totalBaru }).eq("id", targetId);
          toast.success("Menu berhasil dihapus");
        }
      } else if (type === "selesai") {
        await supabase.from("pesanan").update({ status: "selesai" }).eq("id", targetId);
        if (targetMejaId) await supabase.from("meja").update({ status: "tersedia" }).eq("id", targetMejaId);
        toast.success("Pesanan selesai & meja dikosongkan!");
      }else if (type === "batal_menu_terakhir") {

  await supabase
    .from("pesanan")
    .update({
      status: "dibatalkan",
      alasan_pembatalan:
        "Dibatalkan oleh admin (menu terakhir dihapus)",
      dibatalkan_pada: new Date()
    })
    .eq("id", targetId);

  if (targetMejaId) {
    await supabase
      .from("meja")
      .update({
        status: "tersedia"
      })
      .eq("id", targetMejaId);
  }

  toast.success(
    "Pesanan dibatalkan karena menu terakhir dihapus"
  );
} 
      
      else if (type === "batal") {
        await supabase.from("pesanan").update({ status: "dibatalkan", alasan_pembatalan: "Dibatalkan oleh admin", dibatalkan_pada: new Date() }).eq("id", targetId);
        if (targetMejaId) await supabase.from("meja").update({ status: "tersedia" }).eq("id", targetMejaId);
        toast.success("Pesanan berhasil dibatalkan");
      }
      fetchPesanan();
    } catch (error) {
      console.error(error);
      toast.error("Gagal memproses tindakan");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPesanan = pesanan.filter((item) => {
    const keyword = search.toLowerCase().trim();
    return item.nama_pembeli?.toLowerCase().includes(keyword) || item.kode_pesanan?.toLowerCase().includes(keyword) || `m${String(item.nomor_meja)}`.toLowerCase().includes(keyword);
  });

    const keyword = search.toLowerCase().trim();
    const startIndex =
      (overlayPage - 1) *
      menuPerPage;

    const visibleMenuOverlay =
      menuTersedia.slice(
        startIndex,
        startIndex + menuPerPage
      );

    const totalOverlayPages =
      Math.ceil(
        menuTersedia.length /
        menuPerPage
      );

  return (
    <div className="p-3 sm:p-6 md:p-8 lg:p-10 bg-slate-50 min-h-screen text-slate-800 antialiased relative">
      
      {/* CUSTOM MODAL */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={tutupModal} />
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 max-w-md w-full relative z-10">
            <div className="flex items-center gap-3 mb-3">
              {["batal", "hapus_menu", "hapus_overlay"].includes(modalConfig.type) ? (
                <div className="w-10 h-10 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
              ) : (
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-[#002366] rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              )}
              <h3 className="text-lg font-black text-slate-900">{modalConfig.title}</h3>
            </div>
            <p className="text-sm font-semibold text-slate-500 leading-relaxed mb-6">{modalConfig.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={tutupModal} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50">Kembali</button>
              <button
                onClick={eksekusiAksi}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white ${
                  [
                    "batal",
                    "hapus_menu",
                    "hapus_overlay",
                    "batal_menu_terakhir"
                  ].includes(modalConfig.type)
                    ? "bg-rose-600 hover:bg-rose-700"
                    : modalConfig.type === "bayar"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY GANTI MENU */}
      {showGantiMenu && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm">
          <div className="h-screen overflow-y-auto">
            <div className="min-h-screen p-4 md:p-8 flex items-start justify-center">
              <div className="w-full max-w-7xl bg-white rounded-3xl p-6 mt-6 mb-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-[#002366]">Ganti Menu Pesanan</h2>
                    <p className="text-xs text-orange-500 font-bold mt-1">Diurutkan berdasarkan penjualan paling laris di bulan berjalan ini</p>
                  </div>
                  <button onClick={() => setShowGantiMenu(false)} className="font-bold text-xl hover:text-rose-600 p-2">✕</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {visibleMenuOverlay.map((menu) => {
                    const currentVariant = selectedVariants[menu.id] || "biasa";
                    const activeHarga = currentVariant === "extra" ? Number(menu.harga_extra || 0) : Number(menu.harga_biasa || 0);
                    const hasExtra = Number(menu.harga_extra) > 0;
                    
                    const isVariantDisabled = 
                      menu.stok === "kosong" ||
                      (currentVariant === "biasa" && menu.stok === "extra_ada") ||
                      (currentVariant === "extra" && menu.stok === "biasa_ada");

                    const selected = selectedMenus.find((x) => Number(x.id) === Number(menu.id) && x.varian === currentVariant);
                    const qty = selected?.qty || 0;

                    return (
                      <div key={menu.id} className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all relative">
                        <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-md font-bold z-10">
                          Bulan Ini: {menu.terjual_bulan_ini} terjual
                        </div>
                        <img src={menu.img || menu.gambar} alt={menu.nama} className="w-full h-40 object-cover" />
                        <div className="p-4">
                          <h3 className="font-black text-[#002366] truncate capitalize">{menu.nama}</h3>
                          <p className="text-[#FF8C00] font-black text-xl mt-2">Rp {activeHarga.toLocaleString("id-ID")}</p>
                          
                          {hasExtra && (
                            <div className="flex gap-2 mt-3">
                              <button
                                type="button"
                                disabled={menu.stok === "extra_ada"}
                                onClick={() =>
                                  setSelectedVariants(prev => ({
                                    ...prev,
                                    [menu.id]: "biasa"
                                  }))
                                }
                                className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                                  menu.stok === "extra_ada"
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : currentVariant === "biasa"
                                    ? "bg-[#002366] text-white"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                Biasa
                              </button>

                              <button
                                type="button"
                                disabled={menu.stok === "biasa_ada"}
                                onClick={() =>
                                  setSelectedVariants(prev => ({
                                    ...prev,
                                    [menu.id]: "extra"
                                  }))
                                }
                                className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                                  menu.stok === "biasa_ada"
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : currentVariant === "extra"
                                    ? "bg-red-500 text-white"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                Extra
                              </button>
                            </div>
                          )}

                          <div className="mt-4">
                            {isVariantDisabled ? (
                              <span className="text-center block w-full py-2 bg-red-50 text-red-600 font-black text-xs rounded-xl border border-red-100">MENU HABIS</span>
                            ) : qty === 0 ? (
                              <button onClick={() => updateQtyOverlay(menu, currentVariant, 1)} className="w-full py-2.5 bg-[#002366] text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-blue-900 transition-all flex items-center justify-center gap-1">+ Tambah Pesanan</button>
                            ) : (
                              <div className="flex items-center justify-between">
                                <button onClick={() => updateQtyOverlay(menu, currentVariant, -1)} className="w-10 h-10 rounded-xl bg-slate-200 font-black hover:bg-slate-300 transition-colors">-</button>
                                <span className="font-black text-xl">{qty}</span>
                                <button onClick={() => updateQtyOverlay(menu, currentVariant, 1)} className="w-10 h-10 rounded-xl bg-[#002366] text-white font-black hover:bg-blue-900 transition-colors">+</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalOverlayPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">

                    <button
                      disabled={overlayPage === 1}
                      onClick={() =>
                        setOverlayPage(
                          overlayPage - 1
                        )
                      }
                      className="
                        px-3 py-2
                        rounded-lg
                        border
                        disabled:opacity-40
                      "
                    >
                      ◀
                    </button>

                    <span className="font-bold text-sm">
                      {overlayPage} / {totalOverlayPages}
                    </span>

                    <button
                      disabled={
                        overlayPage === totalOverlayPages
                      }
                      onClick={() =>
                        setOverlayPage(
                          overlayPage + 1
                        )
                      }
                      className="
                        px-3 py-2
                        rounded-lg
                        border
                        disabled:opacity-40
                      "
                    >
                      ▶
                    </button>

                  </div>
                )}

                <div className="flex justify-end gap-3 mt-8 border-t pt-4">

                  <button
                    onClick={() => setShowGantiMenu(false)}
                    className="
                      px-5 py-3
                      border
                      rounded-xl
                      font-bold
                      text-slate-500
                      hover:bg-slate-50
                    "
                  >
                    Batal
                  </button>

                  <button
                    onClick={simpanPerubahanMenu}
                    className="
                      px-5 py-3
                      rounded-xl
                      bg-[#FF8C00]
                      hover:bg-orange-600
                      text-white
                      font-black
                    "
                  >
                    Simpan Perubahan
                  </button>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      

      {/* DAFTAR UTAMA KARTU PESANAN */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#002366] tracking-tight">Pesanan <span className="text-[#FF8C00]">Masuk</span></h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">Kelola pesanan yang masuk.</p>
          </div>
          <div className="inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="w-2.5 h-2.5 bg-[#FF8C00] rounded-full animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-slate-600">{filteredPesanan.length} Pesanan Aktif</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/60 mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-slate-400 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kode pesanan atau nomor meja Anda (cth: m1)" className="w-full text-sm font-semibold text-slate-700 bg-transparent outline-none" />
        </div>

        {!loading && filteredPesanan.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {filteredPesanan.map((item) => {
              const rawItems = item.items || [];

              console.log(
                "PESANAN",
                item.kode_pesanan
              );

              console.log(
                "ITEMS",
                rawItems
              );
              const menuAktif = rawItems.filter(
                (menu) =>
                  !menu.menu_habis &&
                  !menu.dihapus_admin
              );
              const itemsPerPage = 3;
              const activePage = menuPage[item.id] || 1;
              const totalPages = Math.ceil(rawItems.length / itemsPerPage);
              const visibleItems = rawItems.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
              const totalAktif = rawItems.reduce(
              (total, pItem) => {

                if (pItem.menu_habis) {
                  return total;
                }

                if (pItem.dihapus_admin) {
                  return total;
                }

                return (
                  total +
                  Number(pItem.harga || 0) *
                  Number(pItem.qty || 0)
                );

              },
              0
            );

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden h-full">
                  <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-[11px] font-black text-slate-400 font-mono">{item.kode_pesanan}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${item.status === "menunggu_pembayaran" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-indigo-50 text-indigo-700 border-indigo-100"}`}>{item.status === "menunggu_pembayaran" ? "Belum Bayar" : "Diproses"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2 mt-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Pelanggan</p>
                        <h4 className="text-base font-black text-[#002366] truncate mt-0.5">{item.nama_pembeli}</h4>
                      </div>
                      <span className="inline-flex items-center bg-[#002366] text-white text-sm font-black px-3 py-1.5 rounded-xl">MEJA {item.nomor_meja}</span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2.5">Daftar Menu ({rawItems.length})</p>
                      <div className="space-y-2.5 min-h-[170px]">
                        {visibleItems.map((prod) => (
                        <div
                          key={`${prod.id}-${prod.varian || "default"}`} className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100 text-xs font-semibold">
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="text-slate-800 font-bold block truncate capitalize">
                                {prod.nama}
                                {(() => {
                                  if (prod.harga_extra && Number(prod.harga_extra) > 0) {
                                    return <span className="text-[10px] text-slate-400 font-mono ml-1">({prod.varian || "biasa"})</span>;
                                  }
                                  return null;
                                })()}
                              </span>
                              {prod.menu_habis && <span className="inline-block mt-1 text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded animate-pulse">MENU HABIS</span>}
                              <span className="text-[11px] text-slate-400 block mt-0.5">Rp {Number(prod.harga).toLocaleString("id-ID")}</span>
                            </div>
                            
                            <div className="shrink-0 flex flex-col items-end gap-2">
                              <div className="flex items-center gap-3">
                                {item.status === "menunggu_pembayaran" && !prod.menu_habis ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => updateQtyMenu(item.id, prod.id, -1)} className="w-6 h-6 rounded-md bg-slate-200 font-black">-</button>
                                    <span className="w-6 text-center text-[11px] font-bold">{prod.qty}</span>
                                    <button onClick={() => updateQtyMenu(item.id, prod.id, 1)} className="w-6 h-6 rounded-md bg-slate-200 font-black">+</button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">x{prod.qty}</span>
                                )}
                                <span className="font-extrabold text-[#002366] min-w-[65px] text-right">Rp {(Number(prod.harga) * Number(prod.qty)).toLocaleString("id-ID")}</span>
                              </div>
                                {item.status === "menunggu_pembayaran" &&
                                !prod.dihapus_admin && (
                                  <div className="flex items-center gap-2">

                                    {prod.menu_habis && (
                                      <button
                                        onClick={() => handleGantiMenu(item)}
                                        className="
                                          bg-blue-600
                                          hover:bg-blue-700
                                          text-white
                                          text-[10px]
                                          font-bold
                                          px-2 py-1
                                          rounded-lg
                                        "
                                      >
                                        Ganti Menu
                                      </button>
                                    )}

                                    <button
                                        onClick={() =>
                                          menuAktif.length === 1
                                            ? bukaModalMenuTerakhir(
                                                item.id,
                                                item.meja_id,
                                                prod.nama
                                              )
                                            : bukaModalHapusMenu(
                                                item.id,
                                                prod.id,
                                                prod.nama
                                              )
                                        }
                                      className="
                                        bg-red-600
                                        hover:bg-red-700
                                        text-white
                                        text-[10px]
                                        font-bold
                                        px-2 py-1
                                        rounded-lg
                                      "
                                    >
                                      Hapus
                                    </button>

                                  </div>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                          <button disabled={activePage === 1} onClick={() => setMenuPage((prev) => ({ ...prev, [item.id]: activePage - 1 }))} className="p-1 rounded-lg bg-slate-50 border text-slate-500 disabled:opacity-30">◀</button>
                          <span className="text-[11px] font-extrabold text-slate-400">Halaman {activePage} dari {totalPages}</span>
                          <button disabled={activePage === totalPages} onClick={() => setMenuPage((prev) => ({ ...prev, [item.id]: activePage + 1 }))} className="p-1 rounded-lg bg-slate-50 border text-slate-500 disabled:opacity-30">▶</button>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Metode</p>
                          <span className="text-xs font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5 block">{item.metode_pembayaran || "Tunai"}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Total Tagihan</p>
                          <strong className="text-lg font-black text-[#FF8C00] block mt-0.5">Rp {Number(totalAktif).toLocaleString("id-ID")}</strong>
                        </div>
                      </div>

                      <div className="flex flex-col xl:flex-row gap-2 mt-2 w-full">
                        {item.status === "menunggu_pembayaran" && (
                          <div className="grid grid-cols-2 gap-2 w-full xl:flex xl:flex-1">
                            <button onClick={() => bukaModalKonfirmasi("batal", item.id, item.meja_id, item.status)} className="px-3 py-3 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 font-bold text-xs text-slate-500 min-h-[44px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"><span>Batal</span></button>
                            <button onClick={() => handleGantiMenu(item)} className="px-3 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"><span>Ganti Menu</span></button>
                          </div>
                        )}
                        {item.status === "menunggu_pembayaran" && (
                          <button onClick={() => bukaModalKonfirmasi("bayar", item.id, item.meja_id)} disabled={actionLoading === item.id} className="w-full xl:flex-1 py-3 rounded-xl bg-[#002366] hover:bg-blue-900 text-white font-black text-xs uppercase tracking-wider min-h-[44px] flex items-center justify-center shadow-sm shadow-blue-900/10 transition-all">{actionLoading === item.id ? "Memproses..." : "Konfirmasi Bayar"}</button>
                        )}
                        {item.status === "diproses" && (
                          <button onClick={() => bukaModalKonfirmasi("selesai", item.id, item.meja_id)} disabled={actionLoading === item.id} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider min-h-[44px] flex items-center justify-center shadow-md shadow-emerald-600/10 transition-all">{actionLoading === item.id ? "Memproses..." : "Selesaikan Pesanan"}</button>
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

export default AdminProsesPesanan;