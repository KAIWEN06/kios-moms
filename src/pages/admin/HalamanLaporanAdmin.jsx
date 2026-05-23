import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

import { supabase } from '../../lib/supabaseClient';

const HalamanLaporanAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [menuTerlaris, setMenuTerlaris] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [historyData, setHistoryData] = useState([]);

  const [totalPendapatan, setTotalPendapatan] = useState(0);
  const [totalPesanan, setTotalPesanan] = useState(0);
  const [menuAktif, setMenuAktif] = useState(0);
  const [menuNonaktif, setMenuNonaktif] = useState(0);

  const [filter, setFilter] = useState('hari');
  const now = new Date();

  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(Math.ceil(now.getDate() / 7));

  const [menuData, setMenuData] = useState([]);

  const bulanList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const allWeekRanges = useMemo(() => {
    const totalDays = getDaysInMonth(selectedMonth, selectedYear);
    const weeks = [];

    for (let w = 1; w <= 5; w++) {
      const startDay = (w - 1) * 7 + 1;
      if (startDay > totalDays) break;

      let endDay = w * 7;
      if (endDay > totalDays) {
        endDay = totalDays;
      }

      const startStr = String(startDay).padStart(2, '0');
      const endStr = String(endDay).padStart(2, '0');
      const namaBulanSingkat = bulanList[selectedMonth].substring(0, 3);

      weeks.push({
        weekNum: w,
        label: `Minggu ${w} (${startStr} ${namaBulanSingkat} - ${endStr} ${namaBulanSingkat})`,
        startDay,
        endDay
      });
    }
    return weeks;
  }, [selectedMonth, selectedYear]);

  const availableYears = useMemo(() => {
    const years = historyData.map(
      (item) => new Date(item.created_at).getFullYear()
    );
    return [...new Set(years)].sort((a, b) => b - a);
  }, [historyData]);

  const availableMonths = useMemo(() => {
    const months = historyData
      .filter((item) => new Date(item.created_at).getFullYear() === selectedYear)
      .map((item) => new Date(item.created_at).getMonth());
    return [...new Set(months)];
  }, [historyData, selectedYear]);

  const availableDays = useMemo(() => {
    const days = historyData
      .filter((item) => {
        const date = new Date(item.created_at);
        return (
          date.getMonth() === selectedMonth &&
          date.getFullYear() === selectedYear
        );
      })
      .map((item) => new Date(item.created_at).getDate());
    return [...new Set(days)];
  }, [historyData, selectedMonth, selectedYear]);

  const availableWeeks = useMemo(() => {
    const weeksWithData = [];
    
    historyData.forEach((item) => {
      const date = new Date(item.created_at);
      if (date.getMonth() === selectedMonth && date.getFullYear() === selectedYear) {
        const tglHari = date.getDate();
        allWeekRanges.forEach((w) => {
          if (tglHari >= w.startDay && tglHari <= w.endDay) {
            weeksWithData.push(w.weekNum);
          }
        });
      }
    });

    return [...new Set(weeksWithData)];
  }, [historyData, selectedMonth, selectedYear, allWeekRanges]);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  useEffect(() => {
    if (availableDays.length > 0 && !availableDays.includes(selectedDay)) {
      setSelectedDay(availableDays[0]);
    }
  }, [availableDays, selectedDay]);

  useEffect(() => {
    if (availableWeeks.length > 0 && !availableWeeks.includes(selectedWeek)) {
      setSelectedWeek(availableWeeks[0]);
    }
  }, [availableWeeks, selectedWeek]);

  const handleResetFilter = () => {
    const currentDate = new Date();
    setFilter('hari');
    setSelectedDay(currentDate.getDate());
    setSelectedMonth(currentDate.getMonth());
    setSelectedYear(currentDate.getFullYear());
    setSelectedWeek(Math.ceil(currentDate.getDate() / 7));
  };

