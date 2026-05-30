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

  const [namaPemesan, setNamaPemesan] =
    useState('');
  const [loading, setLoading] = useState(false);

  // POPUP MEJA
  const [showMejaPopup, setShowMejaPopup] =
    useState(false);

  // PAGINATION
  const [currentPage, setCurrentPage] =
    useState(1);

  const [maxPage] = useState(5);

  // MEJA TERPAKAI
  const [usedTables, setUsedTables] =
    useState([]);

  // =========================
  // FETCH MEJA DIPAKAI
  // =========================

  const fetchUsedTables = async () => {

  try {
    const { data, error } =
      await supabase
        .from('pesanan')
        .select('meja_id, status')
        .in(
          'status',
          [
            'menunggu_pembayaran',
            'diproses'
          ]
        );

    if (error) {

      console.log(error);

      return;

    }

    const mejaDipakai =
      data?.map((item) =>
        Number(item.meja_id)
      ) || [];

    setUsedTables(mejaDipakai);

  } catch (error) {

    console.log(error);

  }

};

  useEffect(() => {

    fetchUsedTables();

  }, []);

  // =========================
// VALIDASI MENU REALTIME
// =========================

useEffect(() => {

  if (!menu.length) return;

  cartItems.forEach((id) => {

    const currentMenu =
      menu.find(
        (item) =>
          Number(item.id) ===
          Number(id)
      );

    // MENU DIHAPUS
    if (!currentMenu) {

      updateQty(
        Number(id),
        -999
      );

      toast.error(
        "Menu dihapus dari sistem"
      );

      return;

    }

    // MENU HABIS
    if (
      currentMenu.stok ===
      "kosong"
    ) {

      updateQty(
        Number(id),
        -999
      );

      toast.error(
        `${currentMenu.nama} sedang habis`
      );

      return;

    }

    // MENU NONAKTIF
    if (
      currentMenu.stok ===
      "nonaktif"
    ) {

      updateQty(
        Number(id),
        -999
      );

      toast.error(
        `${currentMenu.nama} dinonaktifkan`
      );

      return;

    }

  });

}, [menu]);

// =========================
// REALTIME MENU
// =========================

useEffect(() => {

  const channel =
    supabase
      .channel(
        "realtime-menu-admin"
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu"
        },
        () => {

          window.location.reload();

        }
      )
      .subscribe();

  return () => {

    supabase.removeChannel(
      channel
    );

  };

}, []);

  // =========================
  // CART ITEMS
  // =========================

  const cartItems =
    Object.keys(cart).filter(
      (id) => cart[id] > 0
    );

    // =========================
// VALIDASI CART KOSONG
// =========================

useEffect(() => {

  // TUNGGU RENDER SELESAI
  const timeout =
    setTimeout(() => {

      if (
        cartItems.length === 0
      ) {

        toast.error(
          "Pilih menu terlebih dahulu"
        );

        navigate(
          "/admin/buat-pesanan"
        );

      }

    }, 100);

  return () =>
    clearTimeout(timeout);

}, [cartItems, navigate]);
  // =========================
  // TOTAL HARGA
  // =========================

  let totalHarga = 0;

  cartItems.forEach((id) => {

    const m = menu.find(
      (item) =>
        Number(item.id) ===
        Number(id)
    );

    if (m) {

      totalHarga +=
        Number(m.harga) *
        Number(cart[id]);

    }

  });

  // =========================
  // GENERATE KODE
  // =========================

  const generateKodePesanan = () => {

    return `INV-${crypto
      .randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;

  };

  // =========================
  // PROSES PESANAN
  // =========================

  const handleProsesPesanan = async () => {

    if (
      !namaPemesan ||
      !meja ||
      cartItems.length === 0
    ) {

      toast.error(
        'Lengkapi nama dan meja terlebih dahulu!'
      );

      return;

    }

    // CEK ULANG MEJA
    if (
      usedTables.includes(
        Number(meja)
      )
    ) {

      toast.error(
        `Meja ${meja} sedang digunakan`
      );

      return;

    }

    setLoading(true);

    try {

      const itemsData =
        cartItems.map((id) => {

          const m = menu.find(
            (item) =>
              Number(item.id) ===
              Number(id)
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

      const { error } =
        await supabase
          .from('pesanan')
          .insert([
            {

              kode_pesanan:
                generateKodePesanan(),

              meja_id:
                Number(meja),

              total_harga:
                Number(totalHarga),

              metode_pembayaran:
                payMethod,

              status:
                'diproses',

              is_checkout:
                true,

              nama_pembeli:
                namaPemesan,

              items:
                itemsData

            }
          ]);

      if (error) throw error;

      toast.success(
        `Pesanan meja ${meja} berhasil diproses!`
      );

      clearCart();

      navigate('/admin/proses-pesanan');

    } catch (error) {

      console.log(error);

      toast.error(
        error.message ||
        'Gagal memproses pesanan'
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

                  Belum ada menu dipilih.

                </p>

              </div>

            ) : (

              cartItems.map((id) => {

                const qty =
                  cart[id];

                const m =
                  menu.find(
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
                            updateQty(
                              m.id,
                              -1
                            )
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
                            updateQty(
                              m.id,
                              1
                            )
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

                Konfirmasi <span className="text-[#FF8C00]">Pesanan</span>

              </h3>

              <div className="space-y-6">
                {/* NAMA PEMESAN */}

                <div>

                  <label
                    className="
                    text-[10px]
                    font-black
                    text-gray-400
                    uppercase
                    tracking-widest
                    mb-2
                    block
                    "
                  >

                    Nama Pemesan

                  </label>

                  <input
                    type="text"

                    value={namaPemesan}

                    onChange={(e) =>
                      setNamaPemesan(
                        e.target.value
                      )
                    }

                    placeholder="Masukkan nama pemesan"

                    className="
                    w-full
                    p-4
                    bg-gray-50
                    border-2
                    border-gray-100
                    rounded-2xl
                    font-bold
                    text-[#002366]
                    outline-none
                    focus:border-[#FF8C00]
                    transition-all
                    "
                  />

                </div>

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

                {/* METODE PEMBAYARAN */}
                <div>

                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">

                    Metode Pembayaran

                  </label>

                  <div className="grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        setPayMethod(
                          'Tunai'
                        )
                      }
                      className={`py-4 rounded-2xl border-2 font-black transition-all duration-300

                      ${
                        payMethod === 'Tunai'
                          ? 'bg-[#002366] text-white border-[#002366] shadow-lg scale-[1.02]'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-[#002366]'
                      }`}
                    >

                      💵 Tunai

                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPayMethod(
                          'QRIS'
                        )
                      }
                      className={`py-4 rounded-2xl border-2 font-black transition-all duration-300

                      ${
                        payMethod === 'QRIS'
                          ? 'bg-[#FF8C00] text-white border-[#FF8C00] shadow-lg scale-[1.02]'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-[#FF8C00]'
                      }`}
                    >

                      📱 QRIS

                    </button>

                  </div>

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
                  onClick={
                    handleProsesPesanan
                  }
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
                    ? 'Memproses...'
                    : 'Proses Pesanan'}

                </button>

              </div>

            </div>

          </div>

        </div>

      </div>

{/* POPUP MEJA */}

{showMejaPopup && (

  <div
    className="
    fixed
    inset-0
    z-[999]
    bg-black/50
    backdrop-blur-sm
    flex
    items-center
    justify-center
    p-4
    "
  >

    {/* CARD */}

    <div
      className="
      bg-white
      w-full
      max-w-[650px]
      rounded-[38px]
      p-6
      shadow-2xl
      animate-[fadeIn_.2s_ease]
      "
    >

      {/* HEADER */}

      <div
        className="
        flex
        items-center
        justify-between
        mb-6
        "
      >

        <h1
          className="
          text-3xl
          font-black
          text-[#002366]
          "
        >

          Pilih Meja

        </h1>

        {/* CLOSE */}

        <button
          onClick={() =>
            setShowMejaPopup(false)
          }
          className="
          w-[45px]
          h-[45px]
          rounded-2xl
          bg-red-500
          hover:bg-red-600
          text-white
          text-2xl
          font-black
          transition-all
          "
        >

          ×

        </button>

      </div>

      {/* GRID */}

      <div
        className="
        grid
        grid-cols-5
        gap-4
        "
      >

        {Array.from(
          { length: 10 },
          (_, i) => {

            const nomor =
              (currentPage - 1) * 10 +
              i +
              1;

            const isUsed =
              usedTables.includes(
                nomor
              );

            const selected =
              meja === nomor;

            return (

              <button
                key={nomor}

                onClick={() => {

                  // VALIDASI MEJA DIPAKAI
                  if (isUsed) {

                    toast.error(
                      `Meja ${nomor} sedang digunakan`
                    );

                    return;

                  }

                  // PILIH MEJA
                  setMeja(nomor);

                }}

                disabled={
                  isUsed
                }

                className={`
                h-[74px]
                rounded-[20px]
                font-black
                text-2xl
                transition-all
                duration-300

                ${
                  selected

                    ? "bg-[#FF8C00] text-white scale-105"

                    : isUsed

                    ? "bg-gray-300 text-white cursor-not-allowed"

                    : "bg-[#56657F] hover:bg-[#002366] text-white"
                }
                `}
              >

                {nomor}

              </button>

            );

          }
        )}

      </div>

      {/* PAGINATION */}

      <div
        className="
        flex
        items-center
        justify-between
        mt-6
        "
      >

        {/* PREVIOUS */}

        <button
          disabled={
            currentPage === 1
          }

          onClick={() =>
            setCurrentPage(
              (prev) =>
                prev - 1
            )
          }

          className={`
          px-6
          h-[50px]
          rounded-2xl
          font-bold
          transition-all

          ${
            currentPage === 1

              ? "bg-gray-100 text-gray-300"

              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          }
          `}
        >

          Sebelumnya

        </button>

        {/* INFO */}

        <p
          className="
          font-black
          text-[#002366]
          text-lg
          "
        >

          {(
            (currentPage - 1) * 10
          ) + 1}

          {" - "}

          {currentPage * 10}

        </p>

        {/* NEXT */}

        <button
          disabled={
            currentPage ===
            maxPage
          }

          onClick={() =>
            setCurrentPage(
              (prev) =>
                prev + 1
            )
          }

          className={`
          px-6
          h-[50px]
          rounded-2xl
          font-bold
          transition-all

          ${
            currentPage ===
            maxPage

              ? "bg-gray-100 text-gray-300"

              : "bg-[#FF8C00] hover:bg-orange-600 text-white"
          }
          `}
        >

          Berikutnya

        </button>

      </div>

      {/* BUTTON */}

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

        className="
        w-full
        mt-6
        bg-[#8A9BC0]
        hover:bg-[#6F84B3]
        disabled:bg-[#B8C2D9]
        text-white
        py-4
        rounded-[20px]
        font-black
        text-xl
        transition-all
        "
      >

        Gunakan Meja

        {meja && ` ${meja}`}

      </button>

    </div>

  </div>

)}
    </div>

  );

};

export default PesananAdmin;