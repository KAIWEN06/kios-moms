import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminBeranda = () => {
  const navigate = useNavigate();

  return (
    <section 
      className="min-h-screen flex items-center justify-center text-center text-white bg-cover bg-center -mt-[70px] pt-[70px]"
      style={{
        backgroundImage: "linear-gradient(rgba(0,35,102,0.7), rgba(0,35,102,0.7)), url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1350&q=80')"
      }}
    >
      <div className="z-10 px-5">
        <span className="block mb-2 text-sm tracking-widest uppercase text-[#FF8C00] font-semibold">Megamas Manado</span>
        <h1 className="text-4xl md:text-[3.5rem] leading-tight mb-3 font-bold">Selamat Datang, Admin</h1>
        <p className="text-base mb-8 max-w-xl mx-auto opacity-90">Kelola operasional Kios Mom's secara digital dan efisien.</p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button 
            className="bg-[#FF8C00] text-white px-8 py-3 rounded-full font-semibold hover:scale-105 transition-all w-full sm:w-auto"
            onClick={() => navigate('/buat-pesanan')}
          >
            Mulai Pesan
          </button>
          
          <button 
            className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-[#002366] transition-all w-full sm:w-auto"
            onClick={() => navigate('/adminProses-pesanan')} // PERBAIKAN: Mengarah ke Proses Pesanan
          >
            Cek Status
          </button>
        </div>
      </div>
    </section>
  );
};

export default AdminBeranda;