import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../config/supabase";

export default function BerandaPembeli() {

  const navigate = useNavigate();

  const [menuTerlaris, setMenuTerlaris] = useState([]);

  useEffect(() => {

    getMenuTerlaris();

  }, []);

  const getMenuTerlaris = async () => {

    const { data, error } = await supabase

      .from("pesanan")

      .select("*")

      .eq("is_checkout", true)

      .order("qty", { ascending: false })

      .limit(4);

    if (error) {

      console.log(error);

      return;

    }

    setMenuTerlaris(data || []);

  };

  return (

    <div className="bg-[#F4F5F7] min-h-screen">

      {/* ====================================================== */}
      {/* CONTAINER */}
      {/* ====================================================== */}

      <div className="w-full px-5 md:px-10 xl:px-16 py-10">

        {/* ====================================================== */}
        {/* HERO */}
        {/* ====================================================== */}

        <div
          className="
          bg-white
          rounded-[40px]
          p-8 md:p-12
          shadow-sm
          w-full
          "
        >

          <div className="max-w-[900px]">

            <h3
              className="
              text-[#FF8C00]
              font-black
              uppercase
              text-lg
              "
            >

              Selamat Datang

            </h3>

            <h1
              className="
              text-[55px]
              md:text-[90px]
              leading-none
              font-black
              text-[#002366]
              mt-5
              "
            >

              Pemesanan
              <br />
              Makanan
              <span className="text-[#FF8C00]">

                {" "}Online

              </span>

            </h1>

            <p
              className="
              text-gray-500
              text-lg
              md:text-2xl
              mt-8
              max-w-[700px]
              "
            >

              Pesan makanan favorit Anda dengan cepat,
              mudah, dan praktis langsung dari meja Anda.

            </p>

            {/* BUTTON */}

            <div className="flex flex-wrap gap-5 mt-10">

              <button
                onClick={() =>
                  navigate("/daftar-menu")
                }
                className="
                bg-[#FF8C00]
                hover:bg-orange-600
                text-white
                px-10
                py-5
                rounded-[22px]
                font-black
                text-lg
                transition-all
                "
              >

                Pesan Sekarang

              </button>

              <button
                onClick={() =>
                  navigate("/status-pesanan")
                }
                className="
                bg-[#002366]
                hover:bg-blue-950
                text-white
                px-10
                py-5
                rounded-[22px]
                font-black
                text-lg
                transition-all
                "
              >

                Cek Pesanan

              </button>

            </div>

          </div>

        </div>

        {/* ====================================================== */}
        {/* MENU TERLARIS */}
        {/* ====================================================== */}

        <div className="mt-16">

          <h1
            className="
            text-5xl
            md:text-6xl
            font-black
            text-[#002366]
            "
          >

            Menu Terlaris

          </h1>

          <p
            className="
            text-gray-500
            text-lg
            mt-3
            "
          >

            Menu paling sering dipesan pelanggan bulan ini.

          </p>

          {/* GRID */}

          <div
            className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-6
            mt-10
            "
          >

            {menuTerlaris.map((item, index) => (

              <div
                key={item.id}
                className="
                bg-white
                rounded-[30px]
                overflow-hidden
                shadow-sm
                w-full
                relative
                "
              >

                {/* BADGE */}

                <div
                  className="
                  absolute
                  top-4
                  left-4
                  bg-[#FF8C00]
                  text-white
                  px-4
                  py-2
                  rounded-2xl
                  font-black
                  text-sm
                  z-10
                  "
                >

                  #{index + 1}

                </div>

                {/* IMAGE */}

                <img
                  src={item.gambar}
                  alt={item.nama}
                  className="
                  w-full
                  h-[260px]
                  object-cover
                  "
                />

                {/* CONTENT */}

                <div className="p-6">

                  <h1
                    className="
                    text-3xl
                    font-black
                    text-[#002366]
                    "
                  >

                    {item.nama}

                  </h1>

                  <p
                    className="
                    text-gray-500
                    mt-2
                    text-lg
                    "
                  >

                    Dipesan
                    <span className="text-[#FF8C00] font-black">

                      {" "}{item.qty}x

                    </span>

                  </p>

                  <h2
                    className="
                    text-[#FF8C00]
                    text-4xl
                    font-black
                    mt-5
                    "
                  >

                    Rp{" "}
                    {Number(
                      item.harga
                    ).toLocaleString()}

                  </h2>

                  {/* BUTTON */}

                  <button
                    onClick={() =>
                      navigate("/daftar-menu")
                    }
                    className="
                    w-full
                    bg-[#002366]
                    hover:bg-blue-950
                    text-white
                    py-4
                    rounded-[20px]
                    font-black
                    text-lg
                    mt-6
                    transition-all
                    "
                  >

                    Pesan

                  </button>

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

    </div>

  );

}