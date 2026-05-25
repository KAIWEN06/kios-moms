import { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';

import { supabase } from "./lib/supabaseClient";
import './App.css';

// Protected Route
import ProtectedRoute from './routes/ProtectedRoute';

// Layout
import AdminLayout from './layouts/admin/LayoutAdmin';

// Pages
import LoginAdmin from './pages/admin/LoginAdmin';
import ResetPassword from './pages/admin/ResetPassword';
import AdminBeranda from './pages/admin/BerandaAdmin';
import AdminPesanan from './pages/admin/PesananAdmin';
import AdminProsesPesanan from './pages/admin/AdminProsesPesanan';
import AdminRiwayatPesanan from './pages/admin/RiwayatPesananAdmin';
import AdminKelolaMenu from './pages/admin/KelolaMenuAdmin';
import AdminBuatPesanan from './pages/admin/BuatPesananAdmin';
import HalamanLaporanAdmin from './pages/admin/HalamanLaporanAdmin';

function App() {

  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [activeOrders, setActiveOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [occupiedTables, setOccupiedTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // FETCH MENU
  // =========================

  const fetchMenu = async () => {

    try {

      const { data, error } = await supabase
        .from('menu')
        .select('*')
        .order('nama', { ascending: true });

      if (error) throw error;

      if (data) {
        setMenu(data);
      }

    } catch (error) {

      console.error(
        "Gagal memuat menu:",
        error.message
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

  const updateQty = (id, delta) => {

    setCart(prev => {

      const currentQty = prev[id] || 0;

      const newQty = Math.max(
        0,
        currentQty + delta
      );

      return {
        ...prev,
        [id]: newQty
      };
    });
  };

  // =========================
  // CLEAR CART
  // =========================

  const clearCart = () => setCart({});

  // =========================
  // UPDATE STOK MENU
  // =========================

  const updateStokMenu = async (
    id,
    status
  ) => {

    try {

      const { error } = await supabase
        .from('menu')
        .update({
          stok: status
        })
        .eq('id', id);

      if (error) throw error;

      await fetchMenu();

    } catch (error) {

      console.error(
        'Gagal update stok:',
        error.message
      );

    }
  };

  // =========================
  // PINDAH KE PROSES
  // =========================

  const pindahkanKeProses = (
    meja,
    email,
    payMethod,
    totalHarga,
    cartItems
  ) => {

    const mejaNum = parseInt(meja);

    if (
      occupiedTables.includes(mejaNum)
    ) {

      return alert(
        `Meja No. ${mejaNum} sedang digunakan!`
      );
    }

    const itemsOrdered =
      cartItems.map(id => {

        const m = menu.find(
          item =>
            String(item.id) === String(id)
        );

        return {
          nama: m?.nama || "Menu",
          qty: cart[id],
          subtotal:
            (m?.harga || 0) * cart[id]
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
      waktu:
        new Date().toLocaleTimeString()
    };

    setActiveOrders([
      ...activeOrders,
      newOrder
    ]);

    setOccupiedTables([
      ...occupiedTables,
      mejaNum
    ]);

    setCart({});

    navigate(
      '/admin/proses-pesanan'
    );
  };

  // =========================
  // UBAH KE SELESAI
  // =========================

  const ubahKeSelesai = (idx) => {

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
        m => m !== order.meja
      )
    );

    setActiveOrders(
      activeOrders.filter(
        (_, i) => i !== idx
      )
    );

    alert("Pesanan selesai!");

    navigate(
      '/admin/riwayat-pesanan'
    );
  };

// =========================
// AUTH LISTENER
// =========================

useEffect(() => {

  const {
    data: listener
  } = supabase.auth
    .onAuthStateChange(
      (_event, session) => {

        const currentPath =
          window.location.pathname;

        // JANGAN REDIRECT
        // SAAT RESET PASSWORD

        if (
          !session &&
          currentPath !==
            '/reset-password'
        ) {

          navigate(
            '/admin/login'
          );
        }
      }
    );

  return () => {

    listener.subscription
      .unsubscribe();
  };

}, [navigate]);
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
        {/* LOGIN */}
        {/* ========================= */}

        <Route
          path="/"
          element={<LoginAdmin />}
        />

        <Route
          path="/admin/login"
          element={<LoginAdmin />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* ========================= */}
        {/* BERANDA ADMIN */}
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

        {/* ========================= */}
        {/* BUAT PESANAN */}
        {/* ========================= */}

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

        {/* ========================= */}
        {/* PESANAN */}
        {/* ========================= */}

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
                  pindahkanKeProses={
                    pindahkanKeProses
                  }
                />

              </AdminLayout>

            </ProtectedRoute>
          }
        />

        {/* ========================= */}
        {/* PROSES PESANAN */}
        {/* ========================= */}

        <Route
          path="/admin/proses-pesanan"
          element={
            <ProtectedRoute>

              <AdminLayout>

                <AdminProsesPesanan
                  activeOrders={
                    activeOrders
                  }
                  ubahKeSelesai={
                    ubahKeSelesai
                  }
                />

              </AdminLayout>

            </ProtectedRoute>
          }
        />

        {/* ========================= */}
        {/* RIWAYAT */}
        {/* ========================= */}

        <Route
          path="/admin/riwayat-pesanan"
          element={
            <ProtectedRoute>

              <AdminLayout>

                <AdminRiwayatPesanan
                  historyOrders={
                    historyOrders
                  }
                />

              </AdminLayout>

            </ProtectedRoute>
          }
        />

        {/* ========================= */}
        {/* KELOLA MENU */}
        {/* ========================= */}

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

        {/* ========================= */}
        {/* LAPORAN */}
        {/* ========================= */}

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