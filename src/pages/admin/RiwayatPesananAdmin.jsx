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
          .from('pesanan')
          .select('*')
          .eq('status', 'selesai')
          .order('created_at', {
            ascending: false
          });

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
      month: date.getMonth()
    });

  });

  const result = periods
    .filter(
      (value, index, self) =>
        index ===
        self.findIndex(
          (v) =>
            v.year === value.year &&
            v.month === value.month
        )
    )
    .sort((a, b) => {

      if (a.year !== b.year) {
        return a.year - b.year;
      }

      return a.month - b.month;

    });
  return result;

}, [historyOrders]);

  // 3. TAHUN YANG ADA DATA
  const availableYears = useMemo(() => {
    return [
      ...new Set(availablePeriods.map((p) => p.year))
    ].sort((a, b) => a - b);
  }, [availablePeriods]);

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
            
            // Kita gunakan filterDate saja untuk melock tanggal kosong, 
            // Kita cabut minDate & maxDate bawaan agar kalender tidak nge-bug/stuck saat data loading selesai
            filterDate={isDateAvailable}
            
            className="w-full p-4 rounded-2xl border border-gray-200 outline-none focus:border-[#FF8C00] bg-white"
            
            renderCustomHeader={({
              date,
              changeYear,
              changeMonth,
            }) => {
              const currentYear = date.getFullYear();
              const currentMonth = date.getMonth();

              // Hitung secara manual posisi index bulan aktif saat ini di dalam riwayat data
              let currentPosition =
                availablePeriods.findIndex(
                  (p) =>
                    p.year === currentYear &&
                    p.month === currentMonth
                );

              if (
                currentPosition === -1 &&
                availablePeriods.length > 0
              ) {
                currentPosition =
                  availablePeriods.length - 1;
              }

              // Cek ketersediaan periode sebelum dan sesudahnya berdasarkan data asli
            const hasPrev =
              currentPosition > 0;

            const hasNext =
              currentPosition <
              availablePeriods.length - 1;

              // Ambil daftar bulan yang valid hanya untuk tahun yang sedang aktif di UI kalender
              const monthsInSelectedYear = availablePeriods.filter(
                (p) => p.year === currentYear
              );

              return (
                <div className="flex items-center justify-between gap-2 px-3 py-3 border-b bg-white rounded-t-2xl">
                  {/* Tombol ke bulan sebelumnya */}
                  <button
                    type="button"
                    disabled={!hasPrev}
                    onClick={() => {
                      const prev = availablePeriods[currentPosition - 1];
                      if (prev) {
                        changeYear(prev.year);
                        changeMonth(prev.month);
                      }
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border bg-gray-50 hover:bg-gray-100 disabled:opacity-30"
                  >
                    ←
                  </button>

                  <div className="flex gap-2 flex-1">
                    {/* Dropdown Bulan Berdata */}
                    <select
                      value={currentMonth}
                      onChange={(e) => {
                        changeMonth(Number(e.target.value));
                      }}
                      className="flex-1 h-10 px-3 rounded-xl border bg-gray-50"
                    >
                      {monthsInSelectedYear.map((p) => (
                        <option key={`${p.year}-${p.month}`} value={p.month}>
                          {months[p.month]}
                        </option>
                      ))}
                    </select>

                    {/* Dropdown Tahun Berdata */}
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

                  {/* Tombol ke bulan selanjutnya (Ini akan membuka gembok Juni 2026 Anda) */}
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={() => {
                      const next = availablePeriods[currentPosition + 1];
                      if (next) {
                        changeYear(next.year);
                        changeMonth(next.month);
                      }
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

      {/* LIST ORDER */}
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
                    <b className="font-bold">Meja {o.meja_id}</b>
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
                              - Rp {(Number(i.harga || 0) * Number(i.qty || 0)).toLocaleString('id-ID')}
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