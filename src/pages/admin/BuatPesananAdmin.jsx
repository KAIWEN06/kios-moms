import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../../lib/supabaseClient";

const AdminBuatPesanan = ({ cart, updateQty }) => {

  const navigate = useNavigate();

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  // TOTAL ITEM
  const totalItem =
    Object.values(cart).reduce(
      (a, b) => a + b,
      0
    );

  // FETCH MENU
  const fetchMenu = async () => {

    try {

      setLoading(true);

      const { data, error } =
        await supabase
          .from('menu')
          .select('*')
          .neq('stok', 'nonaktif');

      if (error) throw error;

      setMenu(data || []);

    } catch (error) {

      console.error(
        'Error fetching menu:',
        error.message
      );

    } finally {

      setLoading(false);

    }

  };

  // FETCH
  useEffect(() => {

    fetchMenu();

  }, []);

  // LOADING
  if (loading) {

    return (

      <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">

        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#002366]"></div>

      </div>

    );

  }

  return (

    <div className="p-4 md:p-10 bg-[#f0f2f5] min-h-screen relative pb-32">

      {/* TITLE */}
      <h2 className="text-center text-3xl font-black mb-10 text-[#002366]">

        Katalog <span className="text-[#FF8C00]">Kios Mom's</span>

      </h2>

      {/* GRID MENU */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 w-full">

        {menu.map((m) => (

          <div
            key={m.id}
            className={`bg-white rounded-3xl shadow-sm border overflow-hidden flex flex-col transition-all duration-300
              
              ${
                m.stok === 'kosong'
                  ? 'grayscale opacity-60'
                  : 'hover:shadow-xl hover:-translate-y-1'
              }`}
          >

            {/* IMAGE */}
            <div className="aspect-square w-full overflow-hidden relative">

              <img
                src={m.img}
                alt={m.nama}
                className="w-full h-full object-cover"
              />

              {/* HABIS */}
              {m.stok === 'kosong' && (

                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">

                  <span className="text-white font-black text-xl italic -rotate-12 uppercase tracking-tighter">

                    Habis

                  </span>

                </div>

              )}

            </div>

            {/* CONTENT */}
            <div className="p-4 flex flex-col flex-grow justify-between">

              <div>

                {/* NAMA */}
                <h4 className="font-black text-gray-800 text-sm leading-tight mb-1 line-clamp-2">

                  {m.nama}

                </h4>

                {/* HARGA */}
                <p className="text-[#FF8C00] font-black text-sm">

                  Rp {Number(
                    m.harga
                  ).toLocaleString()}

                </p>

              </div>

              {/* QTY */}
              <div className="flex items-center justify-between mt-4 bg-gray-50 rounded-2xl p-2 border">

                {/* MIN */}
                <button
                  onClick={() =>
                    updateQty(m.id, -1)
                  }
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-gray-100 font-black text-[#002366]"
                >

                  -

                </button>

                {/* TOTAL */}
                <span className="text-sm font-black text-[#002366]">

                  {cart[m.id] || 0}

                </span>

                {/* PLUS */}
                <button
                  onClick={() => {

                    if (
                      m.stok !== 'kosong'
                    ) {

                      updateQty(
                        m.id,
                        1
                      );

                    }

                  }}
                  disabled={
                    m.stok === 'kosong'
                  }
                  className={`w-8 h-8 flex items-center justify-center rounded-xl shadow-sm text-white transition-all font-black
                  
                  ${
                    m.stok === 'kosong'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#002366] hover:bg-blue-900 hover:scale-105'
                  }`}
                >

                  +

                </button>

              </div>

            </div>

          </div>

        ))}

      </div>

      {/* FLOAT BUTTON */}
      {totalItem > 0 && (

        <div className="fixed bottom-10 right-6 z-50">

          <button
            onClick={() =>
              navigate('/admin/pesanan')
            }
            className="bg-[#FF8C00] text-white flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
          >

            <div className="flex flex-col items-start leading-none">

              <span className="text-[10px] font-bold opacity-80 uppercase">

                Selesai Pilih

              </span>

              <span className="text-lg font-black">

                {totalItem} Pesanan

              </span>

            </div>

            <span className="text-xl">

              →

            </span>

          </button>

        </div>

      )}

    </div>

  );

};

export default AdminBuatPesanan;