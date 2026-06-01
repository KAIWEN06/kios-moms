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
    harga: ''
  });

  // FILE
  const [file, setFile] = useState(null);

  // LOADING
  const [loading, setLoading] =
    useState(false);

  // TAB
  const [activeTab, setActiveTab] =
    useState('aktif');

  // PAGE
  const [currentPage, setCurrentPage] =
    useState(1);

  // EDIT
  const [editingId, setEditingId] =
    useState(null);

  // DELETE
  const [deleteMenu, setDeleteMenu] =
    useState(null);

  const [selectedFile, setSelectedFile] = useState(null);

  // FILE CHANGE
  const handleFileChange = (e) => {

    const selectedFile =
      e.target.files[0];

    if (selectedFile) {

      setFile(selectedFile);

    }

  };

  // =========================
  // TAMBAH MENU
  // =========================

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
      const {
        error: uploadError
      } = await supabase
        .storage
        .from('menu-images')
        .upload(fileName, file);

      if (uploadError)
        throw uploadError;

      // URL
      const {
        data: urlData
      } = supabase
        .storage
        .from('menu-images')
        .getPublicUrl(fileName);

      // INSERT
      const { error } =
        await supabase
          .from('menu')
          .insert([
            {
              nama: form.nama,
              harga: Number(
                form.harga
              ),
              stok: 'ada',
              img:
                urlData.publicUrl
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

      // FIX: PROSES RESET TOTAL SETELAH INPUT BERHASIL
      setForm({
        nama: '',
        harga: ''
      });
      setFile(null);
      setSelectedFile(null);

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

  // =========================
  // EDIT MENU
  // =========================

  const saveEdit = async (
    menuId
  ) => {

    try {

      const namaInput =
        document.getElementById(
          `nama-${menuId}`
        );

      const hargaInput =
        document.getElementById(
          `harga-${menuId}`
        );

      if (
        !namaInput ||
        !hargaInput
      ) {

        toast.error(
          'Input tidak ditemukan'
        );

        return;

      }

      const nama =
        namaInput.value;

      const harga =
        hargaInput.value;

      // VALIDASI
      if (
        !nama ||
        !harga
      ) {

        toast.error(
          'Lengkapi data!'
        );

        return;

      }

      if (
        Number(harga) <= 0
      ) {

        toast.error(
          'Harga tidak boleh 0 atau minus!'
        );

        return;

      }

      // UPDATE
      const { error } =
        await supabase
          .from('menu')
          .update({
            nama: nama,
            harga: Number(
              harga
            )
          })
          .eq('id', menuId);

      if (error) {

        console.error(error);

        toast.error(
          error.message
        );

        return;

      }

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

      // CLOSE POPUP
      setEditingId(null);

      // REFRESH
      if (fetchMenu) {

        await fetchMenu();

      }

    } catch (error) {

      console.error(error);

      toast.error(
        'Gagal update menu'
      );

    }

  };

  // =========================
  // HAPUS MENU
  // =========================

  const hapusMenu = async (
    id
  ) => {

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

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFile(null);

    const fileInput =
      document.getElementById("upload-file");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // =========================
  // FILTER MENU
  // =========================

  const filteredMenu =
  menu.filter((m) =>

    activeTab === 'aktif'

      ? m.stok !== 'nonaktif'

      : m.stok === 'nonaktif'

  );

  // =========================
  // PAGINATION
  // =========================

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
                nama:
                  e.target.value
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
                harga:
                  e.target.value
              })
            }
            className="w-full p-3 bg-gray-50 border rounded-xl"
            placeholder="Harga Rp"
          />

          {/* FILE */}
          <div className="md:col-span-2">

            <input
              id="upload-file"
              type="file"
              onChange={(e) => {
                const fileObj = e.target.files?.[0];

                if (!fileObj) return;

                setSelectedFile(fileObj);

                handleFileChange(e);
              }}
              className="hidden"
            />

            <div className="border-2 border-dashed rounded-xl p-3">

              <div className="flex items-center justify-between gap-2">

                <span className="text-sm truncate">
                  {selectedFile
                    ? selectedFile.name
                    : "Belum ada foto dipilih"}
                </span>

                <div className="flex gap-2">

                  <label
                    htmlFor="upload-file"
                    className="px-3 py-2 bg-[#002366] text-white rounded-lg text-xs cursor-pointer"
                  >
                    Pilih File
                  </label>

                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg text-xs"
                    >
                      Hapus
                    </button>
                  )}

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* BUTTON */}
        <button
          onClick={
            handleUpload
          }
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

            setActiveTab(
              'aktif'
            );

            setCurrentPage(1);

          }}
          className={`px-6 py-3 rounded-2xl font-black transition-all ${
            activeTab ===
            'aktif'
              ? 'bg-[#002366] text-white'
              : 'bg-white text-gray-500'
          }`}
        >

          Menu Aktif

        </button>

        <button
          onClick={() => {

            setActiveTab(
              'nonaktif'
            );

            setCurrentPage(1);

          }}
          className={`px-6 py-3 rounded-2xl font-black transition-all ${
            activeTab ===
            'nonaktif'
              ? 'bg-red-500 text-white'
              : 'bg-white text-gray-500'
          }`}
        >

          Menu Nonaktif

        </button>

      </div>

      {/* MENU */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

        {filteredMenu.length === 0 ? (
          <div className="col-span-2 md:col-span-4 text-center py-10 text-gray-400 font-bold">
            Tidak ada menu dalam kategori ini.
          </div>
        ) : (
          visibleMenu.map((m) => (
            <div
              key={m.id}
              className={`bg-white p-4 rounded-3xl shadow-sm border flex flex-col justify-between transition-all ${
                m.stok ===
                'kosong'
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
                    m.stok ===
                    'kosong'
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

              </div>

              {/* STATUS */}
              {activeTab === 'aktif' ? (

                <select
                  className="w-full p-2 bg-gray-50 border rounded-lg text-xs font-bold outline-none cursor-pointer hover:border-[#FF8C00] transition-colors"
                  value={
                    m.stok ===
                    'kosong'
                      ? 'kosong'
                      : 'ada'
                  }
                  onChange={async (
                    e
                  ) => {

                    const newStatus =
                      e.target.value;

                    await updateStokMenu(
                      m.id,
                      newStatus
                    );

                    if (
                      fetchMenu
                    ) {

                      await fetchMenu();

                    }

                    toast.success(
                      'Status menu berhasil diperbarui!',
                      {
                        style: {
                          borderRadius: '18px',
                          padding: '16px',
                          fontWeight: '700'
                        }
                      }
                    );

                  }}
                >

                  <option value="ada">

                    Tersedia

                  </option>

                  <option value="kosong">

                    Tidak Tersedia

                  </option>

                </select>

              ) : (

                <div className="w-full bg-gray-200 text-gray-500 text-center py-3 rounded-xl text-xs font-black uppercase tracking-wide">

                  Menu Dinonaktifkan

                </div>

              )}

              {/* ACTION */}
              <div className="flex flex-col gap-2 mt-3">

                {/* EDIT */}
                <button
                  onClick={() =>
                    setEditingId(
                      m.id
                    )
                  }
                  className="w-full bg-[#002366] text-white py-2 rounded-xl text-xs font-black hover:bg-blue-900 transition-all"
                >

                  Edit

                </button>

                {/* NONAKTIF */}
                {activeTab ===
                'nonaktif' ? (

                  <div className="flex gap-2">

                    {/* AKTIFKAN */}
                    <button
                      onClick={async () => {

                        await updateStokMenu(
                          m.id,
                          'ada'
                        );

                        toast.success(
                          'Menu berhasil diaktifkan!'
                        );

                        if (
                          fetchMenu
                        ) {

                          await fetchMenu();

                        }

                        setActiveTab(
                          'aktif'
                        );

                      }}
                      className="flex-1 bg-green-500 text-white py-2 rounded-xl text-xs font-black"
                    >

                      Aktifkan

                    </button>

                    {/* HAPUS */}
                    <button
                      onClick={() =>
                        setDeleteMenu(
                          m
                        )
                      }
                      className="flex-1 bg-red-500 text-white py-2 rounded-xl text-xs font-black"
                    >

                      Hapus

                    </button>

                  </div>

                ) : (

                  <button
                    onClick={async () => {

                      await updateStokMenu(
                        m.id,
                        'nonaktif'
                      );

                      toast.success(
                        'Menu dipindahkan ke nonaktif'
                      );

                      if (
                        fetchMenu
                      ) {

                        await fetchMenu();

                      }

                      setActiveTab(
                        'nonaktif'
                      );

                    }}
                    className="w-full bg-gray-500 text-white py-2 rounded-xl text-xs font-black"
                  >

                    Nonaktifkan

                  </button>

                )}

              </div>

            </div>

          ))
        )}

      </div>

      {/* PAGINATION */}
      {totalPage > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">

          <button
            disabled={
              currentPage === 1
            }
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

            {currentPage} /{' '}
            {totalPage}

          </div>

          <button
            disabled={
              currentPage ===
              totalPage
            }
            onClick={() =>
              setCurrentPage(
                currentPage + 1
              )
            }
            className={`px-5 py-3 rounded-2xl font-bold ${
              currentPage ===
              totalPage
                ? 'bg-gray-100 text-gray-300'
                : 'bg-[#FF8C00] text-white'
            }`}
          >

            Next

          </button>

        </div>
      )}

      {/* EDIT POPUP */}
      {editingId && (

        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-lg rounded-[35px] p-8">

            {menu
              .filter(
                (x) =>
                  x.id ===
                  editingId
              )
              .map((m) => (

                <div
                  key={m.id}
                >

                  <h2 className="text-2xl font-black text-[#002366] mb-6">

                    Edit Menu

                  </h2>

                  {/* INPUT */}
                  <div className="space-y-4">

                    {/* NAMA */}
                    <input
                      id={`nama-${m.id}`}
                      defaultValue={
                        m.nama
                      }
                      className="w-full p-4 rounded-2xl border"
                    />

                    {/* HARGA */}
                    <input
                      id={`harga-${m.id}`}
                      type="number"
                      defaultValue={
                        m.harga
                      }
                      className="w-full p-4 rounded-2xl border"
                    />

                  </div>

                  {/* BUTTON */}
                  <div className="flex gap-4 mt-6">

                    <button
                      onClick={() =>
                        saveEdit(
                          m.id
                        )
                      }
                      className="flex-1 bg-[#002366] text-white py-4 rounded-2xl font-black"
                    >

                      Simpan

                    </button>

                    <button
                      onClick={() =>
                        setEditingId(
                          null
                        )
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

      {/* DELETE */}
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
                  setDeleteMenu(
                    null
                  )
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