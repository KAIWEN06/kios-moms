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
// AUTH
// =========================

import LoginAdmin from './pages/admin/adminpages/LoginAdmin';

import ResetPassword from './pages/admin/adminpages/ResetPassword';

import ProtectedRoute from './components/ProtectedRoute';

// =========================
// ADMIN PAGES
// =========================

import AdminBeranda from './pages/admin/adminpages/BerandaAdmin';

import AdminPesanan from './pages/admin/adminpages/PesananAdmin';

import AdminProsesPesanan from './pages/admin/adminpages/AdminProsesPesanan';

import AdminRiwayatPesanan from './pages/admin/adminpages/RiwayatPesananAdmin';

import AdminKelolaMenu from './pages/admin/adminpages/KelolaMenuAdmin';

import AdminBuatPesanan from './pages/admin/adminpages/BuatPesananAdmin';

import HalamanLaporanAdmin from './pages/admin/adminpages/HalamanLaporanAdmin';

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

  const [loading, setLoading] =
    useState(true);

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

  // =========================
  // LOCAL STORAGE SAVE
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

      setMenu(data || []);

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
          error
        } = await supabase
          .from('menu')
          .update({

            stok: status

          })
          .eq(
            'id',
            id
          );

        if (error)
          throw error;

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

    setActiveOrders([

      ...activeOrders,

      newOrder

    ]);

    setOccupiedTables([

      ...occupiedTables,

      mejaNum

    ]);

    clearCart();

    toast.success(
      "Pesanan berhasil diproses"
    );

    navigate(
      '/admin/proses-pesanan'
    );

  };

  // =========================
  // UBAH KE SELESAI
  // =========================

  const ubahKeSelesai =
    (idx) => {

      const order =
        activeOrders[idx];

      setHistoryOrders([

        ...historyOrders,

        {

          ...order,

          status: 'selesai'

        }

      ]);

      setOccupiedTables(

        occupiedTables.filter(
          (m) =>
            m !== order.meja
        )

      );

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
        '/admin/riwayat-pesanan'
      );

    };

  // =========================
  // DATA KERANJANG
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
        {/* AUTH */}
        {/* ========================= */}

        <Route
          path="/admin/login"
          element={<LoginAdmin />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

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
                  updateQty(id, -999)
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
            <ProtectedRoute>

              <AdminLayout>

                <AdminBeranda />

              </AdminLayout>

            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/buat-pesanan"
          element={
            <ProtectedRoute>

              <AdminLayout>

                <AdminBuatPesanan
                  menu={menu}
                  cart={cart}
                  updateQty={updateQty}
                />

              </AdminLayout>

            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/pesanan"
          element={
            <ProtectedRoute>

              <AdminLayout>

                <AdminPesanan
                  cart={cart}
                  menu={menu}
                  updateQty={updateQty}
                  clearCart={clearCart}
                  pindahkanKeProses={pindahkanKeProses}
                />

              </AdminLayout>

            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/proses-pesanan"
          element={
            <ProtectedRoute>

              <AdminLayout>

                <AdminProsesPesanan
                  activeOrders={activeOrders}
                  ubahKeSelesai={ubahKeSelesai}
                />

              </AdminLayout>

            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/riwayat-pesanan"
          element={
            <ProtectedRoute>

              <AdminLayout>

                <AdminRiwayatPesanan
                  historyOrders={historyOrders}
                />

              </AdminLayout>

            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/kelola-menu"
          element={
            <ProtectedRoute>

              <AdminLayout>

                <AdminKelolaMenu
                  menu={menu}
                  updateStokMenu={
                    updateStokMenu
                  }
                  fetchMenu={fetchMenu}
                />

              </AdminLayout>

            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/laporan"
          element={
            <ProtectedRoute>

              <AdminLayout>

                <HalamanLaporanAdmin />

              </AdminLayout>

            </ProtectedRoute>
          }
        />

      </Routes>

    </div>

  );

}

export default App;