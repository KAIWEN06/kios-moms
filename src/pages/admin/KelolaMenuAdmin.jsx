import React, {
  useState
} from 'react';

import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const KelolaMenuAdmin = ({
  menu,
  fetchMenu,
  updateStokMenu
}) => {

  // FORM
  const [form, setForm] = useState({
    nama: '',
    harga: '',
    desc: ''
  });

  // FILE
  const [file, setFile] = useState(null);

  // LOADING
  const [loading, setLoading] = useState(false);

  // TAB
  const [activeTab, setActiveTab] =
    useState('aktif');

  // PAGINATION
  const [currentPage, setCurrentPage] =
    useState(1);

  // EDIT
  const [editingId, setEditingId] =
    useState(null);

  // DELETE
  const [deleteMenu, setDeleteMenu] =
    useState(null);

  // HANDLE FILE
  const handleFileChange = (e) => {

    const selectedFile =
      e.target.files[0];

    if (selectedFile) {
      setFile(selectedFile);
    }

  };

  // SAVE EDIT
  const saveEdit = async (menuId) => {

    const nama =
      document.getElementById(
        `nama-${menuId}`
      ).value;

    const harga =
      document.getElementById(
        `harga-${menuId}`
      ).value;

    const desc =
      document.getElementById(
        `desc-${menuId}`
      ).value;

    // VALIDASI
    if (Number(harga) <= 0) {

      toast.error(
        'Harga tidak boleh 0 atau minus!'
      );

      return;

    }

    try {

      const { error } =
        await supabase
          .from('menu')
          .update({
            nama,
            harga,
            deskripsi: desc
          })
          .eq('id', menuId);

      if (error) throw error;

      toast.success(
        'Menu berhasil diupdate!',
        {
          style: {
            borderRadius: '18px',
            padding: '16px',
            fontWeight: '700'
          }
        }
      );

      setEditingId(null);

      if (fetchMenu) {
        await fetchMenu();
      }

    } catch (error) {

      toast.error(
        'Gagal update menu'
      );

    }

  };

  // HAPUS MENU
  const hapusMenu = async (id) => {

    try {

      const { error } =
        await supabase
          .from('menu')
          .delete()
          .eq('id', id);

      if (error) throw error;

      toast.success(
        'Menu berhasil dihapus!',
        {
          style: {
            borderRadius: '18px',
            padding: '16px',
            fontWeight: '700'
          }
        }
      );

      setDeleteMenu(null);

      if (fetchMenu) {
        await fetchMenu();
      }

    } catch (error) {

      toast.error(
        'Gagal menghapus menu'
      );

    }

  };

  // UPLOAD MENU
  const handleUpload = async () => {

    // VALIDASI
    if (
      !form.nama ||
      !form.harga ||
      !file
    ) {

      toast.error(
        'Lengkapi data menu!'
      );

      return;

    }

    // VALIDASI HARGA
    if (
      Number(form.harga) <= 0
    ) {

      toast.error(
        'Harga tidak boleh 0 atau minus!'
      );

      return;

    }

    setLoading(true);

    try {

      // FILE NAME
      const fileName =
        `${Date.now()}_${file.name}`;

      // UPLOAD
      const { error: uploadError } =
        await supabase
          .storage
          .from('menu-images')
          .upload(fileName, file);

      if (uploadError)
        throw uploadError;

      // URL
      const { data: urlData } =
        supabase.storage
          .from('menu-images')
          .getPublicUrl(fileName);

      // INSERT
      const { error } =
        await supabase
          .from('menu')
          .insert([
            {
              nama: form.nama,
              harga: parseInt(
                form.harga
              ),
              deskripsi: form.desc,
              stok: 'ada',
              status: 'aktif',
              img: urlData.publicUrl
            }
          ]);

      if (error) throw error;

      toast.success(
        'Menu berhasil ditambahkan!',
        {
          style: {
            borderRadius: '18px',
            padding: '16px',
            fontWeight: '700'
          }
        }
      );

      // RESET
      setForm({
        nama: '',
        harga: '',
        desc: ''
      });

      setFile(null);

      // RESET FILE
      const fileInput =
        document.getElementById(
          'upload-file'
        );

      if (fileInput) {
        fileInput.value = '';
      }

      // REFRESH
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

  // FILTER
  const filteredMenu =
    menu.filter((m) =>
      activeTab === 'aktif'
        ? m.stok !== 'nonaktif'
        : m.stok === 'nonaktif'
    );

  // PAGINATION
  const itemPerPage = 8;

  const totalPage =
    Math.ceil(
      filteredMenu.length /
      itemPerPage
    );

  const startIndex =
    (currentPage - 1) *
    itemPerPage;

  const visibleMenu =
    filteredMenu.slice(
      startIndex,
      startIndex + itemPerPage
    );

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
              id="upload-file"
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

      {/* TAB */}
      <div className="flex gap-4 mb-8">

        <button
          onClick={() => {
            setActiveTab('aktif');
            setCurrentPage(1);
          }}
          className={`px-6 py-3 rounded-2xl font-black transition-all ${
            activeTab === 'aktif'
              ? 'bg-[#002366] text-white'
              : 'bg-white text-gray-500'
          }`}
        >

          Menu Aktif

        </button>

        <button
          onClick={() => {
            setActiveTab('nonaktif');
            setCurrentPage(1);
          }}
          className={`px-6 py-3 rounded-2xl font-black transition-all ${
            activeTab === 'nonaktif'
              ? 'bg-red-500 text-white'
              : 'bg-white text-gray-500'
          }`}
        >

          Menu Nonaktif

        </button>

      </div>

      {/* MENU */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

        {visibleMenu.map((m) => (

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

                Rp {Number(
                  m.harga
                ).toLocaleString()}

              </p>

              {/* STATUS */}
              <div className="mb-3">

                {m.stok === 'kosong' && (

                  <span className="bg-red-100 text-red-500 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wide">

                    Tidak Tersedia

                  </span>

                )}

                {m.stok === 'nonaktif' && (

                  <span className="bg-gray-200 text-gray-500 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wide">

                    Nonaktif

                  </span>

                )}

              </div>

            </div>

            {/* STATUS */}
            <select
              className="w-full p-2 bg-gray-50 border rounded-lg text-xs font-bold outline-none cursor-pointer hover:border-[#FF8C00] transition-colors"
              value={m.stok || 'ada'}
              onChange={async (e) => {

                const newStatus =
                  e.target.value;

                // UPDATE STATUS
                await updateStokMenu(
                  m.id,
                  newStatus
                );

                // REFRESH
                if (fetchMenu) {
                  await fetchMenu();
                }

                // PINDAH OTOMATIS
                if (
                  newStatus ===
                  'nonaktif'
                ) {

                  toast.success(
                    'Menu dipindahkan ke nonaktif',
                    {
                      style: {
                        borderRadius: '18px',
                        padding: '16px',
                        fontWeight: '700'
                      }
                    }
                  );

                  setActiveTab(
                    'nonaktif'
                  );

                  setCurrentPage(1);

                }

                // KEMBALI AKTIF
                if (
                  newStatus === 'ada'
                ) {

                  toast.success(
                    'Menu diaktifkan kembali',
                    {
                      style: {
                        borderRadius: '18px',
                        padding: '16px',
                        fontWeight: '700'
                      }
                    }
                  );

                  setActiveTab(
                    'aktif'
                  );

                  setCurrentPage(1);

                }

              }}
            >

              <option value="ada">

                Tersedia

              </option>

              <option value="kosong">

                Tidak Tersedia

              </option>

              <option value="nonaktif">

                Nonaktif

              </option>

            </select>

            {/* ACTION */}
            <div className="flex gap-2 mt-3">

              <button
                onClick={() =>
                  setEditingId(m.id)
                }
                className="flex-1 bg-[#002366] text-white py-2 rounded-xl text-xs font-black"
              >

                Edit

              </button>

              {activeTab ===
                'nonaktif' && (

                <button
                  onClick={() =>
                    setDeleteMenu(m)
                  }
                  className="flex-1 bg-red-500 text-white py-2 rounded-xl text-xs font-black"
                >

                  Hapus

                </button>

              )}

            </div>

          </div>

        ))}

      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-center gap-4 mt-10">

        <button
          disabled={currentPage === 1}
          onClick={() =>
            setCurrentPage(
              currentPage - 1
            )
          }
          className={`px-5 py-3 rounded-2xl font-bold ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-300'
              : 'bg-[#002366] text-white'
          }`}
        >

          Prev

        </button>

        <div className="font-black text-[#002366]">

          {currentPage} / {totalPage}

        </div>

        <button
          disabled={
            currentPage === totalPage
          }
          onClick={() =>
            setCurrentPage(
              currentPage + 1
            )
          }
          className={`px-5 py-3 rounded-2xl font-bold ${
            currentPage === totalPage
              ? 'bg-gray-100 text-gray-300'
              : 'bg-[#FF8C00] text-white'
          }`}
        >

          Next

        </button>

      </div>

      {/* POPUP EDIT */}
      {editingId && (

        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-lg rounded-[35px] p-8">

            {menu
              .filter(
                (x) =>
                  x.id === editingId
              )
              .map((m) => (

                <div key={m.id}>

                  <h2 className="text-2xl font-black text-[#002366] mb-6">

                    Edit Menu

                  </h2>

                  <div className="space-y-4">

                    <input
                      id={`nama-${m.id}`}
                      defaultValue={m.nama}
                      className="w-full p-4 rounded-2xl border"
                    />

                    <input
                      id={`harga-${m.id}`}
                      type="number"
                      defaultValue={m.harga}
                      className="w-full p-4 rounded-2xl border"
                    />

                    <textarea
                      id={`desc-${m.id}`}
                      defaultValue={
                        m.deskripsi
                      }
                      className="w-full p-4 rounded-2xl border h-28"
                    />

                  </div>

                  <div className="flex gap-4 mt-6">

                    <button
                      onClick={() =>
                        saveEdit(m.id)
                      }
                      className="flex-1 bg-[#002366] text-white py-4 rounded-2xl font-black"
                    >

                      Simpan

                    </button>

                    <button
                      onClick={() =>
                        setEditingId(null)
                      }
                      className="flex-1 bg-gray-100 py-4 rounded-2xl font-black"
                    >

                      Batal

                    </button>

                  </div>

                </div>

              ))}

          </div>

        </div>

      )}

      {/* DELETE POPUP */}
      {deleteMenu && (

        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-md rounded-[35px] p-8 text-center">

            <h2 className="text-2xl font-black text-red-500 mb-4">

              Konfirmasi Hapus

            </h2>

            <p className="text-gray-500 mb-8">

              Pastikan menu belum pernah di pesan.

            </p>

            <div className="flex gap-4">

              <button
                onClick={() =>
                  hapusMenu(
                    deleteMenu.id
                  )
                }
                className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black"
              >

                Hapus

              </button>

              <button
                onClick={() =>
                  setDeleteMenu(null)
                }
                className="flex-1 bg-gray-100 py-4 rounded-2xl font-black"
              >

                Batal

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};

export default KelolaMenuAdmin;