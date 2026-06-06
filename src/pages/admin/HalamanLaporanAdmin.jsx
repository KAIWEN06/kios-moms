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

  // State Baru untuk Notifikasi Sistem Pengalihan Tanggal
  const [notification, setNotification] = useState('');

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

  const handleGoToToday = () => {
    setNotification('');
    const currentDate = new Date();
    
    const adaHariIni = historyData.some(item => {
      if (!item.created_at) return false;
      const tgl = new Date(item.created_at);
      return tgl.getDate() === currentDate.getDate() &&
             tgl.getMonth() === currentDate.getMonth() &&
             tgl.getFullYear() === currentDate.getFullYear();
    });

    setFilter('hari');

    if (adaHariIni) {
      setSelectedDay(currentDate.getDate());
      setSelectedMonth(currentDate.getMonth());
      setSelectedYear(currentDate.getFullYear());
      setSelectedWeek(Math.ceil(currentDate.getDate() / 7));
    } else {
      if (historyData.length > 0) {
        const timestamps = historyData
          .map(item => new Date(item.created_at).getTime())
          .sort((a, b) => b - a);
        
        const tglTerakhir = new Date(timestamps[0]);
        setSelectedDay(tglTerakhir.getDate());
        setSelectedMonth(tglTerakhir.getMonth());
        setSelectedYear(tglTerakhir.getFullYear());
        setSelectedWeek(Math.ceil(tglTerakhir.getDate() / 7));

        setNotification('Hari ini belum ada data transaksi. Sistem otomatis menampilkan tanggal terakhir yang mempunyai transaksi.');
      } else {
        setSelectedDay(currentDate.getDate());
        setSelectedMonth(currentDate.getMonth());
        setSelectedYear(currentDate.getFullYear());
        setSelectedWeek(Math.ceil(currentDate.getDate() / 7));
        setNotification('Belum ada data transaksi tersimpan di sistem.');
      }
    }
  };

  const handleDownloadLaporan = async () => {
    const filteredHistory = filterHistoryData();

    if (filteredHistory.length === 0) {
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    let periodeText = '';
    if (filter === 'hari') periodeText = `${selectedDay} ${bulanList[selectedMonth]} ${selectedYear}`;
    if (filter === 'minggu') {
      const weekData = allWeekRanges.find((w) => w.weekNum === selectedWeek);
      periodeText = `${weekData?.label || ''} ${selectedYear}`;
    }
    if (filter === 'bulan') periodeText = `${bulanList[selectedMonth]} ${selectedYear}`;
    if (filter === 'tahun') periodeText = `${selectedYear}`;

    const primaryColor = [0, 35, 102];    
    const secondaryColor = [255, 140, 0]; 
    const darkGray = [60, 60, 60];
    const lightGray = [150, 150, 150];

    let qrisNominal = 0;
    let qrisCount = 0;
    let tunaiNominal = 0;
    let tunaiCount = 0;

    filteredHistory.forEach(item => {
      const metode = String(item.metode_pembayaran || '').toLowerCase().trim();
      const nominal = Number(item.total_harga || 0);
      
      if (metode === 'qris') {
        qrisNominal += nominal;
        qrisCount++;
      } else {
        tunaiNominal += nominal;
        tunaiCount++;
      }
    });

    const totalSemuaTransaksi = qrisNominal + tunaiNominal;
    const qrisPersen = totalSemuaTransaksi > 0 ? ((qrisNominal / totalSemuaTransaksi) * 100).toFixed(1) : 0;
    const tunaiPersen = totalSemuaTransaksi > 0 ? ((tunaiNominal / totalSemuaTransaksi) * 100).toFixed(1) : 0;

    const drawHeaderFooter = (pdfDoc) => {
      const totalPages = pdfDoc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdfDoc.setPage(i);
        pdfDoc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdfDoc.rect(0, 0, pageWidth, 4, 'F');

        pdfDoc.setDrawColor(230, 230, 230);
        pdfDoc.setLineWidth(0.5);
        pdfDoc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

        pdfDoc.setFont('helvetica', 'normal');
        pdfDoc.setFontSize(8);
        pdfDoc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
        
        const waktuCetak = `Dicetak otomatis pada: ${new Date().toLocaleString('id-ID')}`;
        pdfDoc.text(waktuCetak, 14, pageHeight - 10);
        
        const pageString = `Halaman ${i} dari ${totalPages}`;
        pdfDoc.text(pageString, pageWidth - 14, pageHeight - 10, { align: 'right' });
      }
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN EKSEKUTIF PENJUALAN KIOS', 14, 20);

    // FIX: Mengubah 'medium' ke 'normal' agar tidak memicu error font lookup
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`PERIODE DATA: ${periodeText.toUpperCase()}`, 14, 26);

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.8);
    doc.line(14, 30, pageWidth - 14, 30);

    const cardY = 36;
    const cardWidth = (pageWidth - 34) / 2;
    const cardHeight = 22;

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('TOTAL PENDAPATAN (OMZET KESELURUHAN)', 20, cardY + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Rp ${totalSemuaTransaksi.toLocaleString('id-ID')}`, 20, cardY + 15);

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14 + cardWidth + 6, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('VOLUME TRANSAKSI BERHASIL', 14 + cardWidth + 12, cardY + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`${totalPesanan} Pesanan`, 14 + cardWidth + 12, cardY + 15);

    let currentY = 66;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Analisis Struktur Arus Kas Pembayaran', 14, currentY);

    // Mengubah isi body tabel pertama menjadi ringkasan metode pembayaran
    autoTable(doc, {
      startY: currentY + 4,
      head: [['No', 'Metode Pembayaran', 'Jumlah Transaksi', 'Total Nominal']],
      body: [
        ['1', 'QRIS', `${qrisCount} Pesanan`, `Rp ${qrisNominal.toLocaleString('id-ID')}`],
        ['2', 'Tunai', `${tunaiCount} Pesanan`, `Rp ${tunaiNominal.toLocaleString('id-ID')}`]
      ],
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    currentY = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Perbandingan Pemasukan QRIS & Tunai', 14, currentY);

    doc.setFillColor(250, 250, 252);
    doc.rect(14, currentY + 4, pageWidth - 28, 22, 'F');

    const maxBarLength = pageWidth - 100; 
    const qrisLength = totalSemuaTransaksi > 0 ? (qrisNominal / totalSemuaTransaksi) * maxBarLength : 0;
    const tunaiLength = totalSemuaTransaksi > 0 ? (tunaiNominal / totalSemuaTransaksi) * maxBarLength : 0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('QRIS', 20, currentY + 12);
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(40, currentY + 9, Math.max(qrisLength, 2), 4, 'F');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Rp ${qrisNominal.toLocaleString('id-ID')} (${totalSemuaTransaksi > 0 ? qrisPersen : 0}%)`, 45 + Math.max(qrisLength, 2), currentY + 12);

    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('TUNAI', 20, currentY + 20);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(40, currentY + 17, Math.max(tunaiLength, 2), 4, 'F');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Rp ${tunaiNominal.toLocaleString('id-ID')} (${totalSemuaTransaksi > 0 ? tunaiPersen : 0}%)`, 45 + Math.max(tunaiLength, 2), currentY + 20);

    const chart = document.getElementById('grafik-laporan');
    currentY += 34;

    if (chart) {
      try {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('Grafik Tren Fluktuasi Penjualan', 14, currentY);

        const canvas = await html2canvas(chart, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        doc.addImage(imgData, 'PNG', 14, currentY + 4, pageWidth - 28, 60);
        currentY += 72;
      } catch (err) {
        console.error("Gagal memuat grafik waktu ke PDF:", err);
        currentY += 5;
      }
    }

    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Log Riwayat Penjualan & Produk Terkait', 14, currentY);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['No', 'Tanggal / Waktu', 'Metode', 'Ringkasan Menu yang Dibeli', 'Total Bayar']],
      body: filteredHistory.map((item, index) => {
        let namaMenuTerbeli = '-';
        let rawItems = [];
        if (Array.isArray(item.items)) rawItems = item.items;
        else if (typeof item.items === 'string') {
          try { rawItems = JSON.parse(item.items); } catch { rawItems = []; }
        }
        if (rawItems.length > 0) {
          namaMenuTerbeli = rawItems.map(i => {
            const labelVarian = i.varian && String(i.varian).toLowerCase() === 'extra' ? ' (Extra)' : '';
            return `${i.nama}${labelVarian} (${i.qty}x)`;
          }).join(', ');
        }

        return [
          index + 1,
          new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
          item.metode_pembayaran || 'Tunai',
          namaMenuTerbeli,
          `Rp ${Number(item.total_harga || 0).toLocaleString('id-ID')}`
        ];
      }),
      theme: 'striped',
      styles: { fontSize: 8.5, cellPadding: 3, font: 'helvetica', overflow: 'linebreak' },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { cellWidth: 20, fontStyle: 'bold' },
        3: { cellWidth: 'auto' }, 
        4: { cellWidth: 30, fontStyle: 'bold', halign: 'right' }
      },
      margin: { left: 14, right: 14 },
      rowPageBreak: 'avoid'
    });

    let finalY = doc.lastAutoTable.finalY + 12;
    if (finalY > pageHeight - 45) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Performa Menu Terlaris (Kontribusi Produk)', 14, finalY);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Peringkat', 'Nama Menu Kuliner', 'Kuantitas Terjual']],
      body: menuTerlaris.map((menu, index) => [
        `Peringkat #${index + 1}`,
        menu.nama,
        `${menu.total} Porsi`
      ]),
      theme: 'grid',
      styles: { fontSize: 9.5, cellPadding: 3.5, font: 'helvetica' },
      headStyles: { fillColor: secondaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: secondaryColor, cellWidth: 35 },
        2: { fontStyle: 'bold', halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    });

    drawHeaderFooter(doc);

    let fileName = 'Laporan_Eksekutif';
    if (filter === 'hari') fileName = `Laporan_Eksekutif_Harian_${selectedDay}_${selectedMonth + 1}_${selectedYear}`;
    if (filter === 'minggu') fileName = `Laporan_Eksekutif_Mingguan_${selectedWeek}_${selectedYear}`;
    if (filter === 'bulan') fileName = `Laporan_Eksekutif_Bulanan_${bulanList[selectedMonth]}_${selectedYear}`;
    if (filter === 'tahun') fileName = `Laporan_Eksekutif_Tahunan_${selectedYear}`;

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

      if (data.length > 0) {
        const hariIni = new Date();
        const adaHariIni = data.some(item => {
          if (!item.created_at) return false;
          const tgl = new Date(item.created_at);
          return tgl.getDate() === hariIni.getDate() &&
                 tgl.getMonth() === hariIni.getMonth() &&
                 tgl.getFullYear() === hariIni.getFullYear();
        });

        if (!adaHariIni) {
          const timestamps = data
            .map(item => new Date(item.created_at).getTime())
            .sort((a, b) => b - a);
          
          if (timestamps.length > 0) {
            const tglTerakhir = new Date(timestamps[0]);
            setSelectedDay(tglTerakhir.getDate());
            setSelectedMonth(tglTerakhir.getMonth());
            setSelectedYear(tglTerakhir.getFullYear());
            setSelectedWeek(Math.ceil(tglTerakhir.getDate() / 7));
            
            setNotification('Hari ini belum ada data transaksi. Sistem otomatis menampilkan tanggal terakhir yang mempunyai transaksi.');
          }
        }
      }

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

        const namaBersih = item.nama.replace(/\s*\(biasa\)|\s*\(extra\)/i, '').trim();
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

      {/* BANNER ALERT NOTIFIKASI */}
      {notification && (
        <div className="mb-4 p-4 rounded-xl md:rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs md:text-sm font-semibold flex items-center justify-between shadow-xs">
          <span>{notification}</span>
          <button onClick={() => setNotification('')} className="ml-2 font-black text-amber-900 hover:opacity-70">✕</button>
        </div>
      )}

      {/* FILTER PANEL CARD */}
      <div className="bg-white rounded-[24px] md:rounded-[35px] p-5 md:p-8 shadow-sm mb-6 md:mb-10">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="flex-1 w-full">
            {/* Filter Type Buttons */}
            <div className="flex flex-wrap gap-2 md:gap-3 mb-5">
              {['hari', 'minggu', 'bulan', 'tahun'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilter(type);
                    setNotification('');
                  }}
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
              {filter !== 'minggu' && (
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value));
                    setNotification('');
                  }}
                  className="w-full sm:w-[120px] md:w-[130px] px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl bg-[#f8f9fc] outline-none font-bold text-[#002366] text-sm"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              )}

              {filter === 'hari' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(Number(e.target.value));
                    setNotification('');
                  }}
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

              {filter === 'bulan' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(Number(e.target.value));
                    setNotification('');
                  }}
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
              
              {filter === 'minggu' && (
                <>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(Number(e.target.value));
                      setNotification('');
                    }}
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
                    onChange={(e) => {
                      setSelectedMonth(Number(e.target.value));
                      setNotification('');
                    }}
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
                    onChange={(e) => {
                      setSelectedWeek(Number(e.target.value));
                      setNotification('');
                    }}
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
                  onChange={(e) => {
                    setSelectedDay(Number(e.target.value));
                    setNotification('');
                  }}
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
                onClick={handleGoToToday}
                className="w-full sm:w-auto px-5 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-[#002366]/10 font-black text-[#002366] text-sm hover:bg-[#002366]/20 transition-colors"
              >
                Hari Ini
              </button>
            </div>

            {getPeriodStatus() && (
              <div className="mt-3 text-xs md:text-sm text-[#FF8C00] font-semibold">
                {getPeriodStatus()}
              </div>
            )}
          </div>

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
                    <p className="text-gray-400 text-xs mt-0.5 font-bold">Urutan #{index + 1}</p>
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