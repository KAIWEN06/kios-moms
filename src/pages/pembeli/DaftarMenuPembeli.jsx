import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  supabase
} from "../../lib/supabaseClient";

import {
  toast
} from "react-hot-toast";

export default function DaftarMenuPembeli() {

  const navigate =
    useNavigate();

  /* =====================================================
     STATE
  ===================================================== */

  const [menu, setMenu] =
    useState([]);

  const [
    keranjang,
    setKeranjang
  ] = useState([]);

  const [kiosBuka, setKiosBuka] =
  useState(true);

  const [loading, setLoading] =
    useState(true);

  const ambilStatusKios =
  async () => {

    try {

      const {
        data,
        error
      } = await supabase
        .from("pengaturan_kios")
        .select("buka")
        .eq("id", 1)
        .single();

      if (error)
        throw error;

      setKiosBuka(
        data?.buka ?? true
      );

    } catch (error) {

      console.log(error);

    }

  };

  /* =====================================================
     LOAD AWAL
  ===================================================== */

  useEffect(() => {

  ambilMenu();

  ambilKeranjang();

  ambilStatusKios();

}, []);


  /* =====================================================
     REALTIME MENU
  ===================================================== */

  useEffect(() => {

    const channel =
      supabase
        .channel(
          "realtime-menu-pembeli"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "menu"
          },
          async () => {

            await ambilMenu();

            ambilKeranjang();

          }
        )
        .subscribe();

    return () => {

      supabase.removeChannel(
        channel
      );

    };

  }, []);

  useEffect(() => {

  const channel =
    supabase
      .channel(
        "realtime-kios"
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pengaturan_kios"
        },
        (payload) => {

          setKiosBuka(
            payload.new.buka
          );

        }
      )
      .subscribe();

  return () => {

    supabase.removeChannel(
      channel
    );

  };

}, []);

  useEffect(() => {

  if (!kiosBuka) {

    localStorage.removeItem(
      "keranjang"
    );

    setKeranjang([]);

    toast.error(
      "Kios telah ditutup. Keranjang dikosongkan."
    );

  }

}, [kiosBuka]);
  /* =====================================================
     AMBIL MENU
  ===================================================== */

  const ambilMenu =
    async () => {

      try {

        setLoading(true);

        const {
          data,
          error
        } = await supabase
          .from("menu")
          .select("*")
          .neq(
            "stok",
            "nonaktif"
          )
          .eq(
            "is_aktif",
            true
          )
          .order(
            "id",
            {
              ascending: true
            }
          );

        if (error)
          throw error;

        const menuReady =
      data || [];

    /* =====================================================
      HITUNG TOTAL TERJUAL
    ===================================================== */

    const {
      data: pesananData
    } = await supabase
      .from("pesanan")
      .select("items")
      .eq(
        "is_checkout",
        true
      );

    const totalTerjual = {};

    (pesananData || []).forEach(
      (pesanan) => {

        let items = [];

        try {

          items =
            typeof pesanan.items ===
            "string"

              ? JSON.parse(
                  pesanan.items
                )

              : pesanan.items || [];

        } catch {

          items = [];

        }

        items.forEach((item) => {

          if (!totalTerjual[item.id]) {

            totalTerjual[item.id] = 0;

          }

          totalTerjual[item.id] +=
            Number(item.qty) || 0;

        });

      }
    );

    /* =====================================================
      SORTING MENU
    ===================================================== */

    const sortedMenu =
      [...menuReady].sort(
        (a, b) => {

          // MENU HABIS KE BAWAH
          if (
            a.stok === "kosong" &&
            b.stok !== "kosong"
          ) {
            return 1;
          }

          if (
            a.stok !== "kosong" &&
            b.stok === "kosong"
          ) {
            return -1;
          }

          // PALING LARIS KE ATAS
          return (
            (totalTerjual[b.id] || 0) -
            (totalTerjual[a.id] || 0)
          );

        }
      );

    setMenu(sortedMenu);

            // VALIDASI CART
            validasiKeranjang(
              menuReady
            );

          } catch (error) {

            console.log(error);

            toast.error(
              "Gagal mengambil menu"
            );

          } finally {

            setLoading(false);

          }

        };

  /* =====================================================
     AMBIL KERANJANG
  ===================================================== */

  const ambilKeranjang =
    () => {

      try {

        const dataKeranjang =
          JSON.parse(
            localStorage.getItem(
              "keranjang"
            )
          ) || [];

        setKeranjang(
          dataKeranjang
        );

      } catch (error) {

        console.log(error);

      }

    };

  /* =====================================================
     VALIDASI KERANJANG
  ===================================================== */

  const validasiKeranjang =
    (menuAktif) => {

      try {

        const cart =
          JSON.parse(
            localStorage.getItem(
              "keranjang"
            )
          ) || [];

        const menuIds =
          menuAktif.map(
            (x) => x.id
          );

        const removedItems =
          cart.filter(
            (item) =>
              !menuIds.includes(
                item.id
              )
          );

        if (
          removedItems.length > 0
        ) {

          removedItems.forEach(
            (item) => {

              toast.error(
                `${item.nama} sudah tidak tersedia`
              );

            }
          );

        }

        const updatedCart =
          cart.filter(
            (item) =>
              menuIds.includes(
                item.id
              )
          );

        localStorage.setItem(
          "keranjang",
          JSON.stringify(
            updatedCart
          )
        );

        setKeranjang(
          updatedCart
        );

      } catch (error) {

        console.log(error);

      }

    };

  /* =====================================================
     TAMBAH PESANAN
  ===================================================== */

  const tambahPesanan =
    (item) => {

      try {

        const menuValid =
          menu.find(
            (x) =>
              x.id === item.id
          );

        if (!kiosBuka) {

          toast.error(
            "Kios sedang tutup"
          );

          return;

        }

        if (!menuValid) {

          toast.error(
            "Menu tidak tersedia"
          );

          return;

        }

        const keranjangLama =
          JSON.parse(
            localStorage.getItem(
              "keranjang"
            )
          ) || [];

        const cek =
          keranjangLama.find(
            (x) =>
              x.id === item.id
          );

        let updatedKeranjang;

        if (cek) {

          updatedKeranjang =
            keranjangLama.map(
              (x) => {

                if (
                  x.id === item.id
                ) {

                  return {

                    ...x,

                    qty:
                      x.qty + 1

                  };

                }

                return x;

              }
            );

        } else {

          updatedKeranjang = [

            ...keranjangLama,

            {

              id: item.id,

              nama:
                item.nama,

              harga:
                item.harga,

              gambar:
                item.img,

              deskripsi:
                item.deskripsi,

              qty: 1

            }

          ];

        }

        localStorage.setItem(
          "keranjang",
          JSON.stringify(
            updatedKeranjang
          )
        );

        setKeranjang(
          updatedKeranjang
        );

        toast.success(
          "Pesanan ditambahkan"
        );

      } catch (error) {

        console.log(error);

        toast.error(
          "Gagal tambah pesanan"
        );

      }

    };

  /* =====================================================
     TAMBAH QTY
  ===================================================== */

  const tambahQty =
    (item) => {

      try {

        const menuValid =
          menu.find(
            (x) =>
              x.id === item.id
          );

        if (!menuValid) {

          toast.error(
            "Menu sudah tidak tersedia"
          );

          return;

        }

        const updated =
          keranjang.map((x) => {

            if (
              x.id === item.id
            ) {

              return {

                ...x,

                qty:
                  x.qty + 1

              };

            }

            return x;

          });

        localStorage.setItem(
          "keranjang",
          JSON.stringify(
            updated
          )
        );

        setKeranjang(updated);

      } catch (error) {

        console.log(error);

      }

    };

  /* =====================================================
     KURANG QTY
  ===================================================== */

  const kurangQty =
    (item) => {

      try {

        let updated =
          keranjang.map((x) => {

            if (
              x.id === item.id
            ) {

              return {

                ...x,

                qty:
                  x.qty - 1

              };

            }

            return x;

          });

        updated =
          updated.filter(
            (x) =>
              x.qty > 0
          );

        localStorage.setItem(
          "keranjang",
          JSON.stringify(
            updated
          )
        );

        setKeranjang(updated);

      } catch (error) {

        console.log(error);

      }

    };

  /* =====================================================
     TOTAL ITEM
  ===================================================== */

  const totalItem =
    useMemo(() => {

      return keranjang.reduce(
        (acc, item) =>

          acc + item.qty,

        0
      );

    }, [keranjang]);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {

    return (

      <div
        className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-[#f5f6fa]
        "
      >

        <div
          className="
          w-14
          h-14
          rounded-full
          border-4
          border-[#002366]
          border-t-transparent
          animate-spin
          "
        ></div>

      </div>

    );

  }

  return (

    <div
      className="
      min-h-screen
      bg-[#f5f6fa]
      px-4
      md:px-8
      py-6
      pb-40
      "
    >

      {/* TITLE */}

      <h1
        className="
        text-4xl
        md:text-6xl
        font-black
        text-[#002366]
        "
      >

        Daftar{" "}

        <span className="text-[#FF8C00]">

          Menu

        </span>

      </h1>

      <p className="text-gray-500 mt-2">

        Pilih menu favorit Anda

      </p>

      {
      !kiosBuka && (

        <div
          className="
          mt-6
          bg-red-100
          border
          border-red-300
          text-red-700
          rounded-2xl
          p-4
          font-bold
          "
        >

          Kios Mom's sedang tutup.
          Pemesanan sementara tidak tersedia.

        </div>

      )
    }

      {/* EMPTY */}

      {
        menu.length === 0 && (

          <div
            className="
            bg-white
            rounded-[30px]
            p-12
            text-center
            mt-8
            "
          >

            <h1
              className="
              text-3xl
              font-black
              text-gray-400
              "
            >

              Menu belum tersedia

            </h1>

          </div>

        )
      }

      {/* LIST MENU */}

      <div
        className="
        grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
        gap-6
        mt-8
        "
      >

        {
          menu.map((item) => {

            const existingItem =
              keranjang.find(
                (x) =>
                  x.id === item.id
              );

            return (

              <div
                key={item.id}
                className="
                bg-white
                rounded-[30px]
                overflow-hidden
                shadow-sm
                "
              >

                {/* IMAGE */}

                <div className="relative">

                  <img
                    src={item.img}
                    alt={item.nama}
                    className={`
                    w-full
                    h-[240px]
                    object-cover

                    ${
                      item.stok === "kosong"
                        ? "grayscale opacity-60"
                        : ""
                    }
                    `}
                  />

                  {
                  item.stok === "kosong" && (

                    <div
                      className="
                      absolute
                      inset-0
                      flex
                      items-center
                      justify-center
                      "
                    >

                      <div
                        className="
                        bg-black/55
                        backdrop-blur-sm

                        text-white
                        font-bold
                        uppercase

                        px-6
                        py-3

                        rounded-full

                        tracking-wide
                        text-sm
                        md:text-base

                        shadow-lg
                        "
                      >

                        Menu Habis

                      </div>

                    </div>

                  )
                }

                </div>

                {/* CONTENT */}

                <div className="p-5">

                  {/* NAMA */}

                  <h1
                    className="
                    text-[28px]
                    leading-tight
                    font-black
                    text-[#002366]
                    "
                  >

                    {item.nama}

                  </h1>

                  {/* DESKRIPSI */}

                  <p
                    className="
                    text-gray-500
                    mt-2
                    text-sm
                    leading-relaxed
                    "
                  >

                    {
                      item.deskripsi
                    }

                  </p>

                  {/* HARGA */}

                  <h2
                    className="
                    text-[#FF8C00]
                    text-[30px]
                    font-black
                    mt-5
                    "
                  >

                    Rp{" "}

                    {
                      Number(
                        item.harga
                      ).toLocaleString(
                        "id-ID"
                      )
                    }

                  </h2>

                  {/* ACTION */}

                  {
                    item.stok === "kosong" ? (

                      <button
                        disabled
                        className="
                        w-full
                        bg-gray-300
                        text-gray-500
                        py-4
                        rounded-[20px]
                        font-black
                        text-lg
                        mt-5
                        cursor-not-allowed
                        "
                      >

                        Menu Habis

                      </button>

                    ) : !existingItem ? (

                      <button
                        disabled={!kiosBuka}
                        onClick={() =>
                          tambahPesanan(item)
                        }
                        className={`
                          w-full
                          py-4
                          rounded-[20px]
                          font-black
                          text-lg
                          mt-5
                          transition-all

                          ${
                            kiosBuka
                              ? "bg-[#002366] hover:bg-blue-950 text-white"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }
                        `}
                      >
                        {
                          kiosBuka
                            ? "Tambah Pesanan"
                            : "Kios Tutup"
                        }
                      </button>

                    ) : (

                      <div
                        className="
                        flex
                        items-center
                        justify-between
                        mt-5
                        "
                      >

                        {/* MINUS */}

                        <button
                          onClick={() =>
                            kurangQty(
                              existingItem
                            )
                          }
                          className="
                          w-[58px]
                          h-[58px]
                          rounded-[18px]
                          bg-[#E5E7EB]
                          text-[#002366]
                          text-4xl
                          font-black
                          "
                        >

                          -

                        </button>

                        {/* QTY */}

                        <h1
                          className="
                          text-4xl
                          font-black
                          text-[#002366]
                          "
                        >

                          {
                            existingItem.qty
                          }

                        </h1>

                        {/* PLUS */}

                        <button
                          onClick={() =>
                            tambahQty(
                              existingItem
                            )
                          }
                          className="
                          w-[58px]
                          h-[58px]
                          rounded-[18px]
                          bg-[#002366]
                          text-white
                          text-4xl
                          font-black
                          "
                        >

                          +

                        </button>

                      </div>

                    )
                  }

                </div>

              </div>

            );

          })
        }

      </div>

      {/* FLOATING BUTTON */}

      {
        keranjang.length > 0 && (

          <div
            className="
            fixed
            bottom-5
            right-5
            z-50
            "
          >

            <button
              onClick={() =>
                navigate(
                  "/keranjang"
                )
              }
              className="
              bg-[#FF8C00]
              hover:bg-orange-600
              text-white
              shadow-2xl
              rounded-[28px]
              px-7
              py-5
              flex
              items-center
              gap-4
              transition-all
              "
            >

              <div
                className="
                w-14
                h-14
                rounded-2xl
                bg-white/20
                flex
                items-center
                justify-center
                text-3xl
                "
              >

                🛒

              </div>

              <div className="text-left">

                <h2 className="font-black text-xl">

                  Pesan Sekarang

                </h2>

                <p className="text-sm text-white/80">

                  {
                    totalItem
                  }{" "}
                  menu dipilih

                </p>

              </div>

            </button>

          </div>

        )
      }

    </div>

  );

}