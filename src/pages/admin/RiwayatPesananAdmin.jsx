import React, {
  useEffect,
  useState,
  useMemo
} from 'react';

import { supabase } from '../../lib/supabaseClient';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { id } from 'date-fns/locale';

// HELPER: Mengubah objek Date menjadi string format YYYY-MM-DD berbasis waktu lokal
const formatDateToLocalISO = (dateObj) => {
  if (!dateObj) return '';
  const target = new Date(dateObj);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const RiwayatPesanan = () => {

  const [historyOrders, setHistoryOrders] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchKode, setSearchKode] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);

  // PARSE ITEMS
  const parseItems = (items) => {
    if (Array.isArray(items)) return items;
    if (typeof items === 'string') {
      try {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error('Gagal parse items:', error);
        return [];
      }
    }
    return [];
  };

  // FETCH HISTORY
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('history_pesanan')
        .select('*')
        .eq('status', 'Selesai')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryOrders(data || []);
    } catch (error) {
      console.error('Gagal mengambil riwayat:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // 1. DATA TANGGAL YANG ADA (Format: YYYY-MM-DD)
  const availableDates = useMemo(() => {
    const datesSet = new Set();
    historyOrders.forEach((o) => {
      const localISO = formatDateToLocalISO(o.created_at);
      if (localISO) datesSet.add(localISO);
    });
    return datesSet;
  }, [historyOrders]);

  // 2. DATA BULAN & TAHUN YANG ADA
  const availablePeriods = useMemo(() => {
    const periods = [];
    historyOrders.forEach((o) => {
      const date = new Date(o.created_at);
      periods.push({
        year: date.getFullYear(),
        month: date.getMonth() // 0 = Januari, 1 = Februari, dst.
      });
    });

    // Cari yang unik, lalu urutkan dari terlama ke terbaru
    return periods
      .filter(
        (value, index, self) =>
          index ===
          self.findIndex(
            (v) => v.year === value.year && v.month === value.month
          )
      )
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
  }, [historyOrders]);

  // 3. TAHUN YANG ADA DATA
  const availableYears = useMemo(() => {
    return [
      ...new Set(availablePeriods.map((p) => p.year))
    ].sort((a, b) => a - b);
  }, [availablePeriods]);

  // Rentang Min dan Max Date berdasarkan data riil agar user tidak tersesat ke tahun/bulan kosong
  const minMaxDates = useMemo(() => {
    if (historyOrders.length === 0) return { min: null, max: null };
    // Karena query di-order descending, data terakhir (terbaru) ada di indeks 0, terlama di indeks akhir
    const minDate = new Date(historyOrders[historyOrders.length - 1].created_at);
    const maxDate = new Date(historyOrders[0].created_at);
    return { min: minDate, max: maxDate };
  }, [historyOrders]);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // 4. FILTER TANGGAL: Hanya aktif jika ada di data pesanan
  const isDateAvailable = (date) => {
    const dateStr = formatDateToLocalISO(date);
    return availableDates.has(dateStr);
  };

  // FILTER LIST PESANAN
  const filteredOrders = historyOrders.filter((o) => {
    const cocokKode = o.kode_pesanan
      ?.toLowerCase()
      .includes(searchKode.toLowerCase());

    let cocokTanggal = true;
    if (selectedDate) {
      const orderDateStr = formatDateToLocalISO(o.created_at);
      const selectedDateStr = formatDateToLocalISO(selectedDate);
      cocokTanggal = orderDateStr === selectedDateStr;
    }

    return cocokKode && cocokTanggal;
  });

  const toggleDetail = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f2f5]">
        <div className="w-12 h-12 border-4 border-[#002366] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="py-[40px] px-[5%] max-w-5xl mx-auto">
      {/* TITLE */}
      <h2 className="text-center mb-[30px] text-2xl md:text-3xl font-bold text-[#333]">
        Riwayat <span className="text-[#FF8C00]">Selesai</span>
      </h2>

      {/* FILTER */}
      <div className="flex flex-col md:flex-row gap-4 mb-[25px] items-start">
        {/* SEARCH KODE */}
        <input
          type="text"
          placeholder="Cari kode pesanan..."
          value={searchKode}
          onChange={(e) => setSearchKode(e.target.value)}
          className="flex-1 p-4 rounded-2xl border border-gray-200 outline-none focus:border-[#FF8C00] bg-white"
        />

        {/* FILTER DATE */}
        <div className="relative w-full md:w-[260px]">
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            locale={id}
            dateFormat="dd MMMM yyyy"
            placeholderText="Pilih tanggal"
            showPopperArrow={false}
            calendarClassName="rounded-2xl border shadow-xl"
            popperClassName="z-50"
            popperPlacement="bottom-end"
            
            // Mengunci tanggal, bulan, dan tahun luar batas data agar tidak bisa di-klik
            filterDate={isDateAvailable}
            minDate={minMaxDates.min}
            maxDate={minMaxDates.max}
            
            highlightDates={historyOrders.map((o) => new Date(o.created_at))}
            className="w-full p-4 rounded-2xl border border-gray-200 outline-none focus:border-[#FF8C00] bg-white"
            
renderCustomHeader={({
  date,
  changeYear,
  changeMonth
}) => {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();

  // 1. AMANKAN JIKA DATA BELUM SELESAI FOMAT / LOADING
  if (availablePeriods.length === 0) {
    return <div className="p-3 text-center text-sm text-gray-500">Memuat periode...</div>;
  }

  const currentPosition = availablePeriods.findIndex(
    (p) => p.year === currentYear && p.month === currentMonth
  );

  const prevPeriod = availablePeriods[currentPosition - 1];
  const nextPeriod = availablePeriods[currentPosition + 1];

  const monthsInYear = availablePeriods.filter(
    (p) => p.year === currentYear
  );

  // 2. JIKA BULAN JUNI BELUM TERDAFTAR DI BULAN-BULAN TAHUN INI, 
  // PAKSA TETAP TAMPILKAN BULAN JUNI AGAR USER BISA MEMILIHNYA
  const isCurrentMonthIncluded = monthsInYear.some(p => p.month === currentMonth);
  if (!isCurrentMonthIncluded && historyOrders.length > 0) {
    monthsInYear.push({ year: currentYear, month: currentMonth });
    monthsInYear.sort((a, b) => a.month - b.month);
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-3 border-b bg-white rounded-t-2xl">
      <button
        type="button"
        disabled={!prevPeriod}
        onClick={() => {
          if (!prevPeriod) return;
          changeYear(prevPeriod.year);
          changeMonth(prevPeriod.month);
        }}
        className="w-9 h-9 flex items-center justify-center rounded-xl border bg-gray-50 hover:bg-gray-100 disabled:opacity-30"
      >
        ←
      </button>

      <div className="flex gap-2 flex-1">
        <select
          value={currentMonth}
          onChange={(e) => {
            changeMonth(Number(e.target.value));
          }}
          className="flex-1 h-10 px-3 rounded-xl border bg-gray-50"
        >
          {monthsInYear.map((p) => (
            <option key={`${p.year}-${p.month}`} value={p.month}>
              {months[p.month]}
            </option>
          ))}
        </select>

        <select
          value={currentYear}
          onChange={(e) => {
            const year = Number(e.target.value);
            const firstMonth = availablePeriods.find((p) => p.year === year);
            changeYear(year);
            if (firstMonth) {
              changeMonth(firstMonth.month);
            }
          }}
          className="w-[100px] h-10 px-3 rounded-xl border bg-gray-50"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={!nextPeriod}
        onClick={() => {
          if (!nextPeriod) return;
          changeYear(nextPeriod.year);
          changeMonth(nextPeriod.month);
        }}
        className="w-9 h-9 flex items-center justify-center rounded-xl border bg-gray-50 hover:bg-gray-100 disabled:opacity-30"
      >
        →
      </button>
    </div>
  );
}}
          />
        </div>
      </div>

      {/* EMPTY & LIST ORDER */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-20 rounded-3xl text-center border-2 border-dashed">
          <p className="text-gray-400 italic">Belum ada riwayat pesanan.</p>
        </div>
      ) : (
        filteredOrders.map((o, idx) => {
          const parsedItems = parseItems(o.items);
          return (
            <div
              key={o.id}
              className="bg-white mb-[10px] rounded-[10px] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
            >
              <div
                className="p-[15px] flex justify-between items-center cursor-pointer bg-[#fafafa] hover:bg-gray-100 transition-colors"
                onClick={() => toggleDetail(idx)}
              >
                <div className="flex flex-col">
                  <span className="text-gray-800">
                    <b className="font-bold">Meja {o.nomor_meja}</b>
                    <span className="mx-1 text-gray-400">|</span>
                    {new Date(o.created_at).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[12px] text-[#FF8C00] font-black tracking-wide mt-1">
                    {o.kode_pesanan || 'KODE TIDAK TERSEDIA'}
                  </span>
                </div>

                <span className="font-semibold text-gray-900 flex items-center gap-2">
                  Rp {Number(o.total_harga || 0).toLocaleString()}
                  <span
                    className={`transition-transform duration-300 ${
                      openIndex === idx ? 'rotate-180' : ''
                    }`}
                  >
                    ▾
                  </span>
                </span>
              </div>

              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  openIndex === idx ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-[15px] border-t border-[#eee] bg-white">
                  <ul className="list-disc list-inside space-y-2 text-gray-600">
                    {parsedItems.length > 0 ? (
                      parsedItems.map((i, iIdx) => (
                        <li key={`${i.nama}-${iIdx}`} className="text-sm">
                          <span className="font-semibold text-gray-800">{i.nama}</span> x {i.qty}
                          <span className="ml-2 text-gray-500">
                            - Rp {Number(i.subtotal || 0).toLocaleString()}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-gray-400 italic list-none">
                        Detail item tidak tersedia
                      </li>
                    )}
                  </ul>

                  <div className="mt-[15px] flex justify-between items-center">
                    <span className="text-sm text-gray-500 font-semibold">
                      Metode Pembayaran
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-white text-xs font-bold ${
                        o.metode_pembayaran === 'QRIS' ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                    >
                      {o.metode_pembayaran}
                    </span>
                  </div>
                  <p className="mt-[15px] font-bold text-green-600 tracking-wide text-sm">
                    STATUS: SELESAI
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default RiwayatPesanan;