import React from 'react';
import AdminHeader from './HeaderAdmin'; // Pastikan path importnya sesuai
import AdminFooter from '../../components/admin/FooterAdmin'; // Pastikan path importnya sesuai

const AdminLayout = ({ children }) => {
  return (
    <div className="w-full min-h-screen flex flex-col bg-[#f0f2f5]">
      {/* HEADER: Akan selalu di atas */}
      <AdminHeader />
    

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