const handleTambahMenu = async () => {
  // 1. Ambil file dari state (misal: gambarFile)
  // JANGAN gunakan path string "file:///..."
  
  const file = gambarFile; 
  const fileName = `${Date.now()}_${file.name}`;

  // 2. Upload ke Storage Bucket
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('menu-images')
    .upload(fileName, file);

  if (uploadError) return alert("Gagal upload gambar!");

  // 3. Ambil URL Publiknya
  const { data: publicUrlData } = supabase.storage
    .from('menu-images')
    .getPublicUrl(fileName);

  const publicUrl = publicUrlData.publicUrl;

  // 4. Barulah simpan publicUrl ini ke tabel 'menu'
  const { error: dbError } = await supabase
    .from('menu')
    .insert([{ nama: namaMenu, harga: hargaMenu, img: publicUrl, stok: 'Tersedia' }]);

  if (!dbError) alert("Berhasil!");
};