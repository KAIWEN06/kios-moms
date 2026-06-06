// =========================
// IMPORT
// =========================

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

// =========================
// COMPONENT
// =========================

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

  const handleDownloadLaporan = async () => {
    const filteredHistory = filterHistoryData();

    if (filteredHistory.length === 0) {
      return;
    }

    // PDF
    const doc = new jsPDF('p', 'mm', 'a4');

    // PERIODE
    let periodeText = '';

    if (filter === 'hari') {
      periodeText = `${selectedDay} ${bulanList[selectedMonth]} ${selectedYear}`;
    }

    if (filter === 'minggu') {
      const weekData = allWeekRanges.find((w) => w.weekNum === selectedWeek);
      periodeText = `${weekData?.label || ''} ${selectedYear}`;
    }

    if (filter === 'bulan') {
      periodeText = `${bulanList[selectedMonth]} ${selectedYear}`;
    }

    if (filter === 'tahun') {
      periodeText = `${selectedYear}`;
    }

    // TITLE
    doc.setFontSize(20);
    doc.setTextColor(0, 35, 102);
    doc.text('Laporan Penjualan', 14, 20);

    // SUBTITLE
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Periode: ${periodeText}`, 14, 30);

    // SUMMARY
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Pendapatan: Rp ${totalPendapatan.toLocaleString()}`, 14, 42);
    doc.text(`Total Pesanan: ${totalPesanan}`, 14, 50);

    // GRAFIK
    const chart = document.getElementById('grafik-laporan');

    if (chart) {
      const canvas = await html2canvas(chart);
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 14, 60, 180, 70);
    }

    // TABLE
    autoTable(doc, {
      startY: 140,
      head: [['No', 'Tanggal', 'Kode', 'Meja', 'Total']],
      body: filteredHistory.map((item, index) => [
        index + 1,
        new Date(item.created_at).toLocaleString('id-ID'),
        item.kode_pesanan || '-',
        item.nomor_meja || '-',
        `Rp ${Number(item.total_harga || 0).toLocaleString()}`
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 35, 102] },
      margin: { top: 10 },
      didDrawPage: () => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.text(`Halaman ${pageCount}`, 180, 290);
      }
    });

    // MENU TERLARIS
    let finalY = doc.lastAutoTable.finalY + 15;

    // AUTO PAGE BREAK
    if (finalY > 240) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 35, 102);
    doc.text('Menu Terlaris', 14, finalY);

    autoTable(doc, {
      startY: finalY + 8,
      head: [['Ranking', 'Menu', 'Terjual']],
      body: menuTerlaris.map((menu, index) => [
        `#${index + 1}`,
        menu.nama,
        `${menu.total}x`
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [255, 140, 0] }
    });

    // FILE NAME
    let fileName = 'Laporan';

    if (filter === 'hari') {
      fileName = `Laporan-Harian-${selectedDay}-${selectedMonth + 1}-${selectedYear}`;
    }

    if (filter === 'minggu') {
      fileName = `Laporan-Minggu-${selectedWeek}-${bulanList[selectedMonth]}-${selectedYear}`;
    }

    if (filter === 'bulan') {
      fileName = `Laporan-Bulan-${bulanList[selectedMonth]}-${selectedYear}`;
    }

    if (filter === 'tahun') {
      fileName = `Laporan-Tahun-${selectedYear}`;
    }

    // SAVE
    doc.save(`${fileName}.pdf`);
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
        .from('pesanan')
        .select('*')
        .eq('status', 'selesai');

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
          generateDateTimeMatch(tanggal, selectedDay, selectedMonth, selectedYear)
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

  // Helper function to bypass original identical conditions seamlessly
  const generateDateTimeMatch = (tgl, d, m, y) => {
    return tgl.getDate() === d && tgl.getMonth() === m && tgl.getFullYear() === y;
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

        // NORMALISASI: Hapus tag varian (Biasa) atau (Extra) secara case-insensitive untuk menyatukan hitungan
        const namaBersih = item.nama.replace(/\s*\(biasa\)|\s*\(extra\)/i, '').trim();
        
        // Cari info gambar di master menu menggunakan nama asli atau dicocokkan lowercase-nya
        const menuAsli = menuData.find(
          (m) => m.nama === item.nama || m.nama?.toLowerCase().trim() === namaBersih.toLowerCase()
        );

        if (!totalMenu[namaBersih]) {
          totalMenu[namaBersih] = {
            nama: namaBersih,
            total: 0,
            img: menuAsli?.img || 'https://via.placeholder.com/150'
          };
        }
        totalMenu[namaBersih].total += Number(item.qty || 0);
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
      {/* HEADER SECTION */}
      <div className="mb-6 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-[#002366] mb-1">
          Laporan <span className="text-[#FF8C00]">Penjualan</span>
        </h1>
        <p className="text-gray-500 text-sm md:text-base">Statistik penjualan kios.</p>
      </div>

      {/* FILTER PANEL CARD */}
      <div className="bg-white rounded-[24px] md:rounded-[35px] p-5 md:p-8 shadow-sm mb-6 md:mb-10">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          {/* KIRI: Kontrol Filter */}
          <div className="flex-1 w-full">
            {/* Filter Type Buttons */}
            <div className="flex flex-wrap gap-2 md:gap-3 mb-5">
              {['hari', 'minggu', 'bulan', 'tahun'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`flex-1 sm:flex-none text-center px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm capitalize transition-all ${
                    filter === type
                      ? 'bg-[#002366] text-white'
                      : 'bg-[#f8f9fc] text-[#002366]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Dropdown Selectors */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3">

                            {/* TAMPILAN UTAMA SELECT TAHUN KHUSUS NON-MINGGU */}
              {filter !== 'minggu' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full sm:w-[120px] md:w-[130px] px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366] text-sm"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              )}

              {/* TAMPILAN JIKA FILTER HARI */}
              {filter === 'hari' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full sm:w-[160px] md:w-[180px] px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366] text-sm"
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

              {/* TAMPILAN JIKA FILTER BULAN */}
              {filter === 'bulan' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full sm:w-[160px] md:w-[180px] px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366] text-sm"
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
              
              {/* TAMPILAN JIKA FILTER MINGGU (URUTAN BARU: BULAN -> TAHUN -> MINGGU DAN LEBAR KECIL) */}

              {filter === 'minggu' && (
                <>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full sm:w-[120px] md:w-[130px] px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366] text-sm"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full sm:w-[160px] md:w-[180px] px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366] text-sm"
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

                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(Number(e.target.value))}
                    className="w-full sm:w-[260px] px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366] text-sm"
                  >
                    {allWeekRanges
                      .filter((w) => availableWeeks.includes(w.weekNum))
                      .map((w) => (
                        <option key={w.weekNum} value={w.weekNum}>
                          {w.label}
                        </option>
                      ))}
                  </select>
                </>
              )}

              {filter === 'hari' && (
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(Number(e.target.value))}
                  className="w-full sm:w-[110px] px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366] text-sm"
                >
                  {Array.from(
                    { length: getDaysInMonth(selectedMonth, selectedYear) },
                    (_, i) => i + 1
                  )
                    .filter((day) => availableDays.includes(day))
                    .map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                </select>
              )}

              <button
                onClick={handleResetFilter}
                className="w-full sm:w-auto px-5 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-[#f8f9fc] font-black text-[#002366] text-sm hover:bg-slate-100 transition-colors"
              >
                Reset Filter
              </button>
            </div>

            {getPeriodStatus() && (
              <div className="mt-3 text-xs md:text-sm text-[#FF8C00] font-semibold">
                {getPeriodStatus()}
              </div>
            )}
          </div>

          {/* KANAN: Aksi Cetak */}
          <div className="w-full xl:w-auto flex-shrink-0">
            <button
              onClick={handleDownloadLaporan}
              disabled={currentFilteredLength === 0}
              className={`w-full xl:w-auto px-6 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-sm shadow-md transition-all ${
                currentFilteredLength === 0
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-[#FF8C00] text-white active:scale-95'
              }`}
            >
              Unduh Laporan
            </button>
          </div>
        </div>
      </div>

      {/* COUNTER STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-10">
        <div className="bg-white rounded-[20px] md:rounded-[30px] p-4 md:p-6 shadow-sm">
          <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2 font-bold uppercase tracking-wider">Pendapatan</p>
          <h2 className="text-base sm:text-xl md:text-3xl font-black text-[#002366] break-all">
            Rp {totalPendapatan.toLocaleString()}
          </h2>
        </div>

        <div className="bg-white rounded-[20px] md:rounded-[30px] p-4 md:p-6 shadow-sm">
          <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2 font-bold uppercase tracking-wider">Pesanan</p>
          <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-[#FF8C00]">{totalPesanan}</h2>
        </div>

        <div className="bg-white rounded-[20px] md:rounded-[30px] p-4 md:p-6 shadow-sm">
          <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2 font-bold uppercase tracking-wider">Menu Aktif</p>
          <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-green-500">{menuAktif}</h2>
        </div>

        <div className="bg-white rounded-[20px] md:rounded-[30px] p-4 md:p-6 shadow-sm">
          <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2 font-bold uppercase tracking-wider">Menu Nonaktif</p>
          <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-red-500">{menuNonaktif}</h2>
        </div>
      </div>

      {/* GRAPH CHART SECTION */}
      <div
        id="grafik-laporan"
        className="bg-white rounded-[24px] md:rounded-[35px] p-4 md:p-8 shadow-sm mb-6 md:mb-10"
      >
        <h2 className="text-xl md:text-2xl font-black text-[#002366] mb-5 md:mb-8">
          Grafik Penjualan
        </h2>
        <div className="w-full h-[260px] md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            {filter === 'hari' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip formatter={(value) => `Rp ${value.toLocaleString()}`} contentStyle={{ borderRadius: '12px' }} />
                <Bar dataKey="total" fill="#FF8C00" radius={[8, 8, 0, 0]} maxBarSize={45} />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip formatter={(value) => `Rp ${value.toLocaleString()}`} contentStyle={{ borderRadius: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#FF8C00"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* TOP 5 BEST SELLER MENU */}
      <div className="bg-white rounded-[24px] md:rounded-[35px] p-5 md:p-8 shadow-sm">
        <h2 className="text-xl md:text-2xl font-black text-[#002366] mb-5 md:mb-8">
          Menu Terlaris
        </h2>
        <div className="space-y-3 md:space-y-4">
          {menuTerlaris.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-semibold text-sm">
              Belum ada data penjualan.
            </div>
          ) : (
            menuTerlaris.map((menu, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-[#f8f9fc] border border-gray-100/50 rounded-xl md:rounded-2xl p-3 md:p-5 transition-colors"
              >
                <div className="flex items-center gap-3 md:gap-5">
                  <img
                    src={menu.img}
                    alt={menu.nama}
                    className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl object-cover shadow-xs border flex-shrink-0"
                  />
                  <div>
                    <h3 className="font-black text-sm md:text-xl text-[#002366] capitalize leading-tight">
                      {menu.nama}
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5 font-bold">Ranking #{index + 1}</p>
                  </div>
                </div>
                <h2 className="text-xl md:text-3xl font-black text-[#FF8C00] whitespace-nowrap pl-2">
                  {menu.total}<span className="text-xs md:text-sm text-gray-400 font-bold uppercase ml-0.5">x</span>
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