import {
  useState,
  useEffect
} from 'react';

import {
  Routes,
  Route,
  useNavigate
} from 'react-router-dom';

import { supabase } from "./lib/supabaseClient";

import toast from "react-hot-toast";

import './App.css';

// =========================
// LAYOUT ADMIN
// =========================

import AdminLayout from './layouts/admin/LayoutAdmin';

// =========================
// LAYOUT PEMBELI
// =========================

import LayoutPembeli from './layouts/pembeli/LayoutPembeli';

// =========================
// ADMIN PAGES
// =========================

import AdminBeranda from './pages/admin/BerandaAdmin';

import AdminPesanan from './pages/admin/PesananAdmin';

import AdminProsesPesanan from './pages/admin/AdminProsesPesanan';

import AdminRiwayatPesanan from './pages/admin/RiwayatPesananAdmin';

import AdminKelolaMenu from './pages/admin/KelolaMenuAdmin';

import AdminBuatPesanan from './pages/admin/BuatPesananAdmin';

import HalamanLaporanAdmin from './pages/admin/HalamanLaporanAdmin';

// =========================
// PEMBELI PAGES
// =========================

import BerandaPembeli from './pages/pembeli/BerandaPembeli';

import DaftarMenuPembeli from './pages/pembeli/DaftarMenuPembeli';

import KeranjangPembeli from './pages/pembeli/KeranjangPembeli';

import KonfirmasiPesananPembeli from './pages/pembeli/KonfirmasiPesananPembeli';

import StatusPesananPembeli from './pages/pembeli/StatusPesananPembeli';

import RiwayatPesananPembeli from './pages/pembeli/RiwayatPesananPembeli';

function App() {

  const navigate = useNavigate();

  // =========================
  // STATE UTAMA
  // =========================

  const [menu, setMenu] =
    useState([]);

  // =========================
  // CART LOCAL STORAGE
  // =========================

  const [cart, setCart] =
    useState(() => {

      const savedCart =
        localStorage.getItem(
          "cart"
        );

      return savedCart
        ? JSON.parse(savedCart)
        : {};

    });

  const [activeOrders, setActiveOrders] =
    useState(() => {

      const saved =
        localStorage.getItem(
          "activeOrders"
        );

      return saved
        ? JSON.parse(saved)
        : [];

    });

  const [historyOrders, setHistoryOrders] =
    useState(() => {

      const saved =
        localStorage.getItem(
          "historyOrders"
        );

      return saved
        ? JSON.parse(saved)
        : [];

    });

  const [occupiedTables, setOccupiedTables] =
    useState(() => {

      const saved =
        localStorage.getItem(
          "occupiedTables"
        );

      return saved
        ? JSON.parse(saved)
        : [];

    });

  const [loading, setLoading] =
    useState(true);

  // =========================
  // SIMPAN LOCAL STORAGE
  // =========================

  useEffect(() => {

    localStorage.setItem(
      "cart",
      JSON.stringify(cart)
    );

  }, [cart]);

  useEffect(() => {

    localStorage.setItem(
      "activeOrders",
      JSON.stringify(activeOrders)
    );

  }, [activeOrders]);

  useEffect(() => {

    localStorage.setItem(
      "historyOrders",
      JSON.stringify(historyOrders)
    );

  }, [historyOrders]);

  useEffect(() => {

    localStorage.setItem(
      "occupiedTables",
      JSON.stringify(occupiedTables)
    );

  }, [occupiedTables]);

  // =========================
  // FETCH MENU
  // =========================

  const fetchMenu = async () => {

    try {

      const {
        data,
        error
      } = await supabase
        .from('menu')
        .select('*')
        .order(
          'nama',
          {
            ascending: true
          }
        );

      if (error)
        throw error;

      if (data) {

        setMenu(data);

      }

    } catch (error) {

      console.error(
        "Gagal memuat menu:",
        error.message
      );

      toast.error(
        "Gagal memuat menu"
      );

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    fetchMenu();

  }, []);

  // =========================
  // UPDATE QTY
  // =========================

  const updateQty = (
    id,
    delta
  ) => {

    setCart((prev) => {

      const currentQty =
        prev[id] || 0;

      const newQty =
        Math.max(
          0,
          currentQty + delta
        );

      // HAPUS JIKA 0
      if (newQty === 0) {

        const updated =
          { ...prev };

        delete updated[id];

        return updated;

      }

      return {

        ...prev,

        [id]: newQty

      };

    });

  };

  // =========================
  // CLEAR CART
  // =========================

  const clearCart = () => {

    setCart({});

    localStorage.removeItem(
      "cart"
    );

  };

  // =========================
  // UPDATE STOK MENU
  // =========================

  const updateStokMenu =
    async (
      id,
      status
    ) => {

      try {

        const {
          data,
          error
        } = await supabase
          .from('menu')
          .update({

            stok: status

          })
          .eq(
            'id',
            id
          )
          .select();

        if (error)
          throw error;

        console.log(
          "BERHASIL UPDATE:",
          data
        );

        await fetchMenu();

        toast.success(
          "Stok menu berhasil diperbarui"
        );

      } catch (error) {

        console.error(
          'Gagal update stok:',
          error.message
        );

        toast.error(
          "Gagal update stok menu"
        );

      }

    };

  // =========================
  // PINDAHKAN KE PROSES
  // =========================

  const pindahkanKeProses = (
    meja,
    email,
    payMethod,
    totalHarga,
    cartItems
  ) => {

    const mejaNum =
      parseInt(meja);

    // VALIDASI MEJA
    if (
      occupiedTables.includes(
        mejaNum
      )
    ) {

      toast.error(
        `Meja No. ${mejaNum} sedang digunakan`
      );

      return;

    }

    const itemsOrdered =
      cartItems.map((id) => {

        const m =
          menu.find(
            (item) =>
              String(item.id) ===
              String(id)
          );

        return {

          nama:
            m?.nama ||
            "Menu",

          qty:
            cart[id],

          subtotal:
            (m?.harga || 0) *
            cart[id]

        };

      });

    const newOrder = {

      id:
        "KM-" +
        Date.now()
          .toString()
          .slice(-6),

      meja: mejaNum,

      items: itemsOrdered,

      total: totalHarga,

      status: "diproses",

      metode: payMethod,

      email: email,

      waktu:
        new Date()
          .toLocaleTimeString()

    };

    // TAMBAH ORDER
    setActiveOrders([

      ...activeOrders,

      newOrder

    ]);

    // TAMBAH MEJA AKTIF
    setOccupiedTables([

      ...occupiedTables,

      mejaNum

    ]);

    // CLEAR CART
    clearCart();

    toast.success(
      "Pesanan berhasil diproses"
    );

    navigate(
      '/adminProses-pesanan'
    );

  };

  // =========================
  // TAMBAH MENU
  // =========================

  const tambahMenuBaru =
    (newMenu) => {

      setMenu([

        ...menu,

        {

          ...newMenu,

          id: Date.now(),

          stok: 'ada'

        }

      ]);

      fetchMenu();

      toast.success(
        "Menu berhasil ditambahkan"
      );

    };

  // =========================
  // UBAH KE SELESAI
  // =========================

  const ubahKeSelesai =
    (idx) => {

      const order =
        activeOrders[idx];

      // TAMBAH HISTORY
      setHistoryOrders([

        ...historyOrders,

        {

          ...order,

          status: 'selesai'

        }

      ]);

      // HAPUS MEJA AKTIF
      setOccupiedTables(

        occupiedTables.filter(
          (m) =>
            m !== order.meja
        )

      );

      // HAPUS ACTIVE ORDER
      setActiveOrders(

        activeOrders.filter(
          (_, i) =>
            i !== idx
        )

      );

      toast.success(
        "Pesanan selesai"
      );

      navigate(
        '/riwayat-pesanan'
      );

    };

  // =========================
  // KERANJANG PEMBELI
  // =========================

  const keranjangPembeli =
    menu
      .filter(
        (item) =>
          cart[item.id] > 0
      )
      .map((item) => ({

        ...item,

        qty: cart[item.id]

      }));

  const totalHargaPembeli =
    keranjangPembeli.reduce(

      (total, item) =>

        total +
        (
          Number(item.harga) *
          Number(item.qty)
        ),

      0

    );

  // =========================
  // LOADING
  // =========================

  if (loading) {

    return (

      <div className="h-screen flex items-center justify-center font-bold">

        Memuat Data Kios Mom's...

      </div>

    );

  }

  return (

    <div className="w-full min-h-screen text-[#333] font-['Poppins',sans-serif] overflow-x-hidden">

      <Routes>

        {/* ========================= */}
        {/* ROUTE PEMBELI */}
        {/* ========================= */}

        <Route
          element={<LayoutPembeli />}
        >

          <Route
            path="/"
            element={
              <BerandaPembeli />
            }
          />

          <Route
            path="/daftar-menu"
            element={

              <DaftarMenuPembeli
                menu={menu}
                cart={cart}
                updateQty={updateQty}
              />

            }
          />

          <Route
            path="/keranjang"
            element={

              <KeranjangPembeli
                keranjang={keranjangPembeli}
                updateQty={updateQty}
                hapusMenu={(id) =>
                  updateQty(
                    id,
                    -999
                  )
                }
              />

            }
          />

          <Route
            path="/konfirmasi-pesanan"
            element={

              <KonfirmasiPesananPembeli
                keranjang={keranjangPembeli}
                totalHarga={totalHargaPembeli}
                clearCart={clearCart}
              />

            }
          />

          <Route
            path="/status-pesanan"
            element={
              <StatusPesananPembeli />
            }
          />

          <Route
            path="/riwayat-pesanan-pembeli"
            element={
              <RiwayatPesananPembeli />
            }
          />

        </Route>

        {/* ========================= */}
        {/* ROUTE ADMIN */}
        {/* ========================= */}

        <Route
          path="/admin"
          element={

            <AdminLayout>

              <AdminBeranda />

            </AdminLayout>

          }
        />

        <Route
          path="/buat-pesanan"
          element={

            <AdminLayout>

              <AdminBuatPesanan
                menu={menu}
                cart={cart}
                updateQty={updateQty}
              />

            </AdminLayout>

          }
        />

        <Route
          path="/pesanan"
          element={

            <AdminLayout>

              <AdminPesanan
                cart={cart}
                menu={menu}
                updateQty={updateQty}
                clearCart={clearCart}
                pindahkanKeProses={pindahkanKeProses}
              />

            </AdminLayout>

          }
        />

        <Route
          path="/kelola-menu"
          element={

            <AdminLayout>

              <AdminKelolaMenu
                menu={menu}
                updateStokMenu={updateStokMenu}
                fetchMenu={fetchMenu}
              />

            </AdminLayout>

          }
        />

        <Route
          path="/adminProses-pesanan"
          element={

            <AdminLayout>

              <AdminProsesPesanan
                activeOrders={activeOrders}
                ubahKeSelesai={ubahKeSelesai}
              />

            </AdminLayout>

          }
        />

        <Route
          path="/riwayat-pesanan"
          element={

            <AdminLayout>

              <AdminRiwayatPesanan
                historyOrders={historyOrders}
              />

            </AdminLayout>

          }
        />

        <Route
          path="/laporan"
          element={

            <AdminLayout>

              <HalamanLaporanAdmin />

            </AdminLayout>

          }
        />

      </Routes>

    </div>

  );

}

export default App;