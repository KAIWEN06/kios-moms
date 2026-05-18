const handleTambahMenu = async () => {

  try {

    // VALIDASI
    if (
      !namaMenu ||
      !hargaMenu ||
      !gambarFile
    ) {

      toast.error(
        'Lengkapi data menu!'
      );

      return;

    }

    // FILE
    const file = gambarFile;

    // NAMA FILE UNIK
    const fileName = `${Date.now()}_${file.name}`;

    // UPLOAD KE STORAGE
    const {
      data: uploadData,
      error: uploadError
    } = await supabase.storage
      .from('menu-images')
      .upload(fileName, file);

    // ERROR UPLOAD
    if (uploadError) {

      console.error(uploadError);

      toast.error(
        'Gagal upload gambar!'
      );

      return;

    }

    // AMBIL PUBLIC URL
    const { data: publicUrlData } =
      supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName);

    const publicUrl =
      publicUrlData.publicUrl;

    // SIMPAN KE DATABASE
    const {
      data,
      error: dbError
    } = await supabase
      .from('menu')
      .insert([
        {
          nama: namaMenu,
          harga: Number(hargaMenu),
          img: publicUrl,
          stok: 'ada'
        }
      ])
      .select();

    // ERROR DATABASE
    if (dbError) {

      console.error(dbError);

      toast.error(
        'Gagal menyimpan menu!'
      );

      return;

    }

    console.log(
      'MENU BERHASIL:',
      data
    );

    // TOAST SUCCESS
    toast.success(
      'Menu berhasil ditambahkan!',
      {
        style: {
          fontSize: '15px',
          fontWeight: '700',
          borderRadius: '18px',
          padding: '16px',
        },
      }
    );

    // RESET FORM
    setNamaMenu('');
    setHargaMenu('');
    setGambarFile(null);

    // REFRESH MENU
    fetchMenu();

  } catch (error) {

    console.error(error);

    toast.error(
      error.message
    );

  }

};