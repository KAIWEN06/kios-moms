import React from 'react';
import AdminHeader from './HeaderAdmin'; // Pastikan path importnya sesuai
import AdminFooter from '../../components/admin/FooterAdmin'; // Pastikan path importnya sesuai

const AdminLayout = ({ children }) => {
  return (
    <div className="w-full min-h-screen flex flex-col bg-[#f0f2f5]">
      {/* HEADER: Akan selalu di atas */}
      <AdminHeader />
      
      {/* INDIKATOR MODE (Opsional, dari kodingan kamu sebelumnya) */}
      <div className="w-full bg-[#FF8C00] text-white text-xs text-center py-1 font-semibold tracking-wider">
        <small>MODE ADMINISTRATOR</small>
      </div>

      {/* KONTEN UTAMA: Akan mengisi sisa ruang tengah layar */}
      <main className="flex-grow w-full">
        {children}
      </main>

      {/* FOOTER: Akan selalu di bawah */}
      <AdminFooter />
    </div>
  );
};

export default AdminLayout;