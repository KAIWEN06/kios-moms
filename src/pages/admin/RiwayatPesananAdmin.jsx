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

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

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

  useEffect(() => {

  if (
    historyOrders.length === 0 ||
    selectedDate
  ) {
    return;
  }

  const today = new Date();

  const todayStr =
    formatDateToLocalISO(today);

  const adaDataHariIni =
    historyOrders.some(
      (o) =>
        formatDateToLocalISO(
          o.created_at
        ) === todayStr
    );

  if (adaDataHariIni) {
    setSelectedDate(today);
  }

}, [historyOrders]);

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

  const totalPages = Math.ceil(
  filteredOrders.length / itemsPerPage
);

const paginatedOrders =
  filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

const maxVisiblePages =
  window.innerWidth < 640 ? 4 : 8;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f2f5]">
        <div className="w-12 h-12 border-4 border-[#002366] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="py-[30px] md:py-[40px] px-[4%] md:px-[5%] max-w-5xl mx-auto Box-sizing">
      {/* TITLE */}
      <h2 className="text-center mb-[20px] md:mb-[30px] text-xl md:text-3xl font-bold text-[#333]">
        Riwayat <span className="text-[#FF8C00]">Selesai</span>
      </h2>

      {/* FILTER */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-[20px] md:mb-[25px] items-stretch md:items-start">
        {/* SEARCH KODE */}
        <input
          type="text"
          placeholder="Cari kode pesanan..."
          value={searchKode}
          onChange={(e) => setSearchKode(e.target.value)}
          className="flex-1 p-3 md:p-4 text-sm md:text-base rounded-2xl border border-gray-200 outline-none focus:border-[#FF8C00] bg-white w-full"
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
            
            className="w-full p-3 md:p-4 text-sm md:text-base rounded-2xl border border-gray-200 outline-none focus:border-[#FF8C00] bg-white text-left"
            
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

                  {/* Tombol ke bulan selanjutnya */}
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
        <div className="space-y-3">
          {paginatedOrders.map((o, idx) => {
            const parsedItems = parseItems(o.items);
            return (
              <div
                key={o.id}
                className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100"
              >
                {/* Header Card (Dioptimasi untuk Mobile) */}
                <div
                  className="p-4 md:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 cursor-pointer bg-[#fafafa] hover:bg-gray-100 transition-colors"
                  onClick={() => toggleDetail(idx)}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-x-2 text-sm md:text-base text-gray-800">
                      <b className="font-bold text-gray-900">Meja {o.meja_id}</b>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <span className="text-gray-500 text-xs md:text-sm">
                        {new Date(o.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <span className="text-[11px] md:text-[12px] text-[#FF8C00] font-bold tracking-wider truncate">
                      {o.kode_pesanan || 'KODE TIDAK TERSEDIA'}
                    </span>
                  </div>

                  {/* Bagian Harga & Panah */}
                  <div className="flex justify-between sm:justify-end items-center gap-3 border-t sm:border-none pt-2 sm:pt-0 border-gray-100">
                    <span className="text-xs text-gray-400 block sm:hidden">Total Bayar:</span>
                    <span className="font-bold text-sm md:text-base text-gray-900 flex items-center gap-2">
                      Rp {Number(o.total_harga || 0).toLocaleString('id-ID')}
                      <span
                        className={`text-gray-400 transition-transform duration-300 ${
                          openIndex === idx ? 'rotate-180' : ''
                        }`}
                      >
                        ▾
                      </span>
                    </span>
                  </div>
                </div>

                {/* Detail Card */}
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    openIndex === idx ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="p-4 md:p-5 border-t border-gray-100 bg-white">
                    <ul className="divide-y divide-gray-50 space-y-2 text-gray-600">
                      {parsedItems.length > 0 ? (
                        parsedItems.map((i, iIdx) => (
                          <li key={`${i.nama}-${iIdx}`} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs md:text-sm">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium text-gray-800">
                                {i.nama}
                              </span>
                              {Number(i.harga_extra || 0) > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 rounded text-gray-500 font-medium">
                                  {String(i.varian).toLowerCase() === 'extra' ? 'Extra' : 'Biasa'}
                                </span>
                              )}
                              <span className="text-gray-400 font-normal ml-1">
                                x{i.qty}
                              </span>
                            </div>
                            <span className="text-gray-500 font-mono text-left sm:text-right">
                              Rp {(Number(i.harga || 0) * Number(i.qty || 0)).toLocaleString('id-ID')}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-400 italic list-none py-2">
                          Detail item tidak tersedia
                        </li>
                      )}
                    </ul>

                    {/* Metadata Pembayaran */}
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="text-gray-500 font-medium">
                          Metode Pembayaran
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-white text-[11px] font-bold tracking-wide ${
                            o.metode_pembayaran === 'QRIS' ? 'bg-blue-600' : 'bg-green-600'
                          }`}
                        >
                          {o.metode_pembayaran}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="text-gray-500 font-medium">Status</span>
                        <span className="font-bold text-green-600 tracking-wider text-[11px] md:text-xs bg-green-50 px-2 py-1 rounded-md">
                          STATUS: SELESAI
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1.5 md:gap-2 mt-6 flex-wrap">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            ←
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              const half = Math.floor(maxVisiblePages / 2);
              return page >= currentPage - half && page <= currentPage + half;
            })
            .map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 text-sm rounded-xl font-bold transition-all ${
                  currentPage === page
                    ? "bg-[#FF8C00] text-white shadow-md shadow-orange-500/20"
                    : "bg-white border text-gray-600 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
};

export default RiwayatPesanan;