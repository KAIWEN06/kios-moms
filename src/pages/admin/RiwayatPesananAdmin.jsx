import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const RiwayatPesanan = () => {

  const [historyOrders, setHistoryOrders] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  // FETCH HISTORY
  const fetchHistory = async () => {

    try {

      setLoading(true);

      const { data, error } = await supabase
        .from('history_pesanan')
        .select('*')
        .eq('status', 'Selesai')
        .order('created_at', {
          ascending: false
        });

      if (error) throw error;

      setHistoryOrders(data || []);

    } catch (error) {

      console.error(
        'Gagal mengambil riwayat:',
        error.message
      );

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // TOGGLE DETAIL
  const toggleDetail = (idx) => {

    setOpenIndex(
      openIndex === idx ? null : idx
    );

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

    <div className="py-[40px] px-[5%] max-w-5xl mx-auto">

      {/* TITLE */}
      <h2 className="text-center mb-[30px] text-2xl md:text-3xl font-bold text-[#333]">

        Riwayat <span className="text-[#FF8C00]">Selesai</span>

      </h2>

      {/* EMPTY */}
      {historyOrders.length === 0 ? (

        <div className="bg-white p-20 rounded-3xl text-center border-2 border-dashed">

          <p className="text-gray-400 italic">

            Belum ada riwayat pesanan.

          </p>

        </div>

      ) : (

        historyOrders.map((o, idx) => {

          // ITEMS
          const parsedItems = Array.isArray(o.items)
            ? o.items
            : [];

          return (

            <div
              key={o.id}
              className="bg-white mb-[10px] rounded-[10px] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
            >

              {/* HEADER */}
              <div
                className="p-[15px] flex justify-between items-center cursor-pointer bg-[#fafafa] hover:bg-gray-100 transition-colors"
                onClick={() => toggleDetail(idx)}
              >

                <span className="text-gray-800">

                  <b className="font-bold">

                    Meja {o.nomor_meja}

                  </b>

                  <span className="mx-1 text-gray-400">

                    |

                  </span>

                  {new Date(o.created_at).toLocaleString()}

                </span>

                <span className="font-semibold text-gray-900 flex items-center gap-2">

                  Rp {Number(o.total_harga).toLocaleString()}

                  <span
                    className={`transition-transform duration-300 ${
                      openIndex === idx
                        ? 'rotate-180'
                        : ''
                    }`}
                  >
                    ▾
                  </span>

                </span>

              </div>

              {/* BODY */}
              <div
                className={`p-[15px] border-t border-[#eee] bg-white transition-all duration-300 ${
                  openIndex === idx
                    ? 'block'
                    : 'hidden'
                }`}
              >

                <ul className="list-disc list-inside space-y-2 text-gray-600">

                  {parsedItems.map((i, iIdx) => (

                    <li
                      key={iIdx}
                      className="text-sm"
                    >

                      <span className="font-semibold text-gray-800">

                        {i.nama}

                      </span>{' '}

                      x {i.qty}

                      <span className="ml-2 text-gray-500">

                        - Rp {Number(i.subtotal).toLocaleString()}

                      </span>

                    </li>

                  ))}

                </ul>

                {/* STATUS */}
                <p className="mt-[15px] font-bold text-green-600 tracking-wide text-sm">

                  STATUS: SELESAI

                </p>

              </div>

            </div>

          );

        })

      )}

    </div>

  );

};

export default RiwayatPesanan;