const handleDownloadLaporan =
  async () => {

    const filteredHistory =
      filterHistoryData();

    if (
      filteredHistory.length === 0
    ) {

      return;

    }

    // PDF
    const doc =
      new jsPDF(
        'p',
        'mm',
        'a4'
      );

    // PERIODE
    let periodeText =
      '';

    if (
      filter === 'hari'
    ) {

      periodeText =
        `${selectedDay} ${bulanList[selectedMonth]} ${selectedYear}`;

    }

    if (
      filter === 'minggu'
    ) {

      const weekData =
        allWeekRanges.find(
          (w) =>
            w.weekNum ===
            selectedWeek
        );

      periodeText =
        `${weekData?.label || ''} ${selectedYear}`;

    }

    if (
      filter === 'bulan'
    ) {

      periodeText =
        `${bulanList[selectedMonth]} ${selectedYear}`;

    }

    if (
      filter === 'tahun'
    ) {

      periodeText =
        `${selectedYear}`;

    }

    // TITLE
    doc.setFontSize(20);

    doc.setTextColor(
      0,
      35,
      102
    );

    doc.text(
      'Laporan Penjualan',
      14,
      20
    );

    // SUBTITLE
    doc.setFontSize(11);

    doc.setTextColor(
      100
    );

    doc.text(
      `Periode: ${periodeText}`,
      14,
      30
    );

    // SUMMARY
    doc.setFontSize(12);

    doc.setTextColor(
      0
    );

    doc.text(
      `Total Pendapatan: Rp ${totalPendapatan.toLocaleString()}`,
      14,
      42
    );

    doc.text(
      `Total Pesanan: ${totalPesanan}`,
      14,
      50
    );

    // GRAFIK
    const chart =
      document.getElementById(
        'grafik-laporan'
      );

    if (chart) {

      const canvas =
        await html2canvas(
          chart
        );

      const imgData =
        canvas.toDataURL(
          'image/png'
        );

      doc.addImage(
        imgData,
        'PNG',
        14,
        60,
        180,
        70
      );

    }

    // TABLE
    autoTable(doc, {

      startY: 140,

      head: [[
        'No',
        'Tanggal',
        'Kode',
        'Meja',
        'Total'
      ]],

      body:
        filteredHistory.map(
          (
            item,
            index
          ) => [

            index + 1,

            new Date(
              item.created_at
            ).toLocaleString(
              'id-ID'
            ),

            item.kode_pesanan ||
              '-',

            item.nomor_meja ||
              '-',

            `Rp ${Number(item.total_harga || 0).toLocaleString()}`

          ]
        ),

      styles: {

        fontSize: 9

      },

      headStyles: {

        fillColor: [
          0,
          35,
          102
        ]

      },

      margin: {

        top: 10

      },

      didDrawPage:
        () => {

          const pageCount =
            doc.internal.getNumberOfPages();

          doc.setFontSize(
            10
          );

          doc.text(
            `Halaman ${pageCount}`,
            180,
            290
          );

        }

    });

    // MENU TERLARIS
    let finalY =
      doc.lastAutoTable
        .finalY + 15;

    // AUTO PAGE BREAK
    if (
      finalY > 240
    ) {

      doc.addPage();

      finalY = 20;

    }

    doc.setFontSize(16);

    doc.setTextColor(
      0,
      35,
      102
    );

    doc.text(
      'Menu Terlaris',
      14,
      finalY
    );

    autoTable(doc, {

      startY:
        finalY + 8,

      head: [[
        'Ranking',
        'Menu',
        'Terjual'
      ]],

      body:
        menuTerlaris.map(
          (
            menu,
            index
          ) => [

            `#${index + 1}`,

            menu.nama,

            `${menu.total}x`

          ]
        ),

      styles: {

        fontSize: 10

      },

      headStyles: {

        fillColor: [
          255,
          140,
          0
        ]

      }

    });

    // FILE NAME
    let fileName =
      'Laporan';

    if (
      filter === 'hari'
    ) {

      fileName =
        `Laporan-Harian-${selectedDay}-${selectedMonth + 1}-${selectedYear}`;

    }

    if (
      filter === 'minggu'
    ) {

      fileName =
        `Laporan-Minggu-${selectedWeek}-${bulanList[selectedMonth]}-${selectedYear}`;

    }

    if (
      filter === 'bulan'
    ) {

      fileName =
        `Laporan-Bulan-${bulanList[selectedMonth]}-${selectedYear}`;

    }

    if (
      filter === 'tahun'
    ) {

      fileName =
        `Laporan-Tahun-${selectedYear}`;

    }

    // SAVE
    doc.save(
      `${fileName}.pdf`
    );

  };

  const getPeriodStatus = () => {
    const currentDate = new Date();

    if (filter === 'minggu') {
      const currentWeek = Math.ceil(currentDate.getDate() / 7);
      if (
        selectedWeek === currentWeek &&
        selectedMonth === currentDate.getMonth() &&
        selectedYear === currentDate.getFullYear()
      ) {
        return 'Data minggu berjalan belum lengkap';
      }
    }

    if (filter === 'bulan') {
      if (
        selectedMonth === currentDate.getMonth() &&
        selectedYear === currentDate.getFullYear()
      ) {
        return 'Data bulan berjalan belum lengkap';
      }
    }

    if (filter === 'tahun') {
      if (selectedYear === currentDate.getFullYear()) {
        return 'Data tahun berjalan belum lengkap';
      }
    }

    return '';
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data = [], error } = await supabase
        .from('history_pesanan')
        .select('*')
        .eq('status', 'Selesai');

      if (error) throw error;
      setHistoryData(data);

      const { data: menu = [], error: menuError } = await supabase
        .from('menu')
        .select('*');

      if (menuError) throw menuError;
      setMenuData(menu);

    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterHistoryData = () => {
    return historyData.filter((item) => {
      if (!item.created_at) return false;
      const tanggal = new Date(item.created_at);

      if (filter === 'hari') {
        return (
          tanggal.getDate() === selectedDay &&
          tanggal.getMonth() === selectedMonth &&
          tanggal.getFullYear() === selectedYear
        );
      }

      if (filter === 'minggu') {
        const targetWeekConfig = allWeekRanges.find(w => w.weekNum === selectedWeek);
        if (!targetWeekConfig) return false;

        const tglHari = tanggal.getDate();
        return (
          tglHari >= targetWeekConfig.startDay &&
          tglHari <= targetWeekConfig.endDay &&
          tanggal.getMonth() === selectedMonth &&
          tanggal.getFullYear() === selectedYear
        );
      }

      if (filter === 'bulan') {
        return (
          tanggal.getMonth() === selectedMonth &&
          tanggal.getFullYear() === selectedYear
        );
      }

      if (filter === 'tahun') {
        return tanggal.getFullYear() === selectedYear;
      }

      return true;
    });
  };

  const processData = () => {
    const filteredHistory = filterHistoryData();

    const total = filteredHistory.reduce(
      (acc, item) => acc + Number(item.total_harga || 0),
      0
    );

    setTotalPendapatan(total);
    setTotalPesanan(filteredHistory.length);
    setRiwayat(filteredHistory);

    setMenuAktif(menuData.filter((m) => m.stok !== 'nonaktif').length);
    setMenuNonaktif(menuData.filter((m) => m.stok === 'nonaktif').length);

    const totalMenu = {};
    filteredHistory.forEach((pesanan) => {
      let items = [];
      if (Array.isArray(pesanan.items)) {
        items = pesanan.items;
      } else if (typeof pesanan.items === 'string') {
        try {
          const parsed = JSON.parse(pesanan.items);
          if (Array.isArray(parsed)) items = parsed;
        } catch {
          items = [];
        }
      }

      items.forEach((item) => {
        if (!item?.nama) return;
        const menuAsli = menuData.find((m) => m.nama === item.nama);

        if (!totalMenu[item.nama]) {
          totalMenu[item.nama] = {
            nama: item.nama,
            total: 0,
            img: menuAsli?.img || 'https://via.placeholder.com/150'
          };
        }
        totalMenu[item.nama].total += Number(item.qty || 0);
      });
    });

    const hasil = Object.values(totalMenu).sort((a, b) => b.total - a.total);
    setMenuTerlaris(hasil);

    if (filter === 'hari') {
      setChartData([
        {
          name: `${selectedDay} ${bulanList[selectedMonth].substring(0, 3)}`,
          total: total
        }
      ]);
    } else if (filter === 'minggu' || filter === 'bulan') {
      const groupData = {};
      filteredHistory.forEach((item) => {
        const tgl = new Date(item.created_at).getDate();
        groupData[tgl] = (groupData[tgl] || 0) + (Number(item.total_harga) || 0);
      });

      const grafik = Object.keys(groupData)
        .map((tgl) => ({
          name: `Tgl ${tgl}`,
          total: groupData[tgl],
          rawDate: Number(tgl)
        }))
        .sort((a, b) => a.rawDate - b.rawDate);

      setChartData(grafik);
    } else if (filter === 'tahun') {
      const groupData = {};
      filteredHistory.forEach((item) => {
        const bln = new Date(item.created_at).getMonth();
        groupData[bln] = (groupData[bln] || 0) + (Number(item.total_harga) || 0);
      });

      const grafik = Array.from({ length: 12 }, (_, i) => ({
        name: bulanList[i].substring(0, 3),
        total: groupData[i] || 0
      }));

      setChartData(grafik);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    processData();
  }, [
    historyData,
    filter,
    selectedDay,
    selectedWeek,
    selectedMonth,
    selectedYear,
    menuData,
    allWeekRanges
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f2f5]">
        <div className="w-12 h-12 border-4 border-[#002366] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentFilteredLength = filterHistoryData().length;

  return (
    <div className="p-4 md:p-10 bg-[#f0f2f5] min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-[#002366] mb-2">
          Laporan <span className="text-[#FF8C00]">Penjualan</span>
        </h1>
        <p className="text-gray-500">Statistik penjualan kios.</p>
      </div>

      <div className="bg-white rounded-[35px] p-6 shadow-sm mb-10">
        <div className="flex flex-wrap gap-3 mb-6">
          {['hari', 'minggu', 'bulan', 'tahun'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-5 py-3 rounded-2xl font-black capitalize ${
                filter === type ? 'bg-[#002366] text-white' : 'bg-[#f8f9fc]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4">
          {filter === 'hari' && (
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="px-5 py-3 rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366]"
            >
              {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1)
                .filter((day) => availableDays.includes(day))
                .map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
            </select>
          )}

          {filter === 'minggu' && (
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="px-5 py-3 rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366]"
            >
              {allWeekRanges
                .filter((w) => availableWeeks.includes(w.weekNum))
                .map((w) => (
                  <option key={w.weekNum} value={w.weekNum}>
                    {w.label}
                  </option>
                ))}
            </select>
          )}

          {(filter === 'hari' || filter === 'minggu' || filter === 'bulan') && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-5 py-3 rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366]"
            >
              {bulanList
                .map((bulan, index) => ({ bulan, index }))
                .filter((item) => availableMonths.includes(item.index))
                .map((item) => (
                  <option key={item.index} value={item.index}>
                    {item.bulan}
                  </option>
                ))}
            </select>
          )}

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-5 py-3 rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366]"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={handleResetFilter}
            className="px-5 py-3 rounded-2xl bg-[#f8f9fc] font-black text-[#002366]"
          >
            Reset Filter
          </button>

          <button
            onClick={handleDownloadLaporan}
            disabled={currentFilteredLength === 0}
            className={`px-5 py-3 rounded-2xl font-black ${
              currentFilteredLength === 0
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-[#002366] text-white'
            }`}
          >
            Download Laporan
          </button>
        </div>

        {getPeriodStatus() && (
          <div className="mt-5 text-sm text-[#FF8C00] font-semibold">
            {getPeriodStatus()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white rounded-[30px] p-6 shadow-sm">
          <p className="text-gray-400 text-sm mb-2">Pendapatan</p>
          <h2 className="text-3xl font-black text-[#002366]">
            Rp {totalPendapatan.toLocaleString()}
          </h2>
        </div>

        <div className="bg-white rounded-[30px] p-6 shadow-sm">
          <p className="text-gray-400 text-sm mb-2">Pesanan</p>
          <h2 className="text-3xl font-black text-[#FF8C00]">{totalPesanan}</h2>
        </div>

        <div className="bg-white rounded-[30px] p-6 shadow-sm">
          <p className="text-gray-400 text-sm mb-2">Menu Aktif</p>
          <h2 className="text-3xl font-black text-green-500">{menuAktif}</h2>
        </div>

        <div className="bg-white rounded-[30px] p-6 shadow-sm">
          <p className="text-gray-400 text-sm mb-2">Menu Nonaktif</p>
          <h2 className="text-3xl font-black text-red-500">{menuNonaktif}</h2>
        </div>
      </div>

      <div
        id="grafik-laporan"
        className="bg-white rounded-[35px] p-8 shadow-sm mb-10"
      >
        <h2 className="text-2xl font-black text-[#002366] mb-8">
          Grafik Penjualan
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          {filter === 'hari' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `Rp ${value.toLocaleString()}`} />
              <Bar dataKey="total" fill="#FF8C00" radius={[10, 10, 0, 0]} maxBarSize={60} />
            </BarChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `Rp ${value.toLocaleString()}`} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#FF8C00"
                strokeWidth={4}
                dot={{ r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-[35px] p-8 shadow-sm mb-10">
        <h2 className="text-2xl font-black text-[#002366] mb-8">
          Menu Terlaris
        </h2>
        <div className="space-y-4">
          {menuTerlaris.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-semibold">
              Belum ada data penjualan.
            </div>
          ) : (
            menuTerlaris.map((menu, index) => (
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
                    <p className="text-gray-400">Ranking #{index + 1}</p>
                  </div>
                </div>
                <h2 className="text-3xl font-black text-[#FF8C00]">
                  {menu.total}x
                </h2>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HalamanLaporanAdmin;