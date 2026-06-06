import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../../lib/supabaseClient";
import toast from 'react-hot-toast';

const PesananAdmin = ({
  cart = {},
  menu = [],
  updateQty,
  clearCart
}) => {
  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================
  const [meja, setMeja] = useState('');
  const [payMethod, setPayMethod] = useState('Tunai');
  const [namaPemesan, setNamaPemesan] = useState('');
  const [loading, setLoading] = useState(false);
  const [uangDiterima, setUangDiterima] = useState('');
  const [showMejaPopup, setShowMejaPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [maxPage] = useState(5);
  const [usedTables, setUsedTables] = useState([]);
  const currentMeja = Array.from(
  { length: 10 },
  (_, i) => (currentPage - 1) * 10 + i + 1
).filter((nomor) => nomor <= 100);

  // =========================
  // FETCH MEJA DIPAKAI
  // =========================
  const fetchUsedTables = async () => {
    try {
      const { data, error } = await supabase
        .from('pesanan')
        .select('meja_id, status')
        .in('status', ['menunggu_pembayaran', 'diproses']);

      if (error) {
        console.log(error);
        return;
      }

      const mejaDipakai = data?.map((item) => Number(item.meja_id)) || [];
      setUsedTables(mejaDipakai);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchUsedTables();
  }, []);

  const cartItems = Object.keys(cart).filter((key) => cart[key] > 0);

  // =========================
  // VALIDASI MENU REALTIME
  // =========================
  useEffect(() => {
    if (!menu.length) return;

    cartItems.forEach((cartKey) => {
      const [menuId, varian] = cartKey.split('-');
      const currentMenu = menu.find((item) => Number(item.id) === Number(menuId));

      if (!currentMenu) {
        updateQty(cartKey, -999);
        toast.error("Menu dihapus dari sistem");
        return;
      }

      if (currentMenu.stok === "nonaktif") {
        updateQty(cartKey, -999);
        toast.error(`${currentMenu.nama} dinonaktifkan`);
        return;
      }

      // Validasi ketersediaan berdasarkan varian spesifik
      if (currentMenu.stok === "kosong") {
        updateQty(cartKey, -999);
        toast.error(`${currentMenu.nama} sedang habis`);
      } else if (varian === 'biasa' && currentMenu.stok === 'extra_ada') {
        updateQty(cartKey, -999);
        toast.error(`Varian Biasa untuk ${currentMenu.nama} sedang habis`);
      } else if (varian === 'extra' && currentMenu.stok === 'biasa_ada') {
        updateQty(cartKey, -999);
        toast.error(`Varian Extra untuk ${currentMenu.nama} sedang habis`);
      }
    });
  }, [menu]);

  // =========================
  // REALTIME MENU SUBSCRIPTION
  // =========================
  useEffect(() => {
    const channel = supabase
      .channel("realtime-menu-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu" }, () => {
        window.location.reload();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =========================
  // VALIDASI CART KOSONG
  // =========================
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (cartItems.length === 0) {
        toast.error("Pilih menu terlebih dahulu");
        navigate("/admin/buat-pesanan");
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [cartItems, navigate]);

  // Hitung total harga berdasarkan varian produk
  let totalHarga = 0;
  cartItems.forEach((cartKey) => {
    const [menuId, varian] = cartKey.split('-');
    const m = menu.find((item) => Number(item.id) === Number(menuId));
    if (m) {
      const hargaAktif = varian === 'extra' ? Number(m.harga_extra) : Number(m.harga_biasa);
      totalHarga += hargaAktif * Number(cart[cartKey]);
    }
  });

  const jumlahDiterima = Number(uangDiterima) || 0;
  const totalKembalian = jumlahDiterima - totalHarga;

  const buatNominalCepat = (total) => {
    const pembulatan = [5000, 10000, 20000, 50000, 100000];
    const hasil = [total];
    pembulatan.forEach((nilai) => {
      hasil.push(Math.ceil(total / nilai) * nilai);
    });
    return [...new Set(hasil)].sort((a, b) => a - b);
  };

  const nominalCepat = buatNominalCepat(totalHarga);

  const generateKodePesanan = () => {
    return `INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  };

  const handleProsesPesanan = async () => {
    if (!namaPemesan || !meja || cartItems.length === 0) {
      toast.error('Lengkapi nama dan meja terlebih dahulu!');
      return;
    }

    if (payMethod === "Tunai") {
      const nominal = Number(uangDiterima);
      if (!uangDiterima) {
        toast.error("Masukkan uang yang diterima");
        return;
      }
      if (nominal <= 0) {
        toast.error("Nominal harus lebih dari Rp 0");
        return;
      }
      if (nominal < totalHarga) {
        toast.error(`Minimal pembayaran Rp ${totalHarga.toLocaleString()}`);
        return;
      }
    }

    if (usedTables.includes(Number(meja))) {
      toast.error(`Meja ${meja} sedang digunakan`);
      return;
    }

    setLoading(true);

    try {
      const itemsData = cartItems.map((cartKey) => {
        const [menuId, varian] = cartKey.split('-');
        const m = menu.find((item) => Number(item.id) === Number(menuId));
        if (!m) return null;

        const hargaAktif = varian === 'extra' ? Number(m.harga_extra) : Number(m.harga_biasa);
        const namaTampil = varian === 'extra' ? `${m.nama} (Extra)` : m.nama;

        return {
          id: m.id,
          nama: namaTampil,
          harga: hargaAktif,
          qty: Number(cart[cartKey]),
          subtotal: hargaAktif * Number(cart[cartKey])
        };
      }).filter(Boolean);

      const { error } = await supabase
        .from('pesanan')
        .insert([
          {
            kode_pesanan: generateKodePesanan(),
            meja_id: Number(meja),
            total_harga: Number(totalHarga),
            metode_pembayaran: payMethod,
            status: 'diproses',
            is_checkout: true,
            nama_pembeli: namaPemesan,
            items: itemsData
          }
        ]);

      if (error) throw error;

      toast.success(`Pesanan meja ${meja} berhasil diproses!`);
      clearCart();
      navigate('/admin/proses-pesanan');
    } catch (error) {
      console.log(error);
      toast.error(error.message || 'Gagal memproses pesanan');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi pembantu hapus item secara manual
  const handleHapusItem = (cartKey, namaMenu) => {
    updateQty(cartKey, -999);
    toast.success(`${namaMenu} dihapus dari keranjang`);
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 lg:p-10 bg-slate-50 min-h-screen text-slate-800 antialiased">
      <div className="max-w-[1400px] mx-auto">
        {/* BACK NAVIGATION */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/buat-pesanan')}
            type="button"
            className="group flex items-center gap-2 text-slate-500 hover:text-[#002366] font-bold text-sm transition-all min-h-[44px]"
          >
            <span className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm group-hover:bg-[#002366] group-hover:text-white group-hover:border-[#002366] transition-all flex items-center justify-center w-9 h-9">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </span>
            Kembali Pilih Menu
          </button>
        </div>

        {/* MAIN GRID CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: CART SUMMARY */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-xl sm:text-2xl text-[#002366]">
                Ringkasan <span className="text-[#FF8C00]">Menu</span>
              </h3>
              <span className="text-xs font-bold text-slate-500 bg-orange-50 text-[#FF8C00] px-2.5 py-1 rounded-full border border-orange-100">
                {cartItems.length} Item Terpilih
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="bg-white p-12 sm:p-20 rounded-2xl text-center border-2 border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-slate-400 font-medium italic text-sm">
                  Belum ada menu yang dipilih.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((cartKey) => {
                  const [menuId, varian] = cartKey.split('-');
                  const qty = cart[cartKey];
                  const m = menu.find((item) => Number(item.id) === Number(menuId));
                  if (!m) return null;

                  const hargaAktif = varian === 'extra' ? Number(m.harga_extra) : Number(m.harga_biasa);
                  const sub = hargaAktif * Number(qty);

                  return (
                    <div
                      key={cartKey}
                      className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-slate-200/80"
                    >
                      <div className="flex items-center gap-3.5 w-full sm:w-auto">
                        <img
                          src={m.img}
                          alt={m.nama}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-100 shadow-inner flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-slate-800 text-sm sm:text-base tracking-tight truncate capitalize">
                            {m.nama}
                            {Number(m.harga_extra) > 0 && (
                              <span className={`text-[10px] ml-2 px-2 py-0.5 rounded-md font-extrabold ${varian === 'extra' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                                {varian.toUpperCase()}
                              </span>
                            )}
                          </h5>
                          <p className="text-xs text-[#FF8C00] font-black mt-0.5">
                            Rp {hargaAktif.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t border-slate-50 sm:border-0">
                        
                        {/* +/- MODIFIER & MANUALLY DELETE BUTTON */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200/60 shadow-inner">
                            <button
                              onClick={() => updateQty(cartKey, -1)}
                              type="button"
                              className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-[#002366] hover:bg-slate-50 rounded-lg shadow-sm font-black transition-colors min-w-[32px] min-h-[32px]"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="font-extrabold text-sm text-slate-800 w-5 text-center">
                              {qty}
                            </span>
                            <button
                              onClick={() => updateQty(cartKey, 1)}
                              type="button"
                              className="w-8 h-8 flex items-center justify-center bg-[#002366] text-white hover:bg-indigo-900 rounded-lg shadow-sm font-black transition-colors min-w-[32px] min-h-[32px]"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>

                          {/* TOMBOL HAPUS MENU */}
                          <button
                            onClick={() => handleHapusItem(cartKey, m.nama)}
                            type="button"
                            title="Hapus menu"
                            className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-xs border border-rose-100 font-bold min-w-[36px] min-h-[36px]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        <div className="text-right min-w-[110px]">
                          <span className="text-xs text-slate-400 block sm:hidden">Subtotal</span>
                          <strong className="text-base sm:text-lg font-black text-[#002366]">
                            Rp {sub.toLocaleString("id-ID")}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: CONFIRMATION FORM */}
          <div className="lg:col-span-5 w-full lg:sticky lg:top-6">
            <div className="bg-white p-5 sm:p-7 md:p-8 rounded-2xl shadow-sm border border-slate-200/70">
              <h3 className="font-black text-lg sm:text-xl text-[#002366] mb-5 border-b border-slate-100 pb-3">
                Konfirmasi <span className="text-[#FF8C00]">Pesanan</span>
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Nama Pemesan
                  </label>
                  <input
                    type="text"
                    value={namaPemesan}
                    onChange={(e) => setNamaPemesan(e.target.value)}
                    placeholder="Masukkan nama pemesan"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-[#FF8C00] rounded-xl font-bold text-sm text-[#002366] outline-none transition-all placeholder-slate-400 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Nomor Meja
                  </label>
                  <button
                    onClick={() => setShowMejaPopup(true)}
                    type="button"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 hover:border-[#FF8C00] focus:border-[#FF8C00] rounded-xl font-black text-base text-center text-[#002366] transition-all min-h-[46px] flex items-center justify-center gap-2 shadow-inner"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2m0 18l6-3m-6 3V2m6 15l5.447 2.724A1 1 0 0021 18.832V8.062a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 2" />
                    </svg>
                    {meja ? `MEJA ${meja}` : 'Pilih Meja Kios'}
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayMethod('Tunai')}
                      className={`py-3.5 rounded-xl border font-black text-sm transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                        payMethod === 'Tunai'
                          ? 'bg-[#002366] text-white border-[#002366] shadow-md shadow-indigo-100'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-[#002366] hover:text-[#002366]'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Tunai
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod('QRIS')}
                      className={`py-3.5 rounded-xl border font-black text-sm transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                        payMethod === 'QRIS'
                          ? 'bg-[#FF8C00] text-white border-[#FF8C00] shadow-md shadow-orange-100'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-[#FF8C00] hover:text-[#FF8C00]'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      QRIS
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-[#002366] to-indigo-900 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
                  <p className="text-[11px] uppercase tracking-wider text-indigo-200 font-bold mb-1">
                    Total Yang Harus Dibayar
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#FF8C00] tracking-tight">
                    Rp {totalHarga.toLocaleString("id-ID")}
                  </h2>
                </div>

                {payMethod === "Tunai" && (
                  <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-4 shadow-inner">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                        Uang Diterima
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={uangDiterima}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (Number(value) < 0) return;
                          setUangDiterima(value);
                        }}
                        placeholder={`Minimal Rp ${totalHarga.toLocaleString("id-ID")}`}
                        className="w-full p-3 bg-white rounded-xl border border-slate-200 focus:border-[#FF8C00] font-black text-xl text-[#002366] outline-none tracking-wide min-h-[44px]"
                      />
                    </div>

                    <div className="overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                      <div className="flex flex-row gap-2 min-w-max">
                        {nominalCepat.map((nominal) => (
                          <button
                            key={nominal}
                            type="button"
                            onClick={() => setUangDiterima(nominal)}
                            className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-[#FF8C00] hover:text-[#FF8C00] font-extrabold text-xs transition-all whitespace-nowrap min-h-[36px]"
                          >
                            {nominal === totalHarga ? 'Uang Pas' : `Rp ${nominal.toLocaleString("id-ID")}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                      <p className="text-[11px] uppercase tracking-widest font-black text-emerald-600 mb-0.5">
                        Kembalian Kasir
                      </p>
                      <h2 className="text-2xl font-black text-emerald-600 tracking-tight">
                        Rp {Math.max(totalKembalian, 0).toLocaleString("id-ID")}
                      </h2>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleProsesPesanan}
                  disabled={!meja || cartItems.length === 0 || loading}
                  type="button"
                  className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-md transition-all min-h-[48px] flex items-center justify-center gap-2 ${
                    !meja || cartItems.length === 0 || loading
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-[#FF8C00] text-white hover:bg-orange-600 shadow-orange-100 active:scale-[0.98]'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {loading ? 'Sedang Memproses...' : 'Proses Pesanan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MEJA */}
{showMejaPopup && (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-[650px] rounded-[38px] p-6 shadow-2xl">

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-[#002366]">
          Pilih Meja
        </h1>

        <button
          onClick={() => setShowMejaPopup(false)}
          className="w-[45px] h-[45px] rounded-2xl bg-red-500 hover:bg-red-600 text-white text-2xl font-black"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {currentMeja.map((nomor) => {
          const dipakai =
            usedTables.includes(nomor);

          const selected =
            Number(meja) === nomor;

          return (
            <button
              key={nomor}
              onClick={() => {
                if (dipakai) {
                  toast.error(
                    `Meja ${nomor} sedang digunakan`
                  );
                  return;
                }

                setMeja(nomor);
              }}
              disabled={dipakai}
              className={`h-[74px] rounded-[20px] font-black text-2xl transition-all ${
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
        onClick={() => {
          if (!meja) {
            toast.error(
              "Pilih meja terlebih dahulu"
            );
            return;
          }

          setShowMejaPopup(false);
        }}
        disabled={!meja}
        className="w-full h-[56px] rounded-[20px] bg-[#8A9BC0] text-white font-black text-xl mt-6"
      >
        Gunakan Meja {meja || ""}
      </button>

    </div>
  </div>
)}


    </div>
  );
};

export default PesananAdmin;