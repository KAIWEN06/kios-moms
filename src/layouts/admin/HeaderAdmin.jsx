import React from 'react';
import { NavLink } from 'react-router-dom';

const HeaderAdmin = () => {
  // Daftar menu navigasi
  const menuItems = [
    { name: 'Beranda', path: '/' },
    { name: 'Buat Pesanan', path: '/buat-pesanan' },
    { name: 'Pesanan', path: '/pesanan' },
    { name: 'Proses Pesanan', path: '/adminProses-pesanan' },
    { name: 'Riwayat Pesanan', path: '/riwayat-pesanan' },
    { name: 'Kelola Menu', path: '/kelola-menu' },
  ];

  return (
    <header className="bg-[#002366] text-white py-6 px-4 shadow-md sticky top-0 z-[100]">
      <div className="max-w-7xl mx-auto flex justify-center items-center">
        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 items-center">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                // LOGIKA: Jika path aktif (sedang dibuka), teks otomatis jadi Orange [#FF8C00]
                className={({ isActive }) =>
                  `text-[15px] font-medium transition-all duration-300 hover:text-[#FF8C00] ${
                    isActive ? 'text-[#FF8C00] font-bold' : 'text-white'
                  }`
                }
              >
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
};

export default HeaderAdmin;