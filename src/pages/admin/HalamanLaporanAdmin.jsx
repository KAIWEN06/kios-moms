// =========================
// IMPORT
// =========================

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

// DOWNLOAD PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// =========================
// COMPONENT
// =========================

const HalamanLaporanAdmin = () => {

  // =========================
  // STATE
  // =========================

  const [loading, setLoading] =
    useState(true);

  const [allHistory, setAllHistory] =
    useState([]);

  const [filteredHistory, setFilteredHistory] =
    useState([]);

  const [chartData, setChartData] =
    useState([]);

  const [menuTerlaris, setMenuTerlaris] =
    useState([]);

  // FILTER
  const [filter, setFilter] =
    useState('bulan');

  // DATE
  const now = new Date();

  const [selectedYear, setSelectedYear] =
    useState(now.getFullYear());

  const [selectedMonth, setSelectedMonth] =
    useState(now.getMonth());

  const [selectedDay, setSelectedDay] =
    useState(now.getDate());

  const [selectedWeek, setSelectedWeek] =
    useState(1);

  // TOTAL
  const [totalPendapatan, setTotalPendapatan] =
    useState(0);

  const [totalPesanan, setTotalPesanan] =
    useState(0);

  // =========================
  // CONSTANT
  // =========================

  const namaHari = [
    'Minggu',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu'
  ];

  const namaBulan = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember'
  ];

  // =========================
  // FETCH DATA
  // =========================

  const fetchData = async () => {

    try {

      setLoading(true);

      const {
        data,
        error
      } = await supabase
        .from('history_pesanan')
        .select('*')
        .eq('status', 'Selesai');

      if (error) throw error;

      setAllHistory(data || []);

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    fetchData();

  }, []);

  // =========================
  // FILTER DATA
  // =========================

  useEffect(() => {

    let hasil = [];

    // HARI
    if (filter === 'hari') {

      hasil = allHistory.filter((item) => {

        const d =
          new Date(item.created_at);

        return (

          d.getFullYear() ===
            Number(selectedYear) &&

          d.getMonth() ===
            Number(selectedMonth) &&

          d.getDate() ===
            Number(selectedDay)

        );

      });

    }

    // MINGGU
    else if (
      filter === 'minggu'
    ) {

      const start =
        (selectedWeek - 1) * 7 + 1;

      const end =
        start + 6;

      hasil = allHistory.filter((item) => {

        const d =
          new Date(item.created_at);

        return (

          d.getFullYear() ===
            Number(selectedYear) &&

          d.getMonth() ===
            Number(selectedMonth) &&

          d.getDate() >= start &&
          d.getDate() <= end

        );

      });

    }

    // BULAN
    else if (
      filter === 'bulan'
    ) {

      hasil = allHistory.filter((item) => {

        const d =
          new Date(item.created_at);

        return (

          d.getFullYear() ===
            Number(selectedYear) &&

          d.getMonth() ===
            Number(selectedMonth)

        );

      });

    }

    // TAHUN
    else {

      hasil = allHistory.filter((item) => {

        const d =
          new Date(item.created_at);

        return (

          d.getFullYear() ===
          Number(selectedYear)

        );

      });

    }

    setFilteredHistory(hasil);

    // =========================
    // TOTAL
    // =========================

    const total =
      hasil.reduce(
        (a, b) =>
          a +
          Number(b.total_harga || 0),
        0
      );

    setTotalPendapatan(total);

    setTotalPesanan(
      hasil.length
    );

    // =========================
    // MENU TERLARIS
    // =========================

    const totalMenu = {};

    hasil.forEach((pesanan) => {

      let items = [];

      if (
        Array.isArray(
          pesanan.items
        )
      ) {

        items = pesanan.items;

      }

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

      items.forEach((item) => {

        if (!item.nama) return;

        if (
          !totalMenu[item.nama]
        ) {

          totalMenu[item.nama] = {

            nama: item.nama,
            total: 0

          };

        }

        totalMenu[item.nama].total +=
          Number(item.qty || 0);

      });

    });

    setMenuTerlaris(
      Object.values(totalMenu)
        .sort(
          (a, b) =>
            b.total - a.total
        )
    );

    // =========================
    // CHART
    // =========================

    // HARI
    if (filter === 'hari') {

      const nama =
        namaHari[
          new Date(
            selectedYear,
            selectedMonth,
            selectedDay
          ).getDay()
        ];

      setChartData([
        {
          name: nama,
          total
        }
      ]);

    }

    // MINGGU
    else if (
      filter === 'minggu'
    ) {

      const grafik = [];

      for (
        let i = 1;
        i <= 7;
        i++
      ) {

        const tanggal =
          (selectedWeek - 1) * 7 + i;

        const totalHari =
          hasil
            .filter((item) => {

              const d =
                new Date(
                  item.created_at
                );

              return (
                d.getDate() ===
                tanggal
              );

            })
            .reduce(
              (a, b) =>
                a +
                Number(
                  b.total_harga
                ),
              0
            );

        grafik.push({

          name:
            namaHari[
              new Date(
                selectedYear,
                selectedMonth,
                tanggal
              ).getDay()
            ],

          total:
            totalHari

        });

      }

      setChartData(grafik);

    }

    // BULAN
    else if (
      filter === 'bulan'
    ) {

      setChartData([
        {
          name:
            namaBulan[
              selectedMonth
            ],
          total
        }
      ]);

    }

    // TAHUN
    else {

      const grafik = [];

      for (
        let i = 0;
        i < 12;
        i++
      ) {

        const totalBulan =
          allHistory
            .filter((item) => {

              const d =
                new Date(
                  item.created_at
                );

              return (

                d.getFullYear() ===
                  Number(
                    selectedYear
                  ) &&

                d.getMonth() === i

              );

            })
            .reduce(
              (a, b) =>
                a +
                Number(
                  b.total_harga
                ),
              0
            );

        grafik.push({

          name:
            namaBulan[i],

          total:
            totalBulan

        });

      }

      setChartData(grafik);

    }

  }, [
    allHistory,
    filter,
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedWeek
  ]);

  // =========================
  // DOWNLOAD PDF
  // =========================

  const downloadPDF = () => {

    const doc =
      new jsPDF();

    // TITLE
    doc.setFontSize(20);

    doc.text(
      'LAPORAN KEUANGAN',
      14,
      20
    );

    doc.setFontSize(12);

    doc.text(
      `Filter : ${filter.toUpperCase()}`,
      14,
      30
    );

    // TOTAL
    doc.text(
      `Total Pendapatan : Rp ${totalPendapatan.toLocaleString()}`,
      14,
      40
    );

    doc.text(
      `Total Pesanan : ${totalPesanan}`,
      14,
      48
    );

    // TABLE
    autoTable(doc, {

      startY: 60,

      head: [[
        'Kode',
        'Meja',
        'Tanggal',
        'Metode',
        'Total'
      ]],

      body:
        filteredHistory.map(
          (item) => [

            item.kode_pesanan,

            `Meja ${item.nomor_meja}`,

            new Date(
              item.created_at
            ).toLocaleString('id-ID'),

            item.metode_pembayaran,

            `Rp ${Number(
              item.total_harga
            ).toLocaleString()}`

          ]
        )

    });

    // MENU TERLARIS
    let lastY =
      doc.lastAutoTable.finalY + 15;

    doc.setFontSize(16);

    doc.text(
      'Menu Terlaris',
      14,
      lastY
    );

    autoTable(doc, {

      startY: lastY + 5,

      head: [[
        'Ranking',
        'Menu',
        'Total Terjual'
      ]],

      body:
        menuTerlaris.map(
          (menu, index) => [

            `#${index + 1}`,

            menu.nama,

            `${menu.total}x`

          ]
        )

    });

    // SAVE
    doc.save(
      `laporan-${filter}.pdf`
    );

  };

  // =========================
  // LOADING
  // =========================

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
      <div className="flex flex-wrap items-center justify-between gap-5 mb-10">

        <div>

          <h1 className="text-4xl font-black text-[#002366]">

            Laporan <span className="text-[#FF8C00]">Penjualan</span>

          </h1>

          <p className="text-gray-500 mt-2">

            Statistik penjualan kios.

          </p>

        </div>

        {/* DOWNLOAD */}
        <button
          onClick={downloadPDF}
          className="bg-[#FF8C00] hover:bg-orange-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg transition-all"
        >

          Download Laporan

        </button>

      </div>

      {/* FILTER */}
      <div className="flex flex-wrap gap-3 mb-10">

        {[
          'hari',
          'minggu',
          'bulan',
          'tahun'
        ].map((item) => (

          <button
            key={item}
            onClick={() =>
              setFilter(item)
            }
            className={`px-5 py-3 rounded-2xl font-black capitalize

            ${
              filter === item

                ? 'bg-[#002366] text-white'

                : 'bg-white text-gray-500'
            }`}
          >

            {item}

          </button>

        ))}

      </div>

      {/* CARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

        <div className="bg-white rounded-[35px] p-7 shadow-sm">

          <p className="text-gray-400 mb-2">

            Pendapatan

          </p>

          <h1 className="text-4xl font-black text-[#002366]">

            Rp {totalPendapatan.toLocaleString()}

          </h1>

        </div>

        <div className="bg-white rounded-[35px] p-7 shadow-sm">

          <p className="text-gray-400 mb-2">

            Total Pesanan

          </p>

          <h1 className="text-4xl font-black text-[#FF8C00]">

            {totalPesanan}

          </h1>

        </div>

      </div>

      {/* GRAFIK */}
      <div className="bg-white rounded-[35px] p-8 shadow-sm mb-10">

        <h2 className="text-2xl font-black text-[#002366] mb-8">

          Grafik Keuangan

        </h2>

        <ResponsiveContainer
          width="100%"
          height={350}
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
      <div className="bg-white rounded-[35px] p-8 shadow-sm">

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

                <div>

                  <h3 className="font-black text-xl text-[#002366]">

                    {menu.nama}

                  </h3>

                  <p className="text-gray-400">

                    Ranking #{index + 1}

                  </p>

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