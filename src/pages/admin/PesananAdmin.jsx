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

  const [meja, setMeja] = useState('');
  const [payMethod, setPayMethod] = useState('Tunai');
  const [loading, setLoading] = useState(false);

  // POPUP MEJA
  const [showMejaPopup, setShowMejaPopup] = useState(false);

  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);

  // TOTAL PAGE
  const [maxPage, setMaxPage] = useState(1);

  // MEJA TERPAKAI
  const [usedTables, setUsedTables] = useState([]);

  // FETCH MEJA DIPAKAI
  const fetchUsedTables = async () => {

    const { data } = await supabase
      .from('history_pesanan')
      .select('nomor_meja')
      .eq('status', 'Diproses');

    const mejaDipakai =
      data?.map((item) => item.nomor_meja) || [];

    setUsedTables(mejaDipakai);

    // AUTO PINDAH KE PAGE YANG MASIH ADA MEJA
    let halamanKosong = 1;

    for (let page = 1; page <= 10; page++) {

      const start = (page - 1) * 20 + 1;

      const semuaTerpakai =
        Array.from(
          { length: 20 },
          (_, i) => start + i
        ).every((nomor) =>
          mejaDipakai.includes(nomor)
        );

      if (!semuaTerpakai) {

        halamanKosong = page;

        break;

      }

    }

    setCurrentPage(halamanKosong);

    // TOTAL PAGE
    const totalPage =
      Math.ceil(100 / 20);

    setMaxPage(totalPage);

  };

  useEffect(() => {

    fetchUsedTables();

  }, []);

  // ITEM CART
  const cartItems = Object.keys(cart).filter(
    (id) => cart[id] > 0
  );

  // TOTAL HARGA
  let totalHarga = 0;

  cartItems.forEach((id) => {

    const m = menu.find(
      (item) => Number(item.id) === Number(id)
    );

    if (m) {

      totalHarga +=
        Number(m.harga) *
        Number(cart[id]);

    }

  });

  // GENERATE KODE
  const generateKodePesanan = () => {

    return `INV-${crypto
      .randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;

  };

  // PROSES PESANAN
  const handleProsesPesanan = async () => {

    if (!meja || cartItems.length === 0) {

      toast.error(
        'Pilih menu dan isi nomor meja'
      );

      return;

    }

    // CEK MEJA
    const { data: existingMeja } = await supabase
      .from('history_pesanan')
      .select('id')
      .eq('nomor_meja', Number(meja))
      .eq('status', 'Diproses');

    if (existingMeja.length > 0) {

      toast.error(
        `Meja ${meja} sedang digunakan!`
      );

      return;

    }

    setLoading(true);

    try {

      // ITEMS
      const itemsData = cartItems.map((id) => {

        const m = menu.find(
          (item) => Number(item.id) === Number(id)
        );

        if (!m) return null;

        return {

          nama: m.nama,
          harga: Number(m.harga),
          qty: Number(cart[id]),
          subtotal:
            Number(m.harga) *
            Number(cart[id])

        };

      }).filter(Boolean);

      // INSERT
      const { error } = await supabase
        .from('history_pesanan')
        .insert([
          {
            kode_pesanan:
              generateKodePesanan(),
            nomor_meja:
              Number(meja),
            total_harga:
              Number(totalHarga),
            metode_pembayaran:
              payMethod,
            status: 'Diproses',
            items: itemsData
          }
        ]);

      if (error) throw error;

      toast.success(
        `Pesanan meja ${meja} berhasil diproses!`
      );

      clearCart();

      navigate('/adminProses-pesanan');

    } catch (error) {

      console.log(error);

      toast.error(
        error.message ||
        'Gagal menyimpan pesanan'
      );

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="p-4 md:p-10 bg-[#f0f2f5] min-h-screen">

      <div className="max-w-6xl mx-auto">

        {/* BACK */}
        <button
          onClick={() =>
            navigate('/buat-pesanan')
          }
          className="group mb-6 flex items-center gap-2 text-gray-500 hover:text-[#002366] transition-colors font-semibold"
        >

          <span className="bg-white p-2 rounded-full shadow-sm group-hover:bg-[#002366] group-hover:text-white transition-all text-lg">

            ←

          </span>

          Kembali Pilih Menu

        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* MENU */}
          <div className="lg:col-span-8 space-y-4">

            <h3 className="font-black text-2xl text-gray-800 mb-2">

              Ringkasan <span className="text-[#FF8C00]">Menu</span>

            </h3>

            {cartItems.length === 0 ? (

              <div className="bg-white p-20 rounded-3xl text-center border-2 border-dashed border-gray-200">

                <p className="text-gray-400 italic">

                  Belum ada menu yang dipilih.

                </p>

              </div>

            ) : (

              cartItems.map((id) => {

                const qty = cart[id];

                const m = menu.find(
                  (item) =>
                    Number(item.id) ===
                    Number(id)
                );

                if (!m) return null;

                const sub =
                  Number(m.harga) *
                  Number(qty);

                return (

                  <div
                    key={id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center"
                  >

                    <div className="flex items-center gap-4">

                      <img
                        src={m.img}
                        alt={m.nama}
                        className="w-16 h-16 rounded-xl object-cover"
                      />

                      <div>

                        <h5 className="font-bold text-gray-800">

                          {m.nama}

                        </h5>

                        <p className="text-xs text-[#FF8C00] font-bold">

                          Rp {Number(m.harga).toLocaleString()}

                        </p>

                      </div>

                    </div>

                    <div className="flex items-center gap-6">

                      <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border">

                        <button
                          onClick={() =>
                            updateQty(m.id, -1)
                          }
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-[#002366]"
                        >

                          -

                        </button>

                        <span className="font-black text-sm w-4 text-center">

                          {qty}

                        </span>

                        <button
                          onClick={() =>
                            updateQty(m.id, 1)
                          }
                          className="w-8 h-8 flex items-center justify-center bg-[#002366] text-white rounded-lg shadow-sm font-bold"
                        >

                          +

                        </button>

                      </div>

                      <div className="text-right min-w-[100px]">

                        <strong className="text-lg text-[#002366]">

                          Rp {sub.toLocaleString()}

                        </strong>

                      </div>

                    </div>

                  </div>

                );

              })

            )}

          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-4 sticky top-24">

            <div className="bg-white p-8 rounded-[35px] shadow-2xl border border-gray-50">

              <h3 className="font-black text-xl text-gray-800 mb-6 border-b pb-4">

                Konfirmasi <span className="text-[#FF8C00]">Meja</span>

              </h3>

              <div className="space-y-6">

                {/* PILIH MEJA */}
                <div>

                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">

                    Nomor Meja

                  </label>

                  <button
                    onClick={() =>
                      setShowMejaPopup(true)
                    }
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-2xl text-center text-[#002366] hover:border-[#FF8C00] transition-all"
                  >

                    {meja
                      ? `MEJA ${meja}`
                      : 'Pilih Meja'}

                  </button>

                </div>

                {/* METODE */}
                <div>

                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">

                    Metode Pembayaran

                  </label>

                  <select
                    value={payMethod}
                    onChange={(e) =>
                      setPayMethod(
                        e.target.value
                      )
                    }
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-[#002366] outline-none cursor-pointer"
                  >

                    <option value="Tunai">

                      Tunai / Cash

                    </option>

                    <option value="QRIS">

                      QRIS / Transfer

                    </option>

                  </select>

                </div>

                {/* TOTAL */}
                <div className="bg-[#002366] p-6 rounded-3xl text-white shadow-xl">

                  <div className="flex justify-between items-baseline">

                    <span className="font-bold">

                      Total Bayar

                    </span>

                    <span className="text-2xl font-black text-[#FF8C00]">

                      Rp {totalHarga.toLocaleString()}

                    </span>

                  </div>

                </div>

                {/* BUTTON */}
                <button
                  onClick={handleProsesPesanan}
                  disabled={
                    !meja ||
                    cartItems.length === 0 ||
                    loading
                  }
                  className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all duration-300 ${
                    !meja ||
                    cartItems.length === 0 ||
                    loading
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                      : 'bg-[#FF8C00] text-white hover:bg-orange-600 hover:-translate-y-1 active:scale-95 shadow-orange-200'
                  }`}
                >

                  {loading
                    ? 'Sabar, Sedang Memproses...'
                    : 'Proses Pesanan Sekarang'}

                </button>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* POPUP MEJA */}
      {showMejaPopup && (

        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-4xl rounded-[35px] p-8 shadow-2xl">

            {/* HEADER */}
            <div className="flex items-center justify-between mb-8">

              <div>

                <h2 className="text-3xl font-black text-[#002366]">

                  Pilih <span className="text-[#FF8C00]">Meja</span>

                </h2>

                <p className="text-gray-400 mt-1">

                  Abu terang = dipakai

                </p>

              </div>

              <button
                onClick={() =>
                  setShowMejaPopup(false)
                }
                className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 font-black text-xl"
              >

                ✕

              </button>

            </div>

            {/* GRID */}
            <div className="grid grid-cols-5 gap-4">

              {Array.from(
                { length: 20 },
                (_, i) => {

                  const nomor =
                    (currentPage - 1) * 20 + i + 1;

                  const isUsed =
                    usedTables.includes(
                      nomor
                    );

                  return (

                    <button
                      key={nomor}
                      disabled={isUsed}
                      onClick={() => {

                        setMeja(nomor);

                        setShowMejaPopup(false);

                      }}
                      className={`aspect-square rounded-2xl font-black text-xl transition-all shadow-md border-2
                      
                      ${
                        isUsed
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200'
                          : 'bg-gray-700 hover:bg-[#FF8C00] text-white border-gray-700 hover:border-[#FF8C00] hover:scale-105'
                      }`}
                    >

                      {nomor}

                    </button>

                  );

                }
              )}

            </div>

            {/* PAGINATION */}
            <div className="flex items-center justify-between mt-8">

              <button
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage(
                    currentPage - 1
                  )
                }
                className={`px-6 py-3 rounded-2xl font-bold ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-300'
                    : 'bg-[#002366] text-white'
                }`}
              >

                Prev

              </button>

              <div className="font-black text-[#002366] text-lg">

                Halaman {currentPage}

              </div>

              <button
                disabled={
                  currentPage === maxPage
                }
                onClick={() =>
                  setCurrentPage(
                    currentPage + 1
                  )
                }
                className={`px-6 py-3 rounded-2xl font-bold ${
                  currentPage === maxPage
                    ? 'bg-gray-100 text-gray-300'
                    : 'bg-[#FF8C00] text-white'
                }`}
              >

                Next

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};

export default PesananAdmin;