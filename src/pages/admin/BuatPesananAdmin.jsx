import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../../lib/supabaseClient";

const AdminBuatPesanan = ({ cart, updateQty }) => {
  const navigate = useNavigate();
  const [menu, setMenu] = useState([]); // Pastikan nama state konsisten
  const [loading, setLoading] = useState(true);

  const totalItem = Object.values(cart).reduce((a, b) => a + b, 0);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      // Memanggil tabel 'menu' sesuai dashboard Supabase kamu
      const { data, error } = await supabase
        .from('menu') 
        .select('*');
      
      if (error) throw error;
      setMenu(data || []);
    } catch (error) {
      console.error('Error fetching menu:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#002366]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 bg-[#f0f2f5] min-h-screen relative pb-32">
      <h2 className="text-center text-3xl font-black mb-10 text-[#002366]">
        Katalog <span className="text-[#FF8C00]">Kios Mom's</span>
      </h2>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 w-full">
        {/* Menggunakan 'menu.map' (bukan menus) agar sesuai dengan state di atas */}
        {menu.map((m) => (
          <div 
            key={m.id} 
            className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all 
              ${m.stok === 'kosong' || m.stok === 'Habis' ? 'grayscale opacity-60' : 'hover:shadow-lg'}`}
          >
            <div className="aspect-square w-full overflow-hidden relative">
              <img src={m.img} alt={m.nama} className="w-full h-full object-cover" />
              
              {(m.stok === 'kosong' || m.stok === 'Habis') && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                   <span className="text-white font-black text-xl italic -rotate-12 uppercase tracking-tighter">Habis</span>
                </div>
              )}
            </div>

            <div className="p-3 flex flex-col flex-grow justify-between">
              <div>
                <h4 className="font-bold text-gray-800 text-[11px] leading-tight mb-1">{m.nama}</h4>
                <p className="text-[#FF8C00] font-black text-xs">Rp {Number(m.harga).toLocaleString()}</p>
              </div>

              <div className="flex items-center justify-between mt-3 bg-gray-50 rounded-lg p-1">
                <button 
                  onClick={() => updateQty(m.id, -1)} 
                  className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-100"
                >
                  -
                </button>
                <span className="text-xs font-bold">{cart[m.id] || 0}</span>
                <button 
                  onClick={() => (m.stok !== 'kosong' && m.stok !== 'Habis') && updateQty(m.id, 1)}
                  className={`w-6 h-6 flex items-center justify-center rounded shadow-sm text-white transition-colors
                    ${(m.stok === 'kosong' || m.stok === 'Habis') ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#002366] hover:bg-blue-900'}`}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalItem > 0 && (
        <div className="fixed bottom-10 right-6 z-50">
          <button 
            onClick={() => navigate('/pesanan')}
            className="bg-[#FF8C00] text-white flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] font-bold opacity-80 uppercase">Selesai Pilih</span>
              <span className="text-lg font-black">{totalItem} Pesanan</span>
            </div>
            <span className="text-xl">→</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminBuatPesanan;