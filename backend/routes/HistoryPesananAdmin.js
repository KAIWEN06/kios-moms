const handleProsesPesanan = async (
  nomorMeja,
  totalHarga,
  metodeBayar
) => {

  try {

    // VALIDASI MEJA
    const { data: existingMeja } = await supabase
      .from('history_pesanan')
      .select('id')
      .eq('nomor_meja', Number(nomorMeja))
      .eq('status', 'Diproses');

    if (existingMeja.length > 0) {

      toast.error(
        `Meja ${nomorMeja} sedang digunakan!`
      );

      return;

    }

    // BENTUK ITEMS
    const itemsData = cartItems.map((id) => {

      const m = menu.find(
        (item) => Number(item.id) === Number(id)
      );

      if (!m) return null;

      return {
        nama: m.nama,
        harga: Number(m.harga),
        qty: Number(cart[id]),
        subtotal:
          Number(m.harga) *
          Number(cart[id])
      };

    }).filter(Boolean);

    // SIMPAN KE DATABASE
    const { data, error } = await supabase
      .from('history_pesanan')
      .insert([
        {
          nomor_meja: Number(nomorMeja),
          total_harga: Number(totalHarga),
          metode_pembayaran: metodeBayar,
          status: 'Diproses',
          items: itemsData
        }
      ])
      .select();

    // ERROR
    if (error) throw error;

    console.log(
      'BERHASIL:',
      data
    );

    // TOAST SUCCESS
    toast.success(
      `Pesanan meja ${nomorMeja} berhasil diproses!`,
      {
        style: {
          fontSize: '16px',
          fontWeight: '700',
          padding: '16px',
          borderRadius: '20px',
          background: '#ffffff',
          color: '#002366',
        },
      }
    );

    // CLEAR CART
    clearCart();

    // PINDAH HALAMAN
    navigate('/adminProses-pesanan');

  } catch (error) {

    console.error(
      'Gagal menyimpan history:',
      error.message
    );

    toast.error(
      error.message
    );

  }

};