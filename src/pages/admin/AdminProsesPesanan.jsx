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

  // STATE UNTUK MODAL KUSTOM
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "", // 'bayar' | 'selesai' | 'batal'
    title: "",
    message: "",
    targetId: null,
    targetMejaId: null,
    targetStatus: null
  });

  // =========================
  // FETCH DATA
  // =========================
  const fetchPesanan = async () => {
    try {
      setLoading(true);
      const { data: pesananData, error: pesananError } = await supabase
        .from("pesanan")
        .select("*")
        .in("status", ["menunggu_pembayaran", "diproses"])
        .order("created_at", { ascending: false });

      if (pesananError) throw pesananError;

      const { data: mejaData, error: mejaError } = await supabase
        .from("meja")
        .select("*");

      if (mejaError) throw mejaError;

      const hasilGabung = (pesananData || []).map((p) => {
        const m = (mejaData || []).find((item) => Number(item.id) === Number(p.meja_id));
        return { ...p, nomor_meja: m ? m.nomor_meja : p.meja_id };
      });

      setPesanan(hasilGabung);

      let initPage = {};
      hasilGabung.forEach((item) => { initPage[item.id] = 1; });
      setMenuPage(initPage);
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengambil data pesanan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPesanan();
    const channel = supabase
      .channel("realtime-proses-pesanan")
      .on("postgres_changes", { event: "*", schema: "public", table: "pesanan" }, () => {
        fetchPesanan();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // =========================
  // TRIGGER MODAL OPENER
  // =========================
  const bukaModalKonfirmasi = (type, id, mejaId, statusSaatIni = null) => {
    let title = "";
    let message = "";

    if (type === "bayar") {
      title = "Konfirmasi Pembayaran";
      message = "Apakah Anda yakin ingin mengonfirmasi pembayaran tunai untuk pesanan ini?";
    } else if (type === "selesai") {
      title = "Selesaikan Pesanan";
      message = "Pesanan selesai diracik? Meja pelanggan akan otomatis dikosongkan kembali.";
    } else if (type === "batal") {
      if (statusSaatIni !== "menunggu_pembayaran") {
        toast.error("Pesanan yang sedang diproses tidak dapat dibatalkan!");
        return;
      }
      title = "Batalkan Pesanan";
      message = "Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin membatalkan pesanan ini?";
    }

    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      targetId: id,
      targetMejaId: mejaId,
      targetStatus: statusSaatIni
    });
  };

  const tutupModal = () => {
    setModalConfig({ isOpen: false, type: "", title: "", message: "", targetId: null, targetMejaId: null, targetStatus: null });
  };

  // =========================
  // EXECUTE ACTIONS FROM MODAL
  // =========================
  const eksekusiAksi = async () => {
    const { type, targetId, targetMejaId } = modalConfig;
    tutupModal(); // Tutup modal sesegera mungkin demi UX

    try {
      setActionLoading(targetId);

      if (type === "bayar") {
        const { error } = await supabase.from("pesanan").update({ status: "diproses" }).eq("id", targetId);
        if (error) throw error;
        toast.success("Pembayaran berhasil dikonfirmasi!");

      } else if (type === "selesai") {
        const { error: pesananError } = await supabase.from("pesanan").update({ status: "selesai" }).eq("id", targetId);
        if (pesananError) throw pesananError;

        if (targetMejaId) {
          await supabase.from("meja").update({ status: "tersedia" }).eq("id", targetMejaId);
        }
        toast.success("Pesanan selesai & meja dikosongkan!");

      } else if (type === "batal") {
        const { error: errorPesanan } = await supabase
          .from("pesanan")
          .update({
            status: "dibatalkan",
            alasan_pembatalan: "Dibatalkan oleh admin",
            dibatalkan_pada: new Date()
          })
          .eq("id", targetId);

        if (errorPesanan) throw errorPesanan;

        if (targetMejaId) {
          await supabase.from("meja").update({ status: "tersedia" }).eq("id", targetMejaId);
        }
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

  // =========================
  // FILTER DATA BERDASARKAN SEARCH
  // =========================
  const filteredPesanan = pesanan.filter((item) => {
    const searchLower = search.toLowerCase();
    return (
      item.nama_pembeli?.toLowerCase().includes(searchLower) ||
      item.kode_pesanan?.toLowerCase().includes(searchLower) ||
      String(item.nomor_meja || item.meja_id).includes(searchLower)
    );
  });

  return (
    <div className="p-3 sm:p-6 md:p-8 lg:p-10 bg-slate-50 min-h-screen text-slate-800 antialiased relative">
      
      {/* -------------------------------------------------------- */}
      {/* PROFESSIONAL CUSTOM MODAL COMPONENT */}
      {/* -------------------------------------------------------- */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={tutupModal} />
          
          {/* Modal Box */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 max-w-md w-full relative z-10 transform scale-100 transition-all">
            <div className="flex items-center gap-3 mb-3">
              {modalConfig.type === "batal" ? (
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

            <p className="text-sm font-semibold text-slate-500 leading-relaxed mb-6">
              {modalConfig.message}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={tutupModal}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Kembali
              </button>
              <button
                onClick={eksekusiAksi}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-xs transition-colors ${
                  modalConfig.type === "batal" 
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-100" 
                    : modalConfig.type === "bayar" 
                    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-100" 
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* MAIN LAYOUT PAGE */}
      {/* -------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#002366] tracking-tight">
              Alur <span className="text-[#FF8C00]">Pesanan Masuk</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">
              Pantau antrean dapur, konfirmasi pembayaran, dan kelola meja secara real-time.
            </p>
          </div>
          <div className="inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-xs self-start md:self-auto">
            <div className="w-2.5 h-2.5 bg-[#FF8C00] rounded-full animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-slate-600">
              {filteredPesanan.length} Pesanan Aktif
            </span>
          </div>
        </div>

        {/* SEARCH BOX */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/60 mb-6 flex items-center gap-3">
          <svg className="w-5 h-5 text-slate-400 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode invoice, nama pembeli, atau nomor meja..."
            className="w-full text-sm font-semibold text-slate-700 bg-transparent outline-none placeholder-slate-400 min-h-[36px]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-xs font-bold text-slate-400 hover:text-rose-500 bg-slate-100 p-1.5 rounded-lg">Clear</button>
          )}
        </div>

        {/* LOADING & EMPTY STATE */}
        {loading && (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#002366] rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Memuat Antrean...</p>
          </div>
        )}

        {!loading && filteredPesanan.length === 0 && (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xs flex flex-col items-center">
            <h3 className="text-lg font-black text-[#002366]">Tidak Ada Pesanan Aktif</h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xs font-medium">Semua antrean kosong atau tidak ada hasil cocok.</p>
          </div>
        )}

        {/* DATA GRID CARDS */}
        {!loading && filteredPesanan.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {filteredPesanan.map((item) => {
              const rawItems = Array.isArray(item.items) ? item.items : JSON.parse(item.items || "[]");
              const itemsPerPage = 3;
              const activePage = menuPage[item.id] || 1;
              const totalPages = Math.ceil(rawItems.length / itemsPerPage);
              const visibleItems = rawItems.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden h-full">
                  <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-[11px] font-black text-slate-400 font-mono">{item.kode_pesanan}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${item.status === "menunggu_pembayaran" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-indigo-50 text-indigo-700 border-indigo-100"}`}>
                        {item.status === "menunggu_pembayaran" ? "Belum Bayar" : "Diproses"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 mt-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Pelanggan</p>
                        <h4 className="text-base font-black text-[#002366] truncate mt-0.5">{item.nama_pembeli}</h4>
                      </div>
                      <span className="inline-flex items-center bg-[#002366] text-white text-sm font-black px-3 py-1.5 rounded-xl">
                        MEJA {item.nomor_meja || item.meja_id}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2.5">Daftar Menu ({rawItems.length})</p>
                      <div className="space-y-2.5 min-h-[170px]">
                        {visibleItems.map((prod, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100 text-xs font-semibold">
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="text-slate-800 font-bold block truncate">{prod.nama}</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">Rp {Number(prod.harga).toLocaleString("id-ID")}</span>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-3">
                              <span className="text-slate-400 text-[11px]">x{prod.qty}</span>
                              <span className="font-extrabold text-[#002366] min-w-[65px] text-right">Rp {(prod.subtotal || prod.harga * prod.qty).toLocaleString("id-ID")}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                          <button disabled={activePage === 1} onClick={() => setMenuPage((prev) => ({ ...prev, [item.id]: activePage - 1 }))} className="p-1 rounded-lg bg-slate-50 border text-slate-500 disabled:opacity-30"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                          <span className="text-[11px] font-extrabold text-slate-400">Halaman {activePage} dari {totalPages}</span>
                          <button disabled={activePage === totalPages} onClick={() => setMenuPage((prev) => ({ ...prev, [item.id]: activePage + 1 }))} className="p-1 rounded-lg bg-slate-50 border text-slate-500 disabled:opacity-30"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
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
                          <strong className="text-lg font-black text-[#FF8C00] block mt-0.5">Rp {Number(item.total_harga).toLocaleString("id-ID")}</strong>
                        </div>
                      </div>

                      {/* CALL THE NEW CUSTOM MODAL INSTEAD OF WINDOW.CONFIRM */}
                      <div className="flex gap-2.5 mt-2">
                        {item.status === "menunggu_pembayaran" && (
                          <button
                            onClick={() => bukaModalKonfirmasi("batal", item.id, item.meja_id, item.status)}
                            disabled={actionLoading === item.id}
                            type="button"
                            className="px-4 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 font-bold text-xs text-slate-500 min-h-[44px] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            <span>Batal</span>
                          </button>
                        )}

                        {item.status === "menunggu_pembayaran" && (
                          <button
                            onClick={() => bukaModalKonfirmasi("bayar", item.id, item.meja_id)}
                            disabled={actionLoading === item.id}
                            type="button"
                            className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                          >
                            {actionLoading === item.id ? "Memproses..." : "Konfirmasi Bayar"}
                          </button>
                        )}

                        {item.status === "diproses" && (
                          <button
                            onClick={() => bukaModalKonfirmasi("selesai", item.id, item.meja_id)}
                            disabled={actionLoading === item.id}
                            type="button"
                            className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
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
    </div>
  );
};

export default AdminProsesPesanan;