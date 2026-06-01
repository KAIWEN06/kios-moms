import React from 'react';

const AdminFooter = () => {
  return (
    <footer className="w-full py-5 text-center text-xs font-medium text-slate-400 border-t border-slate-100 bg-white">
      <p>&copy; {new Date().getFullYear()} Kios Mom's Admin Panel. semua hak dilindungi.</p>
    </footer>
  );
};

export default AdminFooter;