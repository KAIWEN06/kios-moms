import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../../config/supabase";

import toast from "react-hot-toast";

const KonfirmasiPesananPembeli = () => {

    const navigate = useNavigate();

    /* =====================================================
       STATE
    ===================================================== */

    const [cart, setCart] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [namaPembeli, setNamaPembeli] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [metodePembayaran, setMetodePembayaran] =
        useState("Tunai");

    const [selectedMeja, setSelectedMeja] =
        useState(null);

    const [showPopupMeja, setShowPopupMeja] =
        useState(false);

    const [currentPage, setCurrentPage] =
        useState(1);

    const [mejaDipakai, setMejaDipakai] =
        useState([]);

    /* =====================================================
       AMBIL DATA DARI KERANJANG
       RELASI DENGAN HALAMAN KERANJANG
    ===================================================== */

    useEffect(() => {

        const dataKeranjang =
    JSON.parse(
        localStorage.getItem(
            "checkoutItems"
        )
    ) || [];

        setCart(dataKeranjang);

        getMejaDipakai();

    }, []);

    /* =====================================================
       CEK MEJA YANG DIPAKAI
       JIKA MASIH DIPROSES
       MAKA TIDAK BISA DIPILIH
    ===================================================== */

    const getMejaDipakai =
        async () => {

            const {
                data,
                error,
            } = await supabase
                .from("pesanan")
                .select(
                    "nomor_meja,status"
                )
                .eq(
                    "status",
                    "diproses"
                );

            if (error) {

                console.log(error);

            useEffect(() => {

    const data =
        JSON.parse(
            localStorage.getItem(
                "checkoutItems"
            )
        ) || [];

    setCart(data);

}, []);

                return;

            }

            const mejaUsed =
                data.map(
                    (item) =>
                        Number(
                            item.nomor_meja
                        )
                );

            setMejaDipakai(
                mejaUsed
            );

        };

    /* =====================================================
       TOTAL HARGA
    ===================================================== */

    const totalHarga =
        useMemo(() => {

            return cart.reduce(
                (total, item) => {

                    return (
                        total +
                        item.harga *
                            item.qty
                    );

                },
                0
            );

        }, [cart]);

    /* =====================================================
       DATA MEJA
    ===================================================== */

    const mejaPerPage = 10;

    const totalMeja = 100;

    const allMeja = Array.from(
        { length: totalMeja },
        (_, i) => i + 1
    );

    const currentMeja =
        useMemo(() => {

            const start =
                (currentPage - 1) *
                mejaPerPage;

            const end =
                start + mejaPerPage;

            return allMeja.slice(
                start,
                end
            );

        }, [currentPage]);

    /* =====================================================
       PILIH MEJA
    ===================================================== */

    const pilihMeja =
        (nomor) => {

            const sedangDipakai =
                mejaDipakai.includes(
                    nomor
                );

            if (sedangDipakai) {

                toast.error(
                    "Meja sedang digunakan"
                );

                return;

            }

            setSelectedMeja(
                nomor
            );

        };

    /* =====================================================
       KONFIRMASI PESANAN
    ===================================================== */

    const handleKonfirmasiPesanan =
        async () => {

            try {

                if (
                    cart.length === 0
                ) {

                    toast.error(
                        "Keranjang kosong"
                    );

                    return;

                }

                if (
                    !namaPembeli
                ) {

                    toast.error(
                        "Nama pembeli wajib diisi"
                    );

                    return;

                }

                if (
                    !selectedMeja
                ) {

                    toast.error(
                        "Pilih meja terlebih dahulu"
                    );

                    return;

                }

                setLoading(true);

                const kodePesanan =
                    "ORD-" +
                    Date.now();

                const payload = {

                    kode_pesanan:
                        kodePesanan,

                    nama_pembeli:
                        namaPembeli,

                    email:
                        email,

                    nomor_meja:
                        selectedMeja,

                    metode_pembayaran:
                        metodePembayaran,

                    items:
                        JSON.stringify(
                            cart
                        ),

                    total_harga:
                        totalHarga,

                    status:
                        "diproses",

                    is_checkout:
                        true,

                };

                const {
                    error,
                } = await supabase
                    .from(
                        "pesanan"
                    )
                    .insert([
                        payload,
                    ]);

                if (error) {

                    console.log(
                        error
                    );

                    toast.error(
                        "Gagal konfirmasi pesanan"
                    );

                    return;

                }

                /* =========================================
                   HAPUS KERANJANG
                ========================================= */

                localStorage.removeItem(
                    "keranjang"
                );

                toast.success(
                    "Pesanan berhasil dikonfirmasi"
                );

                navigate(
                    "/status-pesanan"
                );

            } catch (err) {

                console.log(err);

                toast.error(
                    "Terjadi kesalahan"
                );

            } finally {

                setLoading(false);

            }

        };

    return (

        <div
            className="
            w-full
            min-h-screen
            bg-[#F3F4F6]
            px-4
            md:px-7
            py-8
            "
        >

            {/* =====================================================
               HEADER
            ===================================================== */}

            <div className="mb-8">

                <h1
                    className="
                    text-4xl
                    md:text-6xl
                    font-black
                    text-[#002366]
                    "
                >

                    Konfirmasi{" "}

                    <span className="text-[#FF8C00]">

                        Pesanan

                    </span>

                </h1>

                <p className="text-gray-500 mt-2">

                    Pastikan data pesanan sudah benar.

                </p>

            </div>

            {/* =====================================================
               CONTENT
            ===================================================== */}

            <div
                className="
                grid
                grid-cols-1
                xl:grid-cols-[1fr_450px]
                gap-6
                "
            >

                {/* =====================================================
                   LEFT
                ===================================================== */}

                <div
                    className="
                    bg-white
                    rounded-[35px]
                    p-6
                    shadow-sm
                    "
                >

                    <h2
                        className="
                        text-3xl
                        font-black
                        text-[#002366]
                        mb-8
                        "
                    >

                        Data Pembeli

                    </h2>

                    {/* NAMA */}

                    <div className="mb-5">

                        <p
                            className="
                            font-bold
                            text-[#002366]
                            mb-2
                            "
                        >

                            Nama Pembeli

                        </p>

                        <input
                            type="text"
                            maxLength={30}
                            value={
                                namaPembeli
                            }
                            onChange={(e) =>
                                setNamaPembeli(
                                    e.target
                                        .value
                                )
                            }
                            className="
                            w-full
                            h-[60px]
                            rounded-2xl
                            border
                            border-gray-300
                            px-5
                            outline-none
                            "
                        />

                    </div>

                    {/* EMAIL */}

                    <div className="mb-8">

                        <p
                            className="
                            font-bold
                            text-[#002366]
                            mb-2
                            "
                        >

                            Email

                        </p>

                        <input
                            type="email"
                            maxLength={30}
                            value={email}
                            onChange={(e) =>
                                setEmail(
                                    e.target
                                        .value
                                )
                            }
                            className="
                            w-full
                            h-[60px]
                            rounded-2xl
                            border
                            border-gray-300
                            px-5
                            outline-none
                            "
                        />

                    </div>

                    {/* =====================================================
                       PILIH MEJA
                    ===================================================== */}

                    <div className="mb-10">

                        <p
                            className="
                            font-bold
                            text-[#002366]
                            text-2xl
                            mb-4
                            "
                        >

                            Pilih Meja

                        </p>

                        <button
                            onClick={() =>
                                setShowPopupMeja(
                                    true
                                )
                            }
                            className="
                            w-full
                            md:w-[280px]
                            h-[60px]
                            rounded-2xl
                            bg-[#002366]
                            text-white
                            font-bold
                            text-lg
                            "
                        >

                            {selectedMeja
                                ? `Meja ${selectedMeja}`
                                : "Pilih Meja"}

                        </button>

                    </div>

                    {/* =====================================================
                       METODE PEMBAYARAN
                    ===================================================== */}

                    <div>

                        <p
                            className="
                            font-bold
                            text-[#002366]
                            text-2xl
                            mb-5
                            "
                        >

                            Metode Pembayaran

                        </p>

                        <div
                            className="
                            grid
                            grid-cols-1
                            md:grid-cols-2
                            gap-4
                            "
                        >

                            {/* TUNAI */}

                            <button
                                onClick={() =>
                                    setMetodePembayaran(
                                        "Tunai"
                                    )
                                }
                                className={`
                                h-[70px]
                                rounded-2xl
                                border-2
                                font-black

                                ${
                                    metodePembayaran ===
                                    "Tunai"

                                        ? "bg-[#002366] border-[#002366] text-white"

                                        : "bg-white border-gray-200 text-[#002366]"
                                }
                                `}
                            >

                                💵 Tunai

                            </button>

                            {/* QRIS */}

                            <button
                                onClick={() =>
                                    setMetodePembayaran(
                                        "QRIS"
                                    )
                                }
                                className={`
                                h-[70px]
                                rounded-2xl
                                border-2
                                font-black

                                ${
                                    metodePembayaran ===
                                    "QRIS"

                                        ? "bg-[#002366] border-[#002366] text-white"

                                        : "bg-white border-gray-200 text-[#002366]"
                                }
                                `}
                            >

                                📱 QRIS

                            </button>

                        </div>

                    </div>

                </div>

                {/* =====================================================
                   RIGHT
                ===================================================== */}

                <div
                    className="
                    bg-white
                    rounded-[35px]
                    p-6
                    shadow-sm
                    h-fit
                    sticky
                    top-28
                    "
                >

                    <h2
                        className="
                        text-3xl
                        font-black
                        text-[#002366]
                        mb-8
                        "
                    >

                        Ringkasan Pesanan

                    </h2>

                    {/* =====================================================
                       LIST MENU DARI KERANJANG
                    ===================================================== */}

                    <div className="flex flex-col gap-5">

                        {cart.map(
                            (
                                item,
                                index
                            ) => (

                                <div
                                    key={
                                        index
                                    }
                                    className="
                                    flex
                                    items-center
                                    justify-between
                                    "
                                >

                                    <div>

                                        <h3
                                            className="
                                            font-black
                                            text-[#002366]
                                            text-lg
                                            "
                                        >

                                            {
                                                item.nama
                                            }

                                        </h3>

                                        <p className="text-gray-400">

                                            {
                                                item.qty
                                            }{" "}
                                            x Rp{" "}

                                            {item.harga.toLocaleString(
                                                "id-ID"
                                            )}

                                        </p>

                                    </div>

                                    <p
                                        className="
                                        font-black
                                        text-[#FF8C00]
                                        text-xl
                                        "
                                    >

                                        Rp{" "}

                                        {(
                                            item.qty *
                                            item.harga
                                        ).toLocaleString(
                                            "id-ID"
                                        )}

                                    </p>

                                </div>

                            )
                        )}

                    </div>

                    {/* TOTAL */}

                    <div
                        className="
                        border-t
                        mt-7
                        pt-7
                        flex
                        items-center
                        justify-between
                        "
                    >

                        <h1
                            className="
                            text-3xl
                            font-black
                            text-[#002366]
                            "
                        >

                            Total

                        </h1>

                        <h1
                            className="
                            text-4xl
                            font-black
                            text-[#FF8C00]
                            "
                        >

                            Rp{" "}

                            {totalHarga.toLocaleString(
                                "id-ID"
                            )}

                        </h1>

                    </div>

                    {/* BUTTON */}

                    <button
                        onClick={
                            handleKonfirmasiPesanan
                        }
                        disabled={loading}
                        className="
                        w-full
                        h-[65px]
                        rounded-2xl
                        bg-[#FF8C00]
                        text-white
                        font-black
                        text-xl
                        mt-8
                        "
                    >

                        {loading
                            ? "Loading..."
                            : "Konfirmasi Pesanan"}

                    </button>

                </div>

            </div>

            {/* =====================================================
               POPUP PILIH MEJA
            ===================================================== */}

            {showPopupMeja && (

                <div
                    className="
                    fixed
                    inset-0
                    z-50
                    bg-black/50
                    flex
                    items-center
                    justify-center
                    p-4
                    "
                >

                    <div
                        className="
                        bg-white
                        w-full
                        max-w-[700px]
                        rounded-[35px]
                        p-6
                        "
                    >

                        {/* HEADER */}

                        <div
                            className="
                            flex
                            items-center
                            justify-between
                            mb-8
                            "
                        >

                            <h1
                                className="
                                text-3xl
                                font-black
                                text-[#002366]
                                "
                            >

                                Pilih Meja

                            </h1>

                            <button
                                onClick={() =>
                                    setShowPopupMeja(
                                        false
                                    )
                                }
                                className="
                                w-[45px]
                                h-[45px]
                                rounded-xl
                                bg-red-500
                                text-white
                                text-2xl
                                font-black
                                "
                            >

                                ×

                            </button>

                        </div>

                        {/* GRID */}

                        <div
                            className="
                            grid
                            grid-cols-2
                            md:grid-cols-5
                            gap-4
                            "
                        >

                            {currentMeja.map(
                                (
                                    nomor
                                ) => {

                                    const dipakai =
                                        mejaDipakai.includes(
                                            nomor
                                        );

                                    const selected =
                                        selectedMeja ===
                                        nomor;

                                    return (

                                        <button
                                            key={
                                                nomor
                                            }
                                            onClick={() =>
                                                pilihMeja(
                                                    nomor
                                                )
                                            }
                                            disabled={
                                                dipakai
                                            }
                                            className={`
                                            h-[80px]
                                            rounded-2xl
                                            font-black
                                            text-xl

                                            ${
                                                selected

                                                    ? "bg-[#FF8C00] text-white"

                                                    : dipakai

                                                    ? "bg-gray-300 text-white cursor-not-allowed"

                                                    : "bg-gray-600 text-white"
                                            }
                                            `}
                                        >

                                            {
                                                nomor
                                            }

                                        </button>

                                    );

                                }
                            )}

                        </div>

                        {/* PAGINATION */}

                        <div
                            className="
                            flex
                            items-center
                            justify-between
                            mt-8
                            "
                        >

                            {/* PREVIOUS */}

                            <button
                                disabled={
                                    currentPage ===
                                    1
                                }
                                onClick={() =>
                                    setCurrentPage(
                                        (
                                            prev
                                        ) =>
                                            prev -
                                            1
                                    )
                                }
                                className="
                                px-6
                                h-[50px]
                                rounded-2xl
                                bg-gray-200
                                font-bold
                                disabled:opacity-40
                                "
                            >

                                Previous

                            </button>

                            {/* INFO */}

                            <p
                                className="
                                font-black
                                text-[#002366]
                                "
                            >

                                {
                                    currentMeja[0]
                                }{" "}
                                -{" "}
                                {
                                    currentMeja[
                                        currentMeja.length -
                                            1
                                    ]
                                }

                            </p>

                            {/* NEXT */}

                            <button
                                disabled={
                                    currentPage ===
                                    10
                                }
                                onClick={() =>
                                    setCurrentPage(
                                        (
                                            prev
                                        ) =>
                                            prev +
                                            1
                                    )
                                }
                                className="
                                px-6
                                h-[50px]
                                rounded-2xl
                                bg-[#FF8C00]
                                text-white
                                font-bold
                                disabled:opacity-40
                                "
                            >

                                Next

                            </button>

                        </div>

                        {/* BUTTON */}

                        <button
                            onClick={() =>
                                setShowPopupMeja(
                                    false
                                )
                            }
                            className="
                            w-full
                            h-[60px]
                            rounded-2xl
                            bg-[#002366]
                            text-white
                            font-black
                            text-lg
                            mt-8
                            "
                        >

                            Gunakan Meja{" "}

                            {
                                selectedMeja
                            }

                        </button>

                    </div>

                </div>

            )}

        </div>

    );

};

export default KonfirmasiPesananPembeli;