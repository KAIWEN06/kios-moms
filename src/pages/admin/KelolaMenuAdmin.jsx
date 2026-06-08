import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const KelolaMenuAdmin = ({ menu, fetchMenu, updateStokMenu }) => {
  // FORM TAMBAH (Abaikan harga lama)
  const [form, setForm] = useState({
    nama: '',
    harga_biasa: '',
    harga_extra: ''
  });

  // FORM EDIT (Abaikan harga lama)
  const [editForm, setEditForm] = useState({
    nama: '',
    harga_biasa: '',
    harga_extra: ''
  });

  // FILE, LOADING, TAB, PAGE, EDIT/DELETE ID
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('aktif');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [deleteMenu, setDeleteMenu] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // STATE UNTUK MENAMPUNG DATA PENJUALAN BERDASARKAN NAMA MENU (SINKRON BERANDA)
  const [salesByMenuName, setSalesByMenuName] = useState({});

  // FUNGSI FETCH DATA PENJUALAN SINKRON BERANDA ADMIN
  const fetchSalesDataWithBerandaLogic = async () => {
    try {
      const sekarang = new Date();
      const awalBulan = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1).toISOString();
      const akhirBulan = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 1).toISOString();

      const { data, error } = await supabase
        .from("pesanan")
        .select("*")
        .eq("status", "selesai")
        .gte("created_at", awalBulan)
        .lt("created_at", akhirBulan);

      if (error) throw error;

      let countMenu = {};
      data.forEach((pesanan) => {
        let items = Array.isArray(pesanan.items) ? pesanan.items : JSON.parse(pesanan.items || "[]");
        items.forEach((item) => {
          if (countMenu[item.nama]) {
            countMenu[item.nama] += Number(item.qty);
          } else {
            countMenu[item.nama] = Number(item.qty);
          }
        });
      });

      setSalesByMenuName(countMenu);
    } catch (error) {
      console.log("Error mengambil data penjualan terlaris:", error);
    }
  };

  useEffect(() => {
    fetchSalesDataWithBerandaLogic();

    const channel = supabase
      .channel("menu-terlaris-kelola-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "pesanan" }, async () => {
        await fetchSalesDataWithBerandaLogic();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [menu]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleStartEdit = (m) => {
    setEditingId(m.id);
    setEditForm({
      nama: m.nama,
      harga_biasa: m.harga_biasa || '',
      harga_extra: m.harga_extra || ''
    });
  };

  // =========================
  // TAMBAH MENU
  // =========================
  const handleUpload = async () => {
    if (!form.nama || !form.harga_biasa || !file) {
      toast.error('Lengkapi data menu wajib!');
      return;
    }

    const isDuplicate = menu && menu.some(
      (m) => m.nama.trim().toLowerCase() === form.nama.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`Menu dengan nama "${form.nama}" sudah ada!`);
      return;
    }

    const hargaBiasa = Number(form.harga_biasa);
    
    if (hargaBiasa <= 0) {
      toast.error('Harga biasa tidak boleh 0 atau minus!');
      return;
    }

    // VALIDASI HARGA EXTRA (PROTEKSI NILAI 0 / MINUS)
    let hargaExtra = null;
    if (form.harga_extra !== '') {
      hargaExtra = Number(form.harga_extra);
      if (hargaExtra <= 0) {
        toast.error('Harga extra tidak boleh 0 atau bernilai minus!');
        return;
      }
      if (hargaExtra <= hargaBiasa) {
        toast.error('Harga extra harus lebih besar dari harga biasa!');
        return;
      }
    }

    setLoading(true);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('menu-images').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(fileName);

      const { error } = await supabase.from('menu').insert([
        {
          nama: form.nama.trim(),
          harga_biasa: hargaBiasa,
          harga_extra: hargaExtra,
          stok: 'ada',
          img: urlData.publicUrl
        }
      ]);

      if (error) throw error;

      toast.success('Menu berhasil ditambahkan!', { style: { borderRadius: '18px', padding: '16px', fontWeight: '700' } });
      setForm({ nama: '', harga_biasa: '', harga_extra: '' });
      setFile(null);
      setSelectedFile(null);

      const fileInput = document.getElementById('upload-file');
      if (fileInput) fileInput.value = '';

      if (fetchMenu) await fetchMenu();
      setCurrentPage(1); 
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SAVE EDIT MENU
  // =========================
  const saveEdit = async (menuId) => {
    if (!editForm.nama || !editForm.harga_biasa) {
      toast.error('Lengkapi data menu wajib!');
      return;
    }

    const isDuplicate = menu && menu.some(
      (m) => m.id !== menuId && m.nama.trim().toLowerCase() === editForm.nama.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`Menu dengan nama "${editForm.nama}" sudah ada!`);
      return;
    }

    const hargaBiasa = Number(editForm.harga_biasa);

    if (hargaBiasa <= 0) {
      toast.error('Harga biasa tidak boleh 0 atau minus!');
      return;
    }

    // VALIDASI HARGA EXTRA EDIT (PROTEKSI NILAI 0 / MINUS)
    let hargaExtra = null;
    if (editForm.harga_extra !== '' && editForm.harga_extra !== null) {
      hargaExtra = Number(editForm.harga_extra);
      if (hargaExtra <= 0) {
        toast.error('Harga extra tidak boleh 0 atau bernilai minus!');
        return;
      }
      if (hargaExtra <= hargaBiasa) {
        toast.error('Harga extra harus lebih besar dari harga biasa!');
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('menu')
        .update({
          nama: editForm.nama.trim(),
          harga_biasa: hargaBiasa,
          harga_extra: hargaExtra
        })
        .eq('id', menuId);

      if (error) throw error;

      toast.success('Menu berhasil diupdate!', { style: { borderRadius: '18px', padding: '16px', fontWeight: '700' } });
      setEditingId(null);
      if (fetchMenu) await fetchMenu();
    } catch (error) {
      console.error(error);
      toast.error('Gagal update menu');
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // HAPUS MENU
  // =========================
  const hapusMenu = async (id) => {
    try {
      const { error } = await supabase.from('menu').delete().eq('id', id);
      if (error) throw error;

      toast.success('Menu berhasil dihapus!', { style: { borderRadius: '18px', padding: '16px', fontWeight: '700' } });
      setDeleteMenu(null);
      if (fetchMenu) await fetchMenu();
      setCurrentPage(1);
    } catch (error) {
      toast.error('Gagal menghapus menu');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFile(null);
    const fileInput = document.getElementById("upload-file");
    if (fileInput) fileInput.value = "";
  };

  // SORTING & FILTERING
  const filteredMenu = menu 
    ? menu
        .filter((m) => (activeTab === 'aktif' ? m.stok !== 'nonaktif' : m.stok === 'nonaktif'))
        .sort((a, b) => {
          const isAKosong = a.stok === 'kosong';
          const isBKosong = b.stok === 'kosong';
          if (isAKosong !== isBKosong) return isAKosong ? 1 : -1;

          const terjualB = salesByMenuName[b.nama] || 0;
          const terjualA = salesByMenuName[a.nama] || 0;
          return terjualB - terjualA;
        })
    : [];

  // PAGINATION
  const itemPerPage = 8;
  const totalPage = Math.ceil(filteredMenu.length / itemPerPage);
  const startIndex = (currentPage - 1) * itemPerPage;
  const visibleMenu = filteredMenu.slice(startIndex, startIndex + itemPerPage);

  return (
    <div className="p-3 sm:p-6 md:p-10 bg-[#f0f2f5] min-h-screen">
      {/* TITLE */}
      <h2 className="text-2xl sm:text-3xl font-black text-[#002366] mb-6 md:mb-8 text-center sm:text-left">
        Manajemen <span className="text-[#FF8C00]">Produk & Stok</span>
      </h2>

      {/* FORM TAMBAH MENU */}
      <div className="bg-white p-5 md:p-8 rounded-[25px] sm:rounded-[35px] shadow-sm mb-8 md:mb-12 max-w-4xl mx-auto">
        <h3 className="font-bold text-base sm:text-lg mb-4 md:mb-6 border-b pb-2">Tambah Menu Baru</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700">Nama Menu <span className="text-red-500 ml-1">*</span></label>
            <input
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full p-3 bg-gray-50 border rounded-xl text-sm"
              placeholder="Contoh: Ayam Geprek"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700">Harga Biasa <span className="text-red-500 ml-1">*</span></label>
            <input
              type="number"
              value={form.harga_biasa}
              onChange={(e) => setForm({ ...form, harga_biasa: e.target.value })}
              className="w-full p-3 bg-gray-50 border rounded-xl text-sm"
              placeholder="Contoh: 15000"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700">Harga Extra (Opsional)</label>
            <input
              type="number"
              value={form.harga_extra}
              onChange={(e) => setForm({ ...form, harga_extra: e.target.value })}
              className="w-full p-3 bg-gray-50 border rounded-xl text-sm"
              placeholder="Kosongkan jika tidak ada"
            />
          </div>

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
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Foto Menu <span className="text-red-500 ml-1">*</span></label>
            <div className="border-2 border-dashed rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm truncate max-w-[180px] sm:max-w-none">
                  {selectedFile ? selectedFile.name : "Belum ada foto dipilih"}
                </span>
                <div className="flex gap-2 shrink-0">
                  <label htmlFor="upload-file" className="px-2.5 py-2 bg-[#002366] text-white rounded-lg text-[11px] font-bold cursor-pointer">Pilih File</label>
                  {selectedFile && <button type="button" onClick={handleRemoveFile} className="px-2.5 py-2 bg-red-500 text-white rounded-lg text-[11px] font-bold">Hapus</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <button onClick={handleUpload} disabled={loading} className="w-full mt-6 bg-[#002366] text-white py-3.5 sm:py-4 rounded-2xl font-black uppercase text-xs sm:text-sm hover:bg-blue-900 transition-all tracking-wider">
          {loading ? 'Memproses...' : 'Simpan Menu'}
        </button>
      </div>

      {/* TAB MENU */}
      <div className="flex gap-3 mb-6 md:mb-8 justify-center sm:justify-start">
        <button onClick={() => { setActiveTab('aktif'); setCurrentPage(1); }} className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all ${activeTab === 'aktif' ? 'bg-[#002366] text-white shadow-sm' : 'bg-white text-gray-500'}`}>Menu Aktif</button>
        <button onClick={() => { setActiveTab('nonaktif'); setCurrentPage(1); }} className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all ${activeTab === 'nonaktif' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-gray-500'}`}>Menu Nonaktif</button>
      </div>

      {/* GRID LIST MENU - DIOPTIMALKAN SUPAYA TIDAK SALING TINDIH DI MOBILE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 auto-rows-max">
        {filteredMenu.length === 0 ? (
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 text-center py-10 text-gray-400 font-bold text-sm">
            Tidak ada menu dalam kategori ini.
          </div>
        ) : (
          visibleMenu.map((m, index) => {
            const totalTerjualBulanIni = salesByMenuName[m.nama] || 0;
            const bauranVarianExtra = Number(m.harga_extra) > 0;

            return (
              <div 
                key={m.id} 
                className={`bg-white p-4 rounded-2xl sm:rounded-3xl shadow-sm border flex flex-col justify-between transition-all ${
                  m.stok === 'kosong' ? 'opacity-75 border-amber-300 bg-amber-50/10' : 'border-gray-100'
                }`}
                style={{ order: index }}
              >
                <div className="mb-3">
                  <div className="relative">
                    <img src={m.img} alt={m.nama} className={`w-full h-40 sm:h-32 object-cover rounded-xl sm:rounded-2xl mb-3 ${m.stok === 'kosong' ? 'grayscale opacity-60' : ''}`} />
                    {totalTerjualBulanIni > 0 && (
                      <span className="absolute top-2 left-2 bg-[#FF8C00] text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                        {totalTerjualBulanIni} Terjual
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-sm sm:text-base text-gray-800 truncate mb-2 px-0.5 capitalize">{m.nama}</h4>
                  
                  {/* HARGA BIASA & EXTRA */}
                  <div className="flex justify-between items-center bg-gray-50/80 p-2.5 rounded-xl border border-gray-100/70 min-h-[48px]">
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Biasa</span>
                      <span className="text-[#FF8C00] font-black text-xs sm:text-sm">
                        Rp {Number(m.harga_biasa).toLocaleString()}
                      </span>
                    </div>
                    {bauranVarianExtra && (
                      <div className="text-left">
                        <span className="text-gray-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Extra</span>
                        <span className="text-red-500 font-black text-xs sm:text-sm">
                          Rp {Number(m.harga_extra).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DROPDOWN & TOMBOL SEPERTI SEBELUMNYA */}
                <div className="space-y-2.5 w-full">
                  {activeTab === 'aktif' ? (
                    bauranVarianExtra ? (
                      <select
                        className="w-full px-2 py-2.5 border bg-white rounded-xl text-[11px] font-bold outline-none cursor-pointer border-gray-200 hover:border-[#002366] text-gray-700 truncate"
                        value={m.stok}
                        onChange={async (e) => {
                          const statusBaru = e.target.value;
                          await updateStokMenu(m.id, statusBaru);
                          if (fetchMenu) await fetchMenu();
                          toast.success('Ketersediaan varian diperbarui!');
                        }}
                      >
                        <option value="ada">Semua Varian Tersedia</option>
                        <option value="biasa_ada">Hanya Varian Biasa Tersedia</option>
                        <option value="extra_ada">Hanya Varian Extra Tersedia</option>
                        <option value="kosong">Semua Varian Kosong</option>
                      </select>
                    ) : (
                      <select
                        className={`w-full px-2 py-2.5 border rounded-xl text-[11px] font-bold outline-none cursor-pointer truncate ${m.stok === 'kosong' ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-gray-200 hover:border-[#002366] text-gray-700'}`}
                        value={m.stok === 'kosong' ? 'kosong' : 'ada'}
                        onChange={async (e) => {
                          const statusBaru = e.target.value;
                          await updateStokMenu(m.id, statusBaru);
                          if (fetchMenu) await fetchMenu();
                          toast.success('Status ketersediaan diperbarui!');
                        }}
                      >
                        <option value="ada">Tersedia</option>
                        <option value="kosong">Tidak Tersedia</option>
                      </select>
                    )
                  ) : (
                    <div className="w-full bg-gray-100 text-gray-400 text-center py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-gray-200/50">Menu Nonaktif</div>
                  )}

                  <div className="flex flex-row gap-2 w-full">
                    <button onClick={() => handleStartEdit(m)} className="flex-1 bg-[#002366] text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-900 transition-all text-center">
                      Edit
                    </button>
                    
                    {activeTab === 'nonaktif' ? (
                      <>
                        <button 
                          onClick={async () => { 
                            await updateStokMenu(m.id, 'ada'); 
                            toast.success('Menu berhasil diaktifkan!'); 
                            if (fetchMenu) await fetchMenu(); 
                            setCurrentPage(1); 
                            setActiveTab('aktif'); 
                          }} 
                          className="flex-1 bg-green-500 text-white py-2 rounded-xl text-xs font-bold text-center"
                        >
                          Aktifkan
                        </button>
                          <button 
                            onClick={() => setDeleteMenu(m)} 
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl shrink-0 transition-all duration-200"
                            title="Hapus Menu"
                          >
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              strokeWidth={1.5} 
                              stroke="currentColor" 
                              className="w-5 h-5"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" 
                              />
                            </svg>
                          </button>
                      </>
                    ) : (
                      <button 
                        onClick={async () => { 
                          await updateStokMenu(m.id, 'nonaktif'); 
                          toast.success('Menu dipindahkan ke nonaktif'); 
                          if (fetchMenu) await fetchMenu(); 
                          setCurrentPage(1); 
                          setActiveTab('nonaktif'); 
                        }} 
                        className="flex-1 bg-gray-400 text-white py-2 rounded-xl text-xs font-bold text-center hover:bg-gray-500 transition-all"
                      >
                        Nonaktifkan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PAGINATION RESPONSIVE */}
      {totalPage > 1 && (
        <div className="flex items-center justify-center gap-3 sm:gap-4 mt-8 md:mt-10">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm ${currentPage === 1 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-[#002366] text-white'}`}>Sebelumnya</button>
          <div className="font-black text-xs sm:text-sm text-[#002366] bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-2xs">{currentPage} / {totalPage}</div>
          <button disabled={currentPage === totalPage} onClick={() => setCurrentPage(currentPage + 1)} className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm ${currentPage === totalPage ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-[#FF8C00] text-white'}`}>Berikutnya</button>
        </div>
      )}

      {/* POPUP MODAL EDIT MENU */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[25px] sm:rounded-[35px] p-6 sm:p-8 my-auto shadow-xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <h3 className="font-black text-lg sm:text-xl text-[#002366] mb-4 sm:mb-6 border-b pb-2">Edit Data Menu</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1 md:col-span-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">Nama Menu <span className="text-red-500 ml-1">*</span></label>
                <input
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full p-3 bg-gray-50 border rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">Harga Biasa <span className="text-red-500 ml-1">*</span></label>
                <input
                  type="number"
                  value={editForm.harga_biasa}
                  onChange={(e) => setEditForm({ ...editForm, harga_biasa: e.target.value })}
                  className="w-full p-3 bg-gray-50 border rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">Harga Extra (Opsional)</label>
                <input
                  type="number"
                  value={editForm.harga_extra}
                  onChange={(e) => setEditForm({ ...editForm, harga_extra: e.target.value })}
                  className="w-full p-3 bg-gray-50 border rounded-xl text-sm"
                  placeholder="Kosongkan jika tidak ada"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8">
              <button onClick={() => saveEdit(editingId)} disabled={loading} className="w-full sm:flex-1 bg-[#002366] text-white py-3.5 rounded-xl font-black uppercase text-xs sm:text-sm hover:bg-blue-900 transition-all order-1 sm:order-2">
                {loading ? 'Memproses...' : 'Simpan Perubahan'}
              </button>
              <button onClick={() => setEditingId(null)} disabled={loading} className="w-full sm:flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-black uppercase text-xs sm:text-sm hover:bg-gray-200 transition-all order-2 sm:order-1">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteMenu && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[25px] sm:rounded-[35px] p-6 sm:p-8 text-center shadow-xl animate-fade-in">
            <h2 className="text-xl sm:text-2xl font-black text-red-500 mb-2">Konfirmasi Hapus</h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">Pastikan menu belum pernah dipesan oleh pelanggan.</p>
            <div className="flex gap-3 sm:gap-4">
              <button onClick={() => hapusMenu(deleteMenu.id)} className="flex-1 bg-red-500 text-white py-3 rounded-xl text-xs sm:text-sm font-black tracking-wide uppercase">Hapus</button>
              <button onClick={() => setDeleteMenu(null)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl text-xs sm:text-sm font-black tracking-wide uppercase">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KelolaMenuAdmin;