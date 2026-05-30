import React, {
  useEffect,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabaseClient";

const BerandaPembeli = () => {

  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================

  const [menuTerlaris, setMenuTerlaris] =
    useState([]);

  const [heroImage, setHeroImage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  // =========================
  // FETCH HERO IMAGE
  // =========================

  const fetchHeroImage =
    async () => {

      try {

        const {
          data,
          error
        } = await supabase
          .from("menu")
          .select("*")
          .ilike(
            "nama",
            "%ayam goreng%"
          )
          .single();

        if (error) throw error;

        if (data) {

          setHeroImage(
            data.img
          );

        }

      } catch (error) {

        console.log(error);

      }

    };

  // =========================
  // FETCH MENU TERLARIS
  // =========================

  const fetchMenuTerlaris =
    async () => {

      try {

        setLoading(true);

        // =========================
        // AMBIL DATA PESANAN
        // =========================

        const {
          data,
          error
        } = await supabase
          .from("pesanan")
          .select("*");

        if (error) throw error;

        // =========================
        // HITUNG TOTAL PESANAN
        // =========================

        let countMenu = {};

        data.forEach((pesanan) => {

          let items =
            Array.isArray(
              pesanan.items
            )

              ? pesanan.items

              : JSON.parse(
                  pesanan.items || "[]"
                );

          items.forEach((item) => {

            if (
              countMenu[item.nama]
            ) {

              countMenu[item.nama]
                .qty += Number(
                item.qty
              );

            } else {

              countMenu[item.nama] = {

                ...item,

                qty: Number(
                  item.qty
                )

              };

            }

          });

        });

        // =========================
        // SORT MENU TERLARIS
        // =========================

        const sortedMenu =
          Object.values(
            countMenu
          ).sort(
            (a, b) =>
              b.qty - a.qty
          );

        // =========================
        // AMBIL 3 TERATAS
        // =========================

        setMenuTerlaris(

          sortedMenu.slice(0, 3)

        );

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);

      }

    };

  // =========================
  // USE EFFECT
  // =========================

  useEffect(() => {

    fetchHeroImage();

    fetchMenuTerlaris();

  }, []);

  return (

    <div className="w-full min-h-screen bg-[#f0f2f5] overflow-hidden">

      {/* ========================= */}
      {/* HERO */}
      {/* ========================= */}

      <section className="max-w-7xl mx-auto px-6 py-20">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ========================= */}
          {/* KIRI */}
          {/* ========================= */}

          <div>

            <p className="text-[#FF8C00] font-black text-2xl mb-6">

              SELAMAT DATANG

            </p>

            <h1 className="text-6xl lg:text-8xl font-black leading-tight text-[#002366]">

              Pemesanan
              <br />

              Makanan
              <br />

              <span className="text-[#FF8C00]">

                Online

              </span>

            </h1>

            <p className="text-gray-500 text-xl leading-relaxed mt-10 max-w-2xl">

              Pesan makanan favorit Anda dengan cepat,
              mudah, praktis, dan modern langsung dari meja Anda.

            </p>

            {/* BUTTON */}
            <div className="flex flex-wrap gap-5 mt-12">

              <button
                onClick={() =>
                  navigate("/daftar-menu")
                }
                className="bg-[#FF8C00] hover:bg-orange-600 text-white px-10 py-5 rounded-3xl font-black text-xl transition-all duration-300 hover:scale-105 shadow-2xl"
              >

                Pesan Sekarang

              </button>

              <button
                onClick={() =>
                  navigate("/status-pesanan")
                }
                className="bg-white hover:bg-gray-100 text-[#002366] border border-gray-200 px-10 py-5 rounded-3xl font-black text-xl transition-all duration-300 shadow-sm"
              >

                Cek Pesanan

              </button>

            </div>

          </div>

          {/* ========================= */}
          {/* KANAN */}
          {/* ========================= */}

          <div className="flex justify-center">

            <div className="relative">

              {/* ORANGE EFFECT */}
              <div className="absolute -top-5 -left-5 w-full h-full bg-[#FF8C00] rounded-[50px] rotate-3"></div>

              {/* IMAGE */}
              <img
                src={
                  heroImage ||
                  "https://images.unsplash.com/photo-1504674900247-0877df9cc836"
                }
                alt="Hero"
                className="relative w-full max-w-2xl h-[550px] object-cover rounded-[50px] shadow-2xl"
              />

            </div>

          </div>

        </div>

      </section>

      {/* ========================= */}
      {/* MENU TERLARIS */}
      {/* ========================= */}

      <section className="max-w-7xl mx-auto px-6 pb-24">

        {/* TITLE */}
        <div className="mb-12">

          <p className="text-[#FF8C00] font-black text-xl mb-4">

            PALING FAVORIT

          </p>

          <h2 className="text-5xl font-black text-[#002366]">

            Menu Terlaris

          </h2>

          <p className="text-gray-500 mt-4 text-lg">

            Menu yang paling sering dipesan pelanggan bulan ini.

          </p>

        </div>

        {/* ========================= */}
        {/* LOADING */}
        {/* ========================= */}

        {loading && (

          <div className="flex justify-center items-center py-20">

            <div className="w-16 h-16 border-[6px] border-[#002366] border-t-transparent rounded-full animate-spin"></div>

          </div>

        )}

        {/* ========================= */}
        {/* EMPTY */}
        {/* ========================= */}

        {!loading &&
          menuTerlaris.length === 0 && (

          <div className="bg-white rounded-[40px] p-20 text-center shadow-sm">

            <div className="text-8xl mb-6">

              🍽️

            </div>

            <h2 className="text-5xl font-black text-[#002366]">

              Belum Ada Pesanan

            </h2>

            <p className="text-gray-500 mt-5 text-lg">

              Menu terlaris akan muncul setelah ada transaksi.

            </p>

          </div>

        )}

        {/* ========================= */}
        {/* GRID */}
        {/* ========================= */}

        {!loading &&
          menuTerlaris.length > 0 && (

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">

            {menuTerlaris.map((item, index) => (

              <div
                key={index}
                className="bg-white rounded-[40px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >

                {/* IMAGE */}
                <div className="relative overflow-hidden h-80">

                  <img
                    src={item.img}
                    alt={item.nama}
                    className="w-full h-full object-cover hover:scale-110 transition-all duration-700"
                  />

                  {/* BADGE */}
                  <div className="absolute top-5 left-5 bg-[#FF8C00] text-white px-5 py-3 rounded-2xl font-black shadow-xl">

                    #{index + 1} Terlaris

                  </div>

                </div>

                {/* CONTENT */}
                <div className="p-8">

                  <h3 className="text-4xl font-black text-[#002366]">

                    {item.nama}

                  </h3>

                  <p className="text-gray-500 mt-4 text-lg leading-relaxed">

                    Sudah dipesan sebanyak{" "}

                    <span className="font-black text-[#FF8C00]">

                      {item.qty}x

                    </span>

                  </p>

                  {/* HARGA */}
                  <h2 className="text-[#FF8C00] text-4xl font-black mt-6">

                    Rp{" "}
                    {Number(
                      item.harga
                    ).toLocaleString()}

                  </h2>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

    </div>

  );

};

export default BerandaPembeli;