import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from "./lib/supabaseClient"; 
import './App.css'; 

// Import Layouts
import AdminLayout from './layouts/admin/LayoutAdmin';

// Import Pages
import AdminBeranda from './pages/admin/BerandaAdmin'; 
import AdminPesanan from './pages/admin/PesananAdmin'; 
import AdminProsesPesanan from './pages/admin/AdminProsesPesanan'; 
import AdminRiwayatPesanan from './pages/admin/RiwayatPesananAdmin';
import AdminKelolaMenu from './pages/admin/KelolaMenuAdmin';
import AdminBuatPesanan from './pages/admin/BuatPesananAdmin';
import HalamanLaporanAdmin from './pages/admin/HalamanLaporanAdmin';

function App() {
  const navigate = useNavigate();

  // --- STATE UTAMA ---
  const [menu, setMenu] = useState([]); 
  const [cart, setCart] = useState({});
  const [activeOrders, setActiveOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [occupiedTables, setOccupiedTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fungsi Mengambil Data Menu dari Supabase
  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menu')
        .select('*')
        .order('nama', { ascending: true });
      
      if (error) throw error;
      if (data) setMenu(data);
    } catch (error) {
      console.error("Gagal memuat menu:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Fungsi Update Quantity Keranjang
  const updateQty = (id, delta) => {
    setCart(prev => {
      const currentQty = prev[id] || 0;
      const newQty = Math.max(0, currentQty + delta);
      return { ...prev, [id]: newQty };
    });
  };

  const clearCart = () => setCart({});

  // FUNGSI UPDATE STOK: Menghubungkan Kelola Menu ke Buat Pesanan
  const updateStokMenu = async (id, status) => {

  try {

    console.log("UPDATE STOK:", id, status);

    const { data, error } = await supabase
      .from('menu')
      .update({
        stok: status
      })
      .eq('id', id)
      .select();

    if (error) {

      console.error(error);
      return;

    }

    console.log("BERHASIL UPDATE:", data);

    // REFRESH MENU
    await fetchMenu();

  } catch (error) {

    console.error(
      'Gagal update stok:',
      error.message
    );

  }

};

  const pindahkanKeProses = (meja, email, payMethod, totalHarga, cartItems) => {
    const mejaNum = parseInt(meja);
    if(occupiedTables.includes(mejaNum)) return alert("Meja No. " + mejaNum + " sedang digunakan!");

    const itemsOrdered = cartItems.map(id => {
      const m = menu.find(item => String(item.id) === String(id));
      return { 
        nama: m?.nama || "Menu", 
        qty: cart[id], 
        subtotal: (m?.harga || 0) * cart[id] 
      };
    });

    const newOrder = {
      id: "KM-" + Date.now().toString().slice(-6),
      meja: mejaNum,
      items: itemsOrdered,
      total: totalHarga,
      status: "diproses",
      metode: payMethod,
      waktu: new Date().toLocaleTimeString()
    };

    setActiveOrders([...activeOrders, newOrder]);
    setOccupiedTables([...occupiedTables, mejaNum]);
    setCart({}); 
    navigate('/adminProses-pesanan');
  };

  const tambahMenuBaru = (newMenu) => {
    setMenu([...menu, { ...newMenu, id: Date.now(), stok: 'ada' }]);
    fetchMenu();
  };

  const ubahKeSelesai = (idx) => {
    const order = activeOrders[idx];
    setHistoryOrders([...historyOrders, { ...order, status: 'selesai' }]);
    setOccupiedTables(occupiedTables.filter(m => m !== order.meja));
    setActiveOrders(activeOrders.filter((_, i) => i !== idx));
    alert("Pesanan selesai!");
    navigate('/riwayat-pesanan'); 
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold">Memuat Data Kios Mom's...</div>;

  return (
    <div className="w-full min-h-screen text-[#333] font-['Poppins',sans-serif] overflow-x-hidden">
      <Routes>
        <Route path="/" element={<AdminLayout><AdminBeranda/></AdminLayout>} />
        
        <Route path="/buat-pesanan" element={
          <AdminLayout>
            <AdminBuatPesanan menu={menu} cart={cart} updateQty={updateQty} />
          </AdminLayout>
        } />

        <Route path="/pesanan" element={
          <AdminLayout>
            <AdminPesanan 
              cart={cart} 
              menu={menu} 
              updateQty={updateQty} 
              clearCart={clearCart} 
              pindahkanKeProses={pindahkanKeProses} 
            />
          </AdminLayout>
        } />

        <Route path="/kelola-menu" element={
          <AdminLayout>
            <AdminKelolaMenu 
              menu={menu} 
              updateStokMenu={updateStokMenu} 
              fetchMenu={fetchMenu}
            />
          </AdminLayout>
        } />

        <Route path="/adminProses-pesanan" element={
          <AdminLayout>
            <AdminProsesPesanan activeOrders={activeOrders} ubahKeSelesai={ubahKeSelesai} />
          </AdminLayout>
        } />

        <Route path="/riwayat-pesanan" element={
          <AdminLayout>
            <AdminRiwayatPesanan historyOrders={historyOrders} />
          </AdminLayout>
        } />
        <Route path="/laporan" element={
        <AdminLayout>
            <HalamanLaporanAdmin />
          </AdminLayout>
        } />
        </Routes>
    </div>
  );
}

export default App;