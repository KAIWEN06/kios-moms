import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const AdminProsesPesanan = () => {

  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchOrders();
  }, []);

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

      // REFRESH DATA
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

      <h2 className="text-3xl font-black text-[#002366] mb-8">

        Monitoring <span className="text-[#FF8C00]">Meja Aktif</span>

      </h2>

      {activeOrders.length === 0 ? (

        <div className="bg-white p-20 rounded-[40px] text-center border-2 border-dashed">

          <p className="text-gray-400 italic">

            Belum ada pesanan yang sedang diproses.

          </p>

        </div>

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {activeOrders.map((order) => {

            // ITEMS
            const parsedItems = Array.isArray(order.items)
              ? order.items
              : [];

            return (

              <div
                key={order.id}
                className="bg-white rounded-[30px] shadow-md border overflow-hidden"
              >

                {/* HEADER */}
                <div className="bg-[#002366] p-4 text-white flex justify-between items-center">

                  <div>

                    <h4 className="font-black text-xl">

                      MEJA {order.nomor_meja}

                    </h4>

                    <p className="text-[10px] opacity-80 mt-1">

                      {new Date(order.created_at).toLocaleString()}

                    </p>

                  </div>

                  <span className="text-[10px] bg-[#FF8C00] px-2 py-1 rounded font-bold uppercase tracking-wider">

                    DIPROSES

                  </span>

                </div>

                {/* BODY */}
                <div className="p-6">

                  {/* ITEMS */}
                  <ul className="mb-6 space-y-2">

                    {parsedItems.map((item, i) => (

                      <li
                        key={i}
                        className="flex justify-between text-sm border-b pb-1"
                      >

                        <span>

                          <b className="text-[#FF8C00]">

                            {item.qty}x

                          </b>{' '}

                          {item.nama}

                        </span>

                        <span className="text-gray-400 font-bold">

                          Rp {Number(item.subtotal).toLocaleString()}

                        </span>

                      </li>

                    ))}

                  </ul>

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

                      Rp {Number(order.total_harga).toLocaleString()}

                    </span>

                  </div>

                  {/* BUTTON */}
                  <button
                    onClick={() => selesaikanPesanan(order.id)}
                    className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
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