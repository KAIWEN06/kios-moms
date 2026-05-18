const handleProsesPesanan = async (nomorMeja, totalHarga, metodeBayar) => {
  try {
    // Simpan ke tabel history_pesanan
    const { data, error } = await supabase
      .from('history_pesanan')
      .insert([
        { 
          nomor_meja: parseInt(nomorMeja), 
          total_harga: totalHarga, 
          metode_pembayaran: metodeBayar, 
          status: 'Diproses' 
        }
      ]);

    if (error) throw error;

    alert("Pesanan berhasil disimpan ke database!");
    // Panggil fungsi clearCart() di sini untuk mengosongkan keranjang
    
  } catch (error) {
    console.error("Gagal menyimpan history:", error.message);
    alert("Error RLS: Pastikan Policy INSERT history_pesanan sudah aktif.");
  }
};