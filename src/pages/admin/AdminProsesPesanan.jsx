import React, {
  useEffect,
  useState
} from 'react';

import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const AdminProsesPesanan = () => {

  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // SEARCH
  const [search, setSearch] = useState('');

  // PAGINATION STATE
  const [pages, setPages] = useState({});

  // PARSE ITEMS
  const parseItems = (items) => {

    if (Array.isArray(items)) {
      return items;
    }

    if (typeof items === 'string') {

      try {

        const parsed = JSON.parse(items);

        return Array.isArray(parsed)
          ? parsed
          : [];

      } catch (error) {

        console.error(
          'Gagal parse items:',
          error
        );

        return [];

      }

    }

    return [];

  };

  // FETCH DATA
  const fetchOrders = async () => {

    try {

      setLoading(true);

      const { data, error } = await supabase
        .from('history_pesanan')
        .select('*')
        .eq('status', 'Diproses')
        .order('created_at', {
          ascending: false
        });

      if (error) throw error;

      setActiveOrders(data || []);

    } catch (error) {

      console.error(
        'Gagal mengambil pesanan:',
        error.message
      );

    } finally {

      setLoading(false);

    }

  };

  // FETCH
  useEffect(() => {

    fetchOrders();

  }, []);

  // SEARCH FILTER
  const filteredOrders = activeOrders.filter((order) => {

    const keyword = search.toLowerCase();

    return (

      String(order.id)
        .toLowerCase()
        .includes(keyword)

      ||

      order.kode_pesanan
        ?.toLowerCase()
        .includes(keyword)

    );

  });

  // SELESAIKAN PESANAN
  const selesaikanPesanan = async (id) => {

    try {

      const { error } = await supabase
        .from('history_pesanan')
        .update({
          status: 'Selesai'
        })
        .eq('id', id);

      if (error) throw error;

      // REFRESH
      fetchOrders();

      toast.success(
        'Pesanan berhasil diselesaikan!',
        {
          style: {
            fontSize: '15px',
            fontWeight: '700',
            borderRadius: '18px',
            padding: '16px',
          },
        }
      );

    } catch (error) {

      console.error(
        'Gagal update status:',
        error.message
      );

      toast.error(
        'Gagal menyelesaikan pesanan'
      );

    }

  };

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
      <h2 className="text-3xl font-black text-[#002366] mb-8">

        Monitoring <span className="text-[#FF8C00]">Meja Aktif</span>

      </h2>

      {/* SEARCH */}
      <div className="mb-8">

        <input
          type="text"
          placeholder="Cari ID / kode pesanan..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full md:w-[420px] p-4 rounded-2xl border border-gray-200 outline-none bg-white shadow-sm focus:border-[#FF8C00]"
        />

      </div>

      {/* EMPTY */}
      {filteredOrders.length === 0 ? (

        <div className="bg-white p-20 rounded-[40px] text-center border-2 border-dashed">

          <p className="text-gray-400 italic">

            Pesanan tidak ditemukan.

          </p>

        </div>

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {filteredOrders.map((order) => {

            // PARSE ITEMS
            const parsedItems =
              parseItems(order.items);

            // PAGINATION
            const currentPage =
              pages[order.id] || 1;

            const itemsPerPage = 5;

            const totalPages = Math.ceil(
              parsedItems.length / itemsPerPage
            );

            const startIndex =
              (currentPage - 1) * itemsPerPage;

            const visibleItems =
              parsedItems.slice(
                startIndex,
                startIndex + itemsPerPage
              );

            return (

              <div
                key={order.id}
                className="bg-white rounded-[25px] shadow-md border overflow-hidden flex flex-col h-650px"
              >

                {/* HEADER */}
                <div className="bg-[#002366] p-4 text-white flex justify-between items-center">

                  <div>

                    {/* MEJA */}
                    <h4 className="font-black text-xl">

                      MEJA {order.nomor_meja}

                    </h4>

                    {/* ID */}
                    <p className="text-[12px] mt-1 text-blue-200 font-semibold">

                      ID: {order.id}

                    </p>

                    {/* KODE */}
                    <p className="text-[13px] mt-1 text-orange-300 font-bold">

                      {order.kode_pesanan || 'KODE BELUM ADA'}

                    </p>

                    {/* TANGGAL */}
                    <p className="text-[12px] opacity-80 mt-1">

                      {new Date(order.created_at)
                        .toLocaleString('id-ID')}

                    </p>

                  </div>

                  {/* STATUS */}
                  <span className="text-[10px] bg-[#FF8C00] px-2 py-1 rounded font-bold uppercase tracking-wider">

                    DIPROSES

                  </span>

                </div>

                {/* BODY */}
                <div className="p-5 flex flex-col flex-1">

                  {/* ITEMS */}
                 <ul className="mb-6 space-y-2 h-220px overflow-hidden">

                    {visibleItems.length > 0 ? (

                      visibleItems.map((item, i) => (

                        <li
                          key={`${item.nama}-${i}`}
                          className="flex justify-between text-sm border-b pb-1"
                        >

                          <span>

                            <b className="text-[#FF8C00]">

                              {item.qty}x

                            </b>{' '}

                            {item.nama}

                          </span>

                          <span className="text-gray-400 font-bold">

                            Rp {Number(item.subtotal || 0).toLocaleString()}

                          </span>

                        </li>

                      ))

                    ) : (

                      <li className="text-sm text-gray-400 italic list-none">

                        Detail item tidak tersedia

                      </li>

                    )}

                  </ul>

                  {/* PAGINATION */}
                  {totalPages > 1 && (

                    <div className="flex justify-center items-center gap-2 mb-6">

                      {/* PREV */}
                      <button
                        disabled={currentPage === 1}
                        onClick={() =>
                          setPages((prev) => ({
                            ...prev,
                            [order.id]: currentPage - 1
                          }))
                        }
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          currentPage === 1
                            ? 'bg-gray-200 text-gray-400'
                            : 'bg-[#002366] text-white'
                        }`}
                      >

                        ←

                      </button>

                      {/* PAGE */}
                      <span className="text-xs font-bold text-gray-500">

                        {currentPage} / {totalPages}

                      </span>

                      {/* NEXT */}
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() =>
                          setPages((prev) => ({
                            ...prev,
                            [order.id]: currentPage + 1
                          }))
                        }
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          currentPage === totalPages
                            ? 'bg-gray-200 text-gray-400'
                            : 'bg-[#002366] text-white'
                        }`}
                      >

                        →

                      </button>

                    </div>

                  )}

                  {/* METODE */}
                  <div className="flex justify-between items-center mb-4">

                    <span className="text-xs font-bold text-gray-400 uppercase">

                      Metode

                    </span>

                    <span
                      className={`text-xs px-3 py-1 rounded-full text-white font-bold ${
                        order.metode_pembayaran === 'QRIS'
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                      }`}
                    >

                      {order.metode_pembayaran}

                    </span>

                  </div>

                  {/* TOTAL */}
                  <div className="flex justify-between items-center mb-6">

                    <span className="text-xs font-bold text-gray-400 uppercase">

                      Total Bayar

                    </span>

                    <span className="text-2xl font-black text-[#002366]">

                      Rp {Number(order.total_harga || 0).toLocaleString()}

                    </span>

                  </div>

                  {/* BUTTON */}
                  <button
                    onClick={() =>
                      selesaikanPesanan(order.id)
                    }
                    className="mt-auto w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >

                    Selesaikan Pesanan

                  </button>

                </div>

              </div>

            );

          })}

        </div>

      )}

    </div>

  );

};

export default AdminProsesPesanan;