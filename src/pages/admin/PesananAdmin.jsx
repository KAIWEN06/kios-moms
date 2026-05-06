import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../../lib/supabaseClient";

// Tambahkan props 'pindahkanKeProses' agar bisa dipanggil di sini
const PesananAdmin = ({ cart = {}, menu = [], updateQty, clearCart, pindahkanKeProses }) => {
  const navigate = useNavigate();
  const [meja, setMeja] = useState('');
  const [payMethod, setPayMethod] = useState('Tunai');
  const [loading, setLoading] = useState(false);

  const cartItems = Object.keys(cart).filter(id => cart[id] > 0);
  
  let totalHarga = 0;
  cartItems.forEach(id => {
    // Gunakan String(id) untuk memastikan kecocokan ID dari database
    const m = menu.find(item => String(item.id) === String(id));
    if (m) totalHarga += m.harga * cart[id];
  });

  const handleMejaChange = (e) => {
    const value = e.target.value;
    if (value === "") { setMeja(""); return; }
    const num = parseInt(value);
    if (num >= 1 && num <= 100) { setMeja(num); } 
    else if (num > 100) { setMeja(100); }
  };

  const handleProsesPesanan = async () => {
    if (!meja || cartItems.length === 0) return;

    setLoading(true);
    try {
      // 1. Simpan ke Database Supabase (History)
      const { error } = await supabase
        .from('history_pesanan')
        .insert([
          { 
            nomor_meja: parseInt(meja), 
            total_harga: totalHarga, 
            metode_pembayaran: payMethod, 
            status: 'Diproses' 
          }
        ]);

      if (error) throw error;

      // 2. PANGGIL FUNGSI INI (PENTING!)
      // Ini agar pesanan muncul di halaman "Admin Proses Pesanan"
      if (pindahkanKeProses) {
        pindahkanKeProses(
          meja, 
          "", // Email (kosongkan saja)
          payMethod, 
          totalHarga, 
          cartItems, 
          menu
        );
      }

      alert("Pesanan meja " + meja + " berhasil diproses!");
      
      // 3. Bersihkan keranjang
      if (clearCart) clearCart(); 
      
      // Navigasi sudah ditangani di dalam fungsi 'pindahkanKeProses' di App.jsx
      
    } catch (error) {
      console.error("Gagal menyimpan pesanan:", error.message);
      alert("Terjadi kesalahan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-10 bg-[#f0f2f5] min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        <button 
          onClick={() => navigate('/buat-pesanan')} 
          className="group mb-6 flex items-center gap-2 text-gray-500 hover:text-[#002366] transition-colors font-semibold"
        >
          <span className="bg-white p-2 rounded-full shadow-sm group-hover:bg-[#002366] group-hover:text-white transition-all text-lg">←</span>
          Kembali Pilih Menu
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-8 space-y-4">
            <h3 className="font-black text-2xl text-gray-800 mb-2">Ringkasan <span className="text-[#FF8C00]">Menu</span></h3>
            
            {cartItems.length === 0 ? (
              <div className="bg-white p-20 rounded-3xl text-center border-2 border-dashed border-gray-200">
                <p className="text-gray-400 italic">Belum ada menu yang dipilih.</p>
              </div>
            ) : (
              cartItems.map(id => {
                const qty = cart[id];
                const m = menu.find(item => String(item.id) === String(id));
                if (!m) return null;
                const sub = m.harga * qty;

                return (
                  <div key={id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <img src={m.img} alt={m.nama} className="w-16 h-16 rounded-xl object-cover" />
                      <div>
                        <h5 className="font-bold text-gray-800">{m.nama}</h5>
                        <p className="text-xs text-[#FF8C00] font-bold">Rp {m.harga.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border">
                        <button onClick={() => updateQty(m.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-[#002366]">-</button>
                        <span className="font-black text-sm w-4 text-center">{qty}</span>
                        <button onClick={() => updateQty(m.id, 1)} className="w-8 h-8 flex items-center justify-center bg-[#002366] text-white rounded-lg shadow-sm font-bold">+</button>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <strong className="text-lg text-[#002366]">Rp {sub.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="lg:col-span-4 sticky top-24">
            <div className="bg-white p-8 rounded-[35px] shadow-2xl border border-gray-50">
              <h3 className="font-black text-xl text-gray-800 mb-6 border-b pb-4">Konfirmasi <span className="text-[#FF8C00]">Meja</span></h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nomor Meja (1-100)</label>
                  <input 
                    type="number" 
                    value={meja} 
                    onChange={handleMejaChange}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-2xl text-center text-[#002366] focus:border-[#FF8C00] outline-none transition-all" 
                    placeholder="0" 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Metode Pembayaran</label>
                  <select 
                    value={payMethod} 
                    onChange={e => setPayMethod(e.target.value)} 
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-[#002366] outline-none cursor-pointer"
                  >
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="QRIS">QRIS / Transfer</option>
                  </select>
                </div>

                <div className="bg-[#002366] p-6 rounded-3xl text-white shadow-xl">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold">Total Bayar</span>
                    <span className="text-2xl font-black text-[#FF8C00]">Rp {totalHarga.toLocaleString()}</span>
                  </div>
                </div>

                <button 
                  onClick={handleProsesPesanan}
                  disabled={!meja || cartItems.length === 0 || loading}
                  className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all duration-300 ${
                    !meja || cartItems.length === 0 || loading
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none' 
                      : 'bg-[#FF8C00] text-white hover:bg-orange-600 hover:-translate-y-1 active:scale-95 shadow-orange-200'
                  }`}
                >
                  {loading ? 'Sabar, Sedang Memproses...' : 'Proses Pesanan Sekarang'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PesananAdmin;