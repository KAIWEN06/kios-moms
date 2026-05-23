import React, {
  useEffect,
  useState
} from 'react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { supabase } from '../../lib/supabaseClient';

const HalamanLaporanAdmin = () => {

  // STATE
  const [loading, setLoading] =
    useState(true);

  const [menuTerlaris, setMenuTerlaris] =
    useState([]);

  const [chartData, setChartData] =
    useState([]);

  const [riwayat, setRiwayat] =
    useState([]);

  // STATISTIK
  const [totalPendapatan, setTotalPendapatan] =
    useState(0);

  const [totalPesanan, setTotalPesanan] =
    useState(0);

  const [menuAktif, setMenuAktif] =
    useState(0);

  const [menuNonaktif, setMenuNonaktif] =
    useState(0);

  // FILTER
  const [filter, setFilter] =
    useState('hari');

  // FETCH
  const fetchLaporan = async () => {

    try {

      setLoading(true);

      // HISTORY
      const {
        data: historyData = [],
        error
      } = await supabase
        .from('history_pesanan')
        .select('*')
        .eq('status', 'Selesai');

      if (error) throw error;

      // MENU
      const {
        data: menuData = []
      } = await supabase
        .from('menu')
        .select('*');

      // FILTER
      const now = new Date();

      const filteredHistory =
        historyData.filter((item) => {

          if (!item.created_at)
            return false;

          const tanggal =
            new Date(item.created_at);

          // HARI
          if (filter === 'hari') {

            return (
              tanggal.toDateString() ===
              now.toDateString()
            );

          }

          // MINGGU
          if (filter === 'minggu') {

            const diff =
              (now - tanggal) /
              (1000 * 60 * 60 * 24);

            return diff <= 7;

          }

          // BULAN
          if (filter === 'bulan') {

            return (
              tanggal.getMonth() ===
              now.getMonth()
            );

          }

          return true;

        });

      // TOTAL
      const total =
        filteredHistory.reduce(
          (acc, item) =>
            acc +
            Number(item.total_harga || 0),
          0
        );

      setTotalPendapatan(total);

      setTotalPesanan(
        filteredHistory.length
      );

      setRiwayat(filteredHistory);

      // MENU AKTIF
      setMenuAktif(
        menuData.filter(
          (m) => m.stok !== 'nonaktif'
        ).length
      );

      // MENU NONAKTIF
      setMenuNonaktif(
        menuData.filter(
          (m) =>
            m.stok === 'nonaktif'
        ).length
      );

      // MENU TERLARIS
      const totalMenu = {};

      filteredHistory.forEach(
        (pesanan) => {

          let items = [];

          // ARRAY
          if (
            Array.isArray(
              pesanan.items
            )
          ) {

            items = pesanan.items;

          }

          // STRING JSON
          else if (
            typeof pesanan.items ===
            'string'
          ) {

            try {

              items = JSON.parse(
                pesanan.items
              );

            } catch {

              items = [];

            }

          }

          // LOOP
          items.forEach((item) => {

            if (!item.nama) return;

            const menuAsli =
              menuData.find(
                (m) =>
                  m.nama === item.nama
              );

            if (
              !totalMenu[item.nama]
            ) {

              totalMenu[item.nama] = {

                nama: item.nama,
                total: 0,
                img:
                  menuAsli?.img ||
                  'https://via.placeholder.com/150'

              };

            }

            totalMenu[item.nama].total +=
              Number(item.qty || 0);

          });

        }
      );

      // SORT
      const hasil =
        Object.values(totalMenu)
          .sort(
            (a, b) =>
              b.total - a.total
          );

      setMenuTerlaris(hasil);

      // CHART
      const grafik =
        filteredHistory.map(
          (item, index) => ({

            name: `#${index + 1}`,

            total:
              Number(
                item.total_harga
              ) || 0

          })
        );

      setChartData(grafik);

    } catch (error) {

      console.error(
        'ERROR LAPORAN:',
        error.message
      );

    } finally {

      setLoading(false);

    }

  };

  // FETCH
  useEffect(() => {

    fetchLaporan();

  }, [filter]);

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

      {/* HEADER */}
      <div className="mb-10">

        <h1 className="text-4xl font-black text-[#002366] mb-2">

          Laporan <span className="text-[#FF8C00]">Penjualan</span>

        </h1>

        <p className="text-gray-500">

          Statistik penjualan kios.

        </p>

      </div>

      {/* FILTER */}
      <div className="flex gap-3 mb-10">

        <button
          onClick={() =>
            setFilter('hari')
          }
          className={`px-5 py-3 rounded-2xl font-black ${
            filter === 'hari'
              ? 'bg-[#002366] text-white'
              : 'bg-white'
          }`}
        >

          Hari

        </button>

        <button
          onClick={() =>
            setFilter('minggu')
          }
          className={`px-5 py-3 rounded-2xl font-black ${
            filter === 'minggu'
              ? 'bg-[#002366] text-white'
              : 'bg-white'
          }`}
        >

          Minggu

        </button>

        <button
          onClick={() =>
            setFilter('bulan')
          }
          className={`px-5 py-3 rounded-2xl font-black ${
            filter === 'bulan'
              ? 'bg-[#002366] text-white'
              : 'bg-white'
          }`}
        >

          Bulan

        </button>

      </div>

      {/* STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

        <div className="bg-white rounded-[30px] p-6 shadow-sm">

          <p className="text-gray-400 text-sm mb-2">

            Pendapatan

          </p>

          <h2 className="text-3xl font-black text-[#002366]">

            Rp {totalPendapatan.toLocaleString()}

          </h2>

        </div>

        <div className="bg-white rounded-[30px] p-6 shadow-sm">

          <p className="text-gray-400 text-sm mb-2">

            Pesanan

          </p>

          <h2 className="text-3xl font-black text-[#FF8C00]">

            {totalPesanan}

          </h2>

        </div>

        <div className="bg-white rounded-[30px] p-6 shadow-sm">

          <p className="text-gray-400 text-sm mb-2">

            Menu Aktif

          </p>

          <h2 className="text-3xl font-black text-green-500">

            {menuAktif}

          </h2>

        </div>

        <div className="bg-white rounded-[30px] p-6 shadow-sm">

          <p className="text-gray-400 text-sm mb-2">

            Menu Nonaktif

          </p>

          <h2 className="text-3xl font-black text-red-500">

            {menuNonaktif}

          </h2>

        </div>

      </div>

      {/* CHART */}
      <div className="bg-white rounded-[35px] p-8 shadow-sm mb-10">

        <h2 className="text-2xl font-black text-[#002366] mb-8">

          Grafik Penjualan

        </h2>

        <ResponsiveContainer
          width="100%"
          height={300}
        >

          <LineChart data={chartData}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="name" />

            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="total"
              stroke="#FF8C00"
              strokeWidth={4}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

      {/* MENU TERLARIS */}
      <div className="bg-white rounded-[35px] p-8 shadow-sm mb-10">

        <h2 className="text-2xl font-black text-[#002366] mb-8">

          Menu Terlaris

        </h2>

        <div className="space-y-4">

          {menuTerlaris.map(
            (menu, index) => (

              <div
                key={index}
                className="flex items-center justify-between bg-[#f8f9fc] rounded-2xl p-5"
              >

                <div className="flex items-center gap-5">

                  <img
                    src={menu.img}
                    alt={menu.nama}
                    className="w-20 h-20 rounded-2xl object-cover"
                  />

                  <div>

                    <h3 className="font-black text-xl text-[#002366]">

                      {menu.nama}

                    </h3>

                    <p className="text-gray-400">

                      Ranking #{index + 1}

                    </p>

                  </div>

                </div>

                <h2 className="text-3xl font-black text-[#FF8C00]">

                  {menu.total}x

                </h2>

              </div>

            )
          )}

        </div>

      </div>

    </div>

  );

};

export default HalamanLaporanAdmin;