import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const HalamanLaporanAdmin = () => {

  const [menuTerlaris, setMenuTerlaris] = useState([]);
  const [loading, setLoading] = useState(true);

  // FETCH LAPORAN
  const fetchLaporan = async () => {

    try {

      setLoading(true);

      // AMBIL HISTORY
      const { data: historyData, error } = await supabase
        .from('history_pesanan')
        .select('*')
        .eq('status', 'Selesai');

      if (error) throw error;

      // AMBIL MENU
      const { data: menuData } = await supabase
        .from('menu')
        .select('*');

      // TOTAL MENU
      const totalMenu = {};

      historyData.forEach((pesanan) => {

        let items = [];

        // PARSE ITEMS
        if (Array.isArray(pesanan.items)) {

          items = pesanan.items;

        } else if (
          typeof pesanan.items === 'string'
        ) {

          try {

            items = JSON.parse(
              pesanan.items
            );

          } catch {

            items = [];

          }

        }

        // HITUNG TOTAL
        items.forEach((item) => {

          // CARI DATA MENU
          const menuAsli = menuData.find(
            (m) => m.nama === item.nama
          );

          if (!totalMenu[item.nama]) {

            totalMenu[item.nama] = {
              nama: item.nama,
              total: 0,
              img: menuAsli?.img || '',
            };

          }

          totalMenu[item.nama].total += item.qty;

        });

      });

      // SORT
      const hasil =
        Object.values(totalMenu)
          .sort(
            (a, b) =>
              b.total - a.total
          );

      setMenuTerlaris(hasil);

    } catch (error) {

      console.error(
        'Gagal mengambil laporan:',
        error.message
      );

    } finally {

      setLoading(false);

    }

  };

  // FETCH AWAL
  useEffect(() => {

    fetchLaporan();

  }, []);

  // LOADING
  if (loading) {

    return (

      <div className="flex items-center justify-center min-h-screen bg-[#f0f2f5]">

        <div className="w-12 h-12 border-4 border-[#002366] border-t-transparent rounded-full animate-spin"></div>

      </div>

    );

  }

  return (

    <div className="p-4 md:p-10 bg-[#f0f2f5] min-h-screen">

      {/* TITLE */}
      <div className="mb-10">

        <h1 className="text-4xl font-black text-[#002366] mb-2">

          Laporan <span className="text-[#FF8C00]">Penjualan</span>

        </h1>

        <p className="text-gray-500 font-medium">

          Daftar menu paling sering dipesan pelanggan.

        </p>

      </div>

      {/* CARD */}
      <div className="bg-white rounded-[35px] p-8 shadow-md border overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">

          <div>

            <h2 className="text-2xl font-black text-[#002366]">

              Menu Terlaris

            </h2>

            <p className="text-sm text-gray-400 mt-1">

              Berdasarkan total pesanan selesai.

            </p>

          </div>

          <div className="bg-[#FF8C00] text-white px-4 py-2 rounded-2xl text-sm font-black shadow-md">

            {menuTerlaris.length} MENU

          </div>

        </div>

        {/* EMPTY */}
        {menuTerlaris.length === 0 ? (

          <div className="text-center py-20 text-gray-400 italic border-2 border-dashed rounded-3xl">

            Belum ada data penjualan.

          </div>

        ) : (

          <div className="space-y-4">

            {menuTerlaris.map((menu, index) => (

              <div
                key={index}
                className="flex items-center justify-between bg-[#f8f9fc] rounded-2xl p-5 border hover:shadow-md transition-all"
              >

                {/* LEFT */}
                <div className="flex items-center gap-5">

                  {/* GAMBAR */}
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-md border bg-white">

                    <img
                      src={menu.img}
                      alt={menu.nama}
                      className="w-full h-full object-cover"
                    />

                    {/* RANK */}
                    <div className="absolute top-2 left-2 bg-[#FF8C00] text-white text-[11px] px-2 py-1 rounded-lg font-black shadow">

                      #{index + 1}

                    </div>

                  </div>

                  {/* INFO */}
                  <div>

                    <h3 className="font-black text-2xl text-[#002366]">

                      {menu.nama}

                    </h3>

                    <p className="text-gray-400 text-base mt-1">

                      Menu favorit pelanggan

                    </p>

                  </div>

                </div>

                {/* RIGHT */}
                <div className="text-right">

                  <p className="text-sm text-gray-400 uppercase font-bold mb-1">

                    Total Dipesan

                  </p>

                  <h2 className="text-4xl font-black text-[#FF8C00]">

                    {menu.total}x

                  </h2>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>

  );

};

export default HalamanLaporanAdmin;