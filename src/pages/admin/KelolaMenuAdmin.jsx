import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const KelolaMenuAdmin = ({
  menu,
  fetchMenu,
  updateStokMenu
}) => {

  const [form, setForm] = useState({
    nama: '',
    harga: '',
    desc: ''
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // HANDLE FILE
  const handleFileChange = (e) => {

    const selectedFile = e.target.files[0];

    if (selectedFile) {
      setFile(selectedFile);
    }

  };

  // UPLOAD MENU
  const handleUpload = async () => {

    if (!form.nama || !form.harga || !file) {

      toast.error(
        'Lengkapi data menu!'
      );

      return;

    }

    setLoading(true);

    try {

      // NAMA FILE
      const fileName = `${Date.now()}_${file.name}`;

      // UPLOAD STORAGE
      const { error: uploadError } = await supabase
        .storage
        .from('menu-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // URL GAMBAR
      const { data: urlData } = supabase
        .storage
        .from('menu-images')
        .getPublicUrl(fileName);

      // INSERT MENU
      const { error } = await supabase
        .from('menu')
        .insert([
          {
            nama: form.nama,
            harga: parseInt(form.harga),
            stok: 'ada',
            img: urlData.publicUrl
          }
        ]);

      if (error) throw error;

      toast.success(
        'Menu berhasil ditambahkan!'
      );

      // RESET FORM
      setForm({
        nama: '',
        harga: '',
        desc: ''
      });

      setFile(null);

      // REFRESH MENU
      if (fetchMenu) {
        await fetchMenu();
      }

    } catch (error) {

      console.error(error);

      toast.error(
        error.message
      );

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="p-4 md:p-10 bg-[#f0f2f5] min-h-screen">

      {/* TITLE */}
      <h2 className="text-3xl font-black text-[#002366] mb-8">

        Manajemen <span className="text-[#FF8C00]">Produk & Stok</span>

      </h2>

      {/* FORM */}
      <div className="bg-white p-8 rounded-[35px] shadow-sm mb-12 max-w-4xl mx-auto">

        <h3 className="font-bold text-lg mb-6 border-b pb-2">

          Tambah Menu Baru

        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* NAMA */}
          <input
            type="text"
            value={form.nama}
            onChange={(e) =>
              setForm({
                ...form,
                nama: e.target.value
              })
            }
            className="w-full p-3 bg-gray-50 border rounded-xl"
            placeholder="Nama Menu"
          />

          {/* HARGA */}
          <input
            type="number"
            value={form.harga}
            onChange={(e) =>
              setForm({
                ...form,
                harga: e.target.value
              })
            }
            className="w-full p-3 bg-gray-50 border rounded-xl"
            placeholder="Harga Rp"
          />

          {/* DESC */}
          <textarea
            value={form.desc}
            onChange={(e) =>
              setForm({
                ...form,
                desc: e.target.value
              })
            }
            className="md:col-span-2 w-full p-3 bg-gray-50 border rounded-xl h-24"
            placeholder="Deskripsi..."
          />

          {/* FILE */}
          <div className="md:col-span-2">

            <input
              type="file"
              onChange={handleFileChange}
              className="w-full p-3 border-2 border-dashed rounded-xl text-xs"
            />

          </div>

        </div>

        {/* BUTTON */}
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full mt-6 bg-[#002366] text-white py-4 rounded-2xl font-black uppercase hover:bg-blue-900 transition-all"
        >

          {loading
            ? 'Memproses...'
            : 'Simpan Menu'}

        </button>

      </div>

      {/* DAFTAR MENU */}
      <h3 className="font-bold text-xl mb-6">

        Daftar Katalog & Status Stok

      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

        {menu && menu.map((m) => (

          <div
            key={m.id}
            className={`bg-white p-4 rounded-3xl shadow-sm border flex flex-col justify-between transition-all ${
              m.stok === 'kosong'
                ? 'opacity-70'
                : ''
            }`}
          >

            <div>

              {/* IMAGE */}
              <img
                src={m.img}
                alt={m.nama}
                className={`w-full h-32 object-cover rounded-2xl mb-3 ${
                  m.stok === 'kosong'
                    ? 'grayscale'
                    : ''
                }`}
              />

              {/* NAMA */}
              <h4 className="font-bold text-sm truncate">

                {m.nama}

              </h4>

              {/* HARGA */}
              <p className="text-[#FF8C00] font-black text-xs mb-3">

                Rp {Number(m.harga).toLocaleString()}

              </p>

              {/* STATUS BADGE */}
              {m.stok === 'kosong' && (

                <div className="mb-3">

                  <span className="bg-red-100 text-red-500 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wide">

                    Tidak Tersedia

                  </span>

                </div>

              )}

            </div>

            {/* DROPDOWN */}
            <select
              className="w-full p-2 bg-gray-50 border rounded-lg text-xs font-bold outline-none cursor-pointer hover:border-[#FF8C00] transition-colors"
              value={m.stok || 'ada'}
              onChange={async (e) => {

                const newStatus = e.target.value;

                console.log(
                  'UBAH STOK:',
                  m.id,
                  newStatus
                );

                await updateStokMenu(
                  m.id,
                  newStatus
                );

                // REFRESH MENU
                if (fetchMenu) {
                  await fetchMenu();
                }

              }}
            >

              <option value="ada">

                Tersedia

              </option>

              <option value="kosong">

                Tidak Tersedia

              </option>

            </select>

          </div>

        ))}

      </div>

    </div>

  );

};

export default KelolaMenuAdmin;