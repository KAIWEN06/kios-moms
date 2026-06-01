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

  // STATE UNTUK MODAL KUSTOM
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "", // 'bayar' | 'selesai' | 'batal' | 'hapus_menu'
    title: "",
    message: "",
    targetId: null,
    targetMejaId: null,
    targetStatus: null,
    targetMenuId: null
  });

  // =========================
  // FETCH DATA
  // =========================
  const fetchPesanan = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pesanan")
        .select("*, meja:meja_id(nomor_meja)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPesanan(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengambil data pesanan");
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuTersedia = async () => {
    try {
      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .neq("stok", "nonaktif");
      if (error) throw error;
      setMenuTersedia(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  // =========================
  // REALTIME SUBSCRIPTION
  // =========================
  useEffect(() => {
    fetchPesanan();
    fetchMenuTersedia();

    const channel = supabase
      .channel("realtime-admin-proses")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pesanan" },
        () => {
          fetchPesanan();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =========================
  // LOGIKA MODAL KUSTOM
  // =========================
  const bukaModalKonfirmasi = (statusType, id, mejaId, itemMenuId = null) => {
    let title = "";
    let message = "";
    let targetStatus = null;

    if (statusType === "diproses") {
      title = "Konfirmasi Pembayaran";
      message = "Apakah Anda yakin pelanggan ini sudah membayar dan pesanan siap diproses?";
      targetStatus = "diproses";
    } else if (statusType === "selesai") {
      title = "Selesaikan Pesanan";
      message = "Apakah pesanan ini sudah selesai dihidangkan dan meja kosong kembali?";
      targetStatus = "selesai";
    } else if (statusType === "batal") {
      title = "Batalkan Pesanan";
      message = "Apakah Anda yakin ingin membatalkan pesanan ini? Tindakan ini tidak dapat diurungkan.";
      targetStatus = "batal";
    } else if (statusType === "hapus_menu") {
      title = "Hapus Menu dari Pesanan";
      message = "Apakah Anda yakin ingin menghapus menu ini dari daftar pesanan?";
    }

    setModalConfig({
      isOpen: true,
      type: statusType,
      title,
      message,
      targetId: id,
      targetMejaId: mejaId,
      targetStatus,
      targetMenuId: itemMenuId
    });
  };

  // =========================
  // EKSEKUSI STATUS & KIRIM EMAIL
  // =========================
  const eksekusiStatus = async () => {
    const { type, targetId, targetMejaId, targetStatus, targetMenuId } = modalConfig;

    setModalConfig((prev) => ({ ...prev, isOpen: false }));
    setActionLoading(targetId);

    try {
      if (type === "hapus_menu") {
        const { data: pesananSkrg, error: errGet } = await supabase
          .from("pesanan")
          .select("items")
          .eq("id", targetId)
          .single();

        if (errGet) throw errGet;

        const itemsBaru = pesananSkrg.items.filter((i) => i.id !== targetMenuId);

        if (itemsBaru.length === 0) {
          const { error: errDel } = await supabase
            .from("pesanan")
            .delete()
            .eq("id", targetId);
          if (errDel) throw errDel;

          await supabase
            .from("meja")
            .update({ status: "kosong" })
            .eq("id", targetMejaId);

          toast.success("Pesanan kosong, otomatis dihapus");
        } else {
          const totalBaru = itemsBaru.reduce((acc, curr) => acc + curr.harga * curr.qty, 0);
          const { error: errUpd } = await supabase
            .from("pesanan")
            .update({ items: itemsBaru, total_harga: totalBaru })
            .eq("id", targetId);
          if (errUpd) throw errUpd;

          toast.success("Menu berhasil dihapus dari pesanan");
        }
      } else {
        // 1. CARI DATA PESANAN YANG AKAN DIPROSES DARI STATE AKTIF
        const dataPesananTarget = pesanan.find((p) => p.id === targetId);

        // 2. UPDATE STATUS PESANAN DI DATABASE
        const { error: errStatus } = await supabase
          .from("pesanan")
          .update({ status: targetStatus })
          .eq("id", targetId);

        if (errStatus) throw errStatus;

        // JIKA SELESAI ATAU BATAL, KOSONGKAN MEJA KEMBALI
        if (targetStatus === "batal" || targetStatus === "selesai") {
          await supabase
            .from("meja")
            .update({ status: "kosong" })
            .eq("id", targetMejaId);
        }

        toast.success(`Pesanan berhasil diperbarui ke: ${targetStatus}`);

        // 3. TRIGGER PENGIRIMAN EMAIL MENGGUNAKAN DATA TARGET YANG VALID
        if (targetStatus === "diproses" && dataPesananTarget && dataPesananTarget.email) {
          try {
            // FIX: DISESUAIKAN KE "send-order-email" AGAR COCOK DENGAN DASHBOARD SUPABASE
            await supabase.functions.invoke("send-order-email", {
              body: {
                email: dataPesananTarget.email,
                nama_pembeli: dataPesananTarget.nama_pembeli || "Pelanggan Kios Moms",
                kode_pesanan: dataPesananTarget.kode_pesanan || `KM-${dataPesananTarget.id}`,
                nomor_meja: dataPesananTarget.meja?.nomor_meja || targetMejaId,
                total_harga: dataPesananTarget.total_harga,
                items: dataPesananTarget.items
              }
            });
            console.log("Request email berhasil dikirim ke antrean server.");
          } catch (emailErr) {
            console.error("Gagal memicu fungsi pengiriman email:", emailErr);
          }
        }
      }

      fetchPesanan();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Gagal memproses aksi");
    } finally {
      setActionLoading(null);
    }
  };

  // =========================
  // LOGIKA OVERLAY GANTI MENU
  // =========================
  const bukaGantiMenu = (item) => {
    setTargetPesananGanti(item);
    setSelectedMenus(item.items || []);
    setShowGantiMenu(true);
  };

  const handleQtySelected = (menuId, delta) => {
    setSelectedMenus((prev) => {
      const eksis = prev.find((i) => i.id === menuId);
      if (eksis) {
        return prev
          .map((i) => (i.id === menuId ? { ...i, qty: i.qty + delta } : i))
          .filter((i) => i.qty > 0);
      } else {
        if (delta <= 0) return prev;
        const infoMenu = menuTersedia.find((m) => m.id === menuId);
        if (!infoMenu) return prev;
        return [
          ...prev,
          {
            id: infoMenu.id,
            nama: infoMenu.nama,
            harga: infoMenu.harga,
            img: infoMenu.img,
            qty: 1
          }
        ];
      }
    });
  };

  const simpanPerubahanMenu = async () => {
    if (!targetPesananGanti) return;
    try {
      if (selectedMenus.length === 0) {
        const { error: errDel } = await supabase
          .from("pesanan")
          .delete()
          .eq("id", targetPesananGanti.id);
        if (errDel) throw errDel;

        await supabase
          .from("meja")
          .update({ status: "kosong" })
          .eq("id", targetPesananGanti.meja_id);

        toast.success("Pesanan kosong, otomatis dihapus");
      } else {
        const totalBaru = selectedMenus.reduce((acc, curr) => acc + curr.harga * curr.qty, 0);
        const { error: errUpd } = await supabase
          .from("pesanan")
          .update({ items: selectedMenus, total_harga: totalBaru })
          .eq("id", targetPesananGanti.id);
        if (errUpd) throw errUpd;

        toast.success("Daftar pesanan berhasil diperbarui");
      }
      setShowGantiMenu(false);
      fetchPesanan();
    } catch (error) {
      console.error(error);
      toast.error("Gagal memperbarui menu pesanan");
    }
  };

  // =========================
  // PAGINATION INTERNAL FILTER
  // =========================
  const handleMenuPage = (pesananId, maxTotal, delta) => {
    setMenuPage((prev) => {
      const curr = prev[pesananId] || 1;
      let next = curr + delta;
      if (next < 1) next = 1;
      if (next > maxTotal) next = maxTotal;
      return { ...prev, [pesananId]: next };
    });
  };

  // =========================
  // FILTERING CARDS
  // =========================
  const filteredPesanan = pesanan.filter((item) => {
    const s = search.toLowerCase();
    const namaMatch = (item.nama_pembeli || "").toLowerCase().includes(s);
    const kodeMatch = (item.kode_pesanan || "").toLowerCase().includes(s);
    const mejaMatch = String(item.meja?.nomor_meja || item.meja_id || "").includes(s);
    const statusMatch = (item.status || "").toLowerCase().includes(s);
    return namaMatch || kodeMatch || mejaMatch || statusMatch;
  });

  return (
    <div className="p-4 md:p-10 bg-[#f0f2f5] min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 max-w-7xl mx-auto">
        <div>
          <h2 className="text-3xl font-black text-[#002366]">
            Alur <span className="text-[#FF8C00]">Proses Pesanan</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Pantau dan kelola pesanan masuk pembeli secara real-time
          </p>
        </div>

        {/* BAR PENCARIAN */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kode, meja, status..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#002366] transition-all shadow-xs"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* BODY UTAMA CARDS CONTAINER */}
      <div className="max-w-7xl mx-auto">
        {loading && pesanan.length === 0 ? (
          <div className="text-center py-20 font-black text-[#002366] tracking-wide animate-pulse">
            MEMUAT DATA PESANAN...
          </div>
        ) : filteredPesanan.length === 0 ? (
          <div className="text-center bg-white rounded-3xl py-16 border border-slate-100 font-bold text-slate-400 text-sm shadow-xs">
            {search ? "Hasil pencarian tidak ditemukan" : "Belum ada pesanan masuk saat ini"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            {filteredPesanan.map((item) => {
              const itemsList = item.items || [];
              const itemsPerPage = 2;
              const maxPage = Math.ceil(itemsList.length / itemsPerPage) || 1;
              const currPage = menuPage[item.id] || 1;
              const startIdx = (currPage - 1) * itemsPerPage;
              const visibleItems = itemsList.slice(startIdx, startIdx + itemsPerPage);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[32px] border border-slate-200/60 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* CARD HEADER */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
                    <div className="truncate">
                      <span className="text-[10px] font-mono tracking-widest uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                        {item.kode_pesanan || `KM-${item.id}`}
                      </span>
                      <h4 className="font-black text-[#002366] text-base truncate mt-1">
                        {item.nama_pembeli || "Pelanggan Kios Moms"}
                      </h4>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs font-black bg-[#002366] text-white px-3 py-1 rounded-xl shadow-xs">
                        Meja {item.meja?.nomor_meja || item.meja_id}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          item.status === "menunggu"
                            ? "bg-amber-50 text-amber-600 border-amber-200"
                            : item.status === "diproses"
                            ? "bg-blue-50 text-blue-600 border-blue-200"
                            : item.status === "selesai"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : "bg-rose-50 text-rose-600 border-rose-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* LIST MENU */}
                  <div className="p-5 flex-1 flex flex-col justify-between min-h-[220px]">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Daftar Menu ({itemsList.length})
                        </span>
                        {item.status === "menunggu" && (
                          <button
                            onClick={() => bukaGantiMenu(item)}
                            type="button"
                            className="text-xs font-black text-[#FF8C00] hover:text-orange-600 flex items-center gap-1 transition-colors"
                          >
                            Ganti Menu
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {visibleItems.map((menuItem) => (
                          <div
                            key={menuItem.id}
                            className="flex items-center justify-between gap-3 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 relative group/item"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <img
                                src={menuItem.img}
                                alt={menuItem.nama}
                                className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-200/40"
                              />
                              <div className="truncate">
                                <h5 className="font-extrabold text-slate-700 text-xs truncate">
                                  {menuItem.nama}
                                </h5>
                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                                  Rp {Number(menuItem.harga).toLocaleString()} × {menuItem.qty}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-black text-[#002366]">
                                Rp {Number(menuItem.harga * menuItem.qty).toLocaleString()}
                              </span>
                              {item.status === "menunggu" && (
                                <button
                                  onClick={() =>
                                    bukaModalKonfirmasi("hapus_menu", item.id, item.meja_id, menuItem.id)
                                  }
                                  type="button"
                                  className="w-6 h-6 rounded-md bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white font-bold text-xs transition-colors flex items-center justify-center opacity-0 group-hover/item:opacity-100 focus:opacity-100"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* PAGINATION INTERNAL CARDS */}
                      {maxPage > 1 && (
                        <div className="flex items-center justify-end gap-2 mt-3.5 border-t border-slate-100/70 pt-2">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">
                            Halaman {currPage}/{maxPage}
                          </span>
                          <button
                            disabled={currPage === 1}
                            onClick={() => handleMenuPage(item.id, maxPage, -1)}
                            type="button"
                            className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 disabled:opacity-30 transition-all"
                          >
                            ‹
                          </button>
                          <button
                            disabled={currPage === maxPage}
                            onClick={() => handleMenuPage(item.id, maxPage, 1)}
                            type="button"
                            className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 disabled:opacity-30 transition-all"
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </div>

                    {/* TOTAL & TOMBOL AKSI */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                          Metode: {item.metode_pembayaran || "Tunai"}
                        </span>
                        <span className="font-black text-lg text-[#FF8C00]">
                          Rp {Number(item.total_harga).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex gap-2 w-full xl:w-auto shrink-0">
                        {item.status === "menunggu" && (
                          <>
                            <button
                              onClick={() => bukaModalKonfirmasi("batal", item.id, item.meja_id)}
                              disabled={actionLoading === item.id}
                              type="button"
                              className="px-3 py-3 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100 text-slate-500 font-bold text-xs min-h-[44px] transition-all"
                            >
                              Tolak
                            </button>

                            <button
                              onClick={() => bukaModalKonfirmasi("diproses", item.id, item.meja_id)}
                              disabled={actionLoading === item.id}
                              type="button"
                              className="w-full xl:flex-1 py-3 rounded-xl bg-[#002366] hover:bg-blue-900 text-white font-black text-xs uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50 transition-all px-4 text-center whitespace-normal break-words shadow-sm shadow-blue-900/10"
                            >
                              {actionLoading === item.id ? "Memproses..." : "Konfirmasi Bayar"}
                            </button>
                          </>
                        )}

                        {item.status === "diproses" && (
                          <button
                            onClick={() => bukaModalKonfirmasi("selesai", item.id, item.meja_id)}
                            disabled={actionLoading === item.id}
                            type="button"
                            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-1.5 text-center shadow-md shadow-emerald-600/10"
                          >
                            {actionLoading === item.id ? "Memproses..." : "Selesaikan Pesanan"}
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

      {/* OVERLAY / MODAL POPUP GANTI MENU */}
      {showGantiMenu && targetPesananGanti && (
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-[fadeIn_.2s_ease]">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="text-xl font-black text-[#002366]">Sesuaikan Menu Pesanan</h3>
                <p className="text-xs text-slate-400 font-medium">Ubah kuantitas atau tambahkan menu baru pengganti</p>
              </div>
              <button
                onClick={() => setShowGantiMenu(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-500 hover:text-white font-black transition-all flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* LIST UTAMA KIOS MENU */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 py-1">
              {menuTersedia.map((m) => {
                const itemDipilih = selectedMenus.find((i) => i.id === m.id);
                const qty = itemDipilih ? itemDipilih.qty : 0;

                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-3 border rounded-2xl transition-all ${
                      qty > 0 ? "border-[#FF8C00] bg-orange-50/10" : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-4 truncate">
                      <img src={m.img} alt={m.nama} className="w-14 h-14 object-cover rounded-xl border border-slate-100" />
                      <div className="truncate">
                        <h5 className="font-black text-slate-700 text-sm truncate">{m.nama}</h5>
                        <p className="text-xs text-[#FF8C00] font-black mt-0.5">Rp {Number(m.harga).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* CONTROLLER QUANTITY */}
                    <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border shrink-0">
                      <button
                        onClick={() => handleQtySelected(m.id, -1)}
                        type="button"
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 shadow-xs font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center active:scale-95"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-black text-sm text-[#002366]">{qty}</span>
                      <button
                        onClick={() => handleQtySelected(m.id, 1)}
                        type="button"
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 shadow-xs font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ACTION MODAL FOOTER */}
            <div className="border-t pt-4 mt-4 flex gap-3">
              <button
                onClick={() => setShowGantiMenu(false)}
                type="button"
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-sm text-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={simpanPerubahanMenu}
                type="button"
                className="flex-1 py-3.5 bg-[#FF8C00] hover:bg-orange-600 text-white rounded-2xl font-black text-sm transition-all shadow-sm shadow-orange-500/10"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL MODAL DIALOG KUSTOM (KONFIRMASI AKSI) */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease]">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl text-center">
            <div
              className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center font-black text-xl mb-4 ${
                modalConfig.type === "batal" || modalConfig.type === "hapus_menu"
                  ? "bg-rose-50 text-rose-500"
                  : modalConfig.type === "selesai"
                  ? "bg-emerald-50 text-emerald-500"
                  : "bg-blue-50 text-[#002366]"
              }`}
            >
              {modalConfig.type === "batal" || modalConfig.type === "hapus_menu" ? "!" : "✓"}
            </div>

            <h3 className="text-xl font-black text-[#002366] mb-2">{modalConfig.title}</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">{modalConfig.message}</p>

            <div className="flex gap-3">
              <button
                onClick={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
                type="button"
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-xs text-slate-600 transition-colors"
              >
                Kembali
              </button>
              <button
                onClick={eksekusiStatus}
                type="button"
                className={`flex-1 py-3 text-white rounded-2xl font-black text-xs transition-all shadow-xs ${
                  modalConfig.type === "batal" || modalConfig.type === "hapus_menu"
                    ? "bg-rose-500 hover:bg-rose-600"
                    : modalConfig.type === "selesai"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-[#002366] hover:bg-blue-900"
                }`}
              >
                Ya, Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProsesPesanan;