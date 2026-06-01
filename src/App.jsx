import {
  useState,
  useEffect
} from "react";

import {
  Routes,
  Route,
} from "react-router-dom";

import { supabase }
from "./lib/supabaseClient";

import toast from "react-hot-toast";

import "./App.css";

// =========================
// LAYOUT ADMIN
// =========================

import AdminLayout
from "./layouts/admin/LayoutAdmin";

// =========================
// LAYOUT PEMBELI
// =========================

import LayoutPembeli
from "./layouts/pembeli/LayoutPembeli";

// =========================
// AUTH
// =========================

import LoginAdmin
from "./pages/admin/LoginAdmin";

import ResetPassword
from "./pages/admin/ResetPassword";

import ProtectedRoute
from "./routes/ProtectedRoute";

// =========================
// ADMIN PAGES
// =========================

import AdminBeranda
from "./pages/admin/BerandaAdmin";

import AdminPesanan
from "./pages/admin/PesananAdmin";

import AdminProsesPesanan
from "./pages/admin/AdminProsesPesanan";

import AdminRiwayatPesanan
from "./pages/admin/RiwayatPesananAdmin";

import AdminKelolaMenu
from "./pages/admin/KelolaMenuAdmin";

import AdminBuatPesanan
from "./pages/admin/BuatPesananAdmin";

import HalamanLaporanAdmin
from "./pages/admin/HalamanLaporanAdmin";

// =========================
// PEMBELI PAGES
// =========================

import BerandaPembeli
from "./pages/pembeli/BerandaPembeli";

import DaftarMenuPembeli
from "./pages/pembeli/DaftarMenuPembeli";

import KeranjangPembeli
from "./pages/pembeli/KeranjangPembeli";

import KonfirmasiPesananPembeli
from "./pages/pembeli/KonfirmasiPesananPembeli";

import StatusPesananPembeli
from "./pages/pembeli/StatusPesananPembeli";

import RiwayatPesananPembeli
from "./pages/pembeli/RiwayatPesananPembeli";

function App() {

  // =========================
  // STATE
  // =========================

  const [menu, setMenu] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  // =========================
  // CART
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

  // =========================
  // SAVE CART
  // =========================

  useEffect(() => {

    localStorage.setItem(
      "cart",
      JSON.stringify(cart)
    );

  }, [cart]);

  // =========================
  // FETCH MENU
  // =========================

  const fetchMenu =
    async () => {

      try {

        const {
          data,
          error
        } = await supabase
          .from("menu")
          .select("*")
          .order(
            "nama",
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

  // =========================
  // LOAD MENU
  // =========================

  useEffect(() => {

    fetchMenu();

  }, []);

  // =========================
  // REALTIME MENU
  // =========================

  useEffect(() => {

    const channel =
      supabase
        .channel(
          "menu-realtime"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "menu"
          },
          () => {

            fetchMenu();

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
  // UPDATE QTY
  // =========================

  const updateQty =
    (id, delta) => {

      setCart((prev) => {

        const currentQty =
          prev[id] || 0;

        const newQty =
          Math.max(
            0,
            currentQty + delta
          );

        // HAPUS ITEM
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
          .from("menu")
          .update({

            stok: status

          })
          .eq(
            "id",
            id
          );

        if (error)
          throw error;

      } catch (error) {

        console.error(
          "Gagal update stok:",
          error.message
        );

        toast.error(
          "Gagal update stok menu"
        );

      }

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

        qty:
          cart[item.id]

      }));

  // =========================
  // TOTAL HARGA
  // =========================

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

      <div
        className="
        h-screen
        flex
        items-center
        justify-center
        font-bold
        "
      >

        Memuat Data Kios Mom's...

      </div>

    );

  }

  return (

    <div
      className="
      w-full
      min-h-screen
      text-[#333]
      font-['Poppins',sans-serif]
      overflow-x-hidden
      "
    >

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
        {/* PEMBELI */}
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
                keranjang={
                  keranjangPembeli
                }
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
                keranjang={
                  keranjangPembeli
                }
                totalHarga={
                  totalHargaPembeli
                }
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
        {/* ADMIN */}
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

                <AdminProsesPesanan />

              </AdminLayout>

            </ProtectedRoute>

          }
        />

        <Route
          path="/admin/riwayat-pesanan"
          element={

            <ProtectedRoute>

              <AdminLayout>

                <AdminRiwayatPesanan />

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
                  fetchMenu={fetchMenu}
                  updateStokMenu={
                    updateStokMenu
                  }
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