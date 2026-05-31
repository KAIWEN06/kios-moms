import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend'

const resend = new Resend(
  Deno.env.get('RESEND_API_KEY')
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {

  // HANDLE PREFLIGHT
  if (req.method === 'OPTIONS') {

    return new Response('ok', {
      headers: corsHeaders,
    })

  }

  try {

const {
  email,
  nama_pembeli,
  kode_pesanan,
  nomor_meja,
  total_harga,
  items,
  access_token
} = await req.json();

    
    /* =========================================
       VALIDASI
    ========================================= */

    if (!email) {

      return new Response(
        JSON.stringify({
          error: 'Email wajib diisi',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )

    }
    

    /* =========================================
       FORMAT ITEMS
    ========================================= */

    const itemsHtml =
  items
    ?.map(
      (item) => `
      <tr>

        <td
          style="
            padding:12px;
            text-align:left;
            width:60%;
          "
        >
          ${item.nama}
        </td>

        <td
          style="
            padding:12px;
            text-align:center;
            width:15%;
          "
        >
          ${item.qty}x
        </td>

        <td
          style="
            padding:12px;
            text-align:right;
            width:25%;
          "
        >
          Rp ${(
            Number(item.harga) *
            Number(item.qty)
          ).toLocaleString('id-ID')}
        </td>

      </tr>
    `
    )
    .join("");

      const baseUrl =
  'http://localhost:5173';

const statusUrl =
  `${baseUrl}/status-pesanan?token=${access_token}`;

const riwayatUrl =
  `${baseUrl}/riwayat-pesanan-pembeli?token=${access_token}`;

    /* =========================================
       EMAIL HTML
    ========================================= */

    const html = `
      <div
        style="
          font-family: Arial;
          max-width:600px;
          margin:auto;
          padding:20px;
        "
      >

        <h1
          style="
            color:#002366;
          "
        >
          Kios Moms
        </h1>

        <h2>
          Pesanan Berhasil Dibuat
        </h2>

        <p>
          Halo ${nama_pembeli},
        </p>

        <p>
          Pesanan Anda dengan kode <b>${kode_pesanan}</b> telah berhasil dibuat dan sedang diproses. Kami akan mengatarkan pesanan anda ketika sudah siap. Pastikan nomor meja anda sesuai dan terlihat dengan benar untuk memudahkan kami mengantarkan pesanan anda.
        </p>

        <div
        style="
          margin-top:20px;
          margin-bottom:20px;
          padding:15px;
          background:#f8f9fc;
          border-radius:10px;
        "
      >

        <p>
          Simpan tautan berikut untuk melihat
          status pesanan dan riwayat pesanan anda
          tanpa perlu login kapan saja.
        </p>

        <div
          style="
            text-align:center;
            margin-top:20px;
          "
        >

          <a
            href="${statusUrl}"
            style="
              display:inline-block;
              background:#0b2c74;
              color:#ffffff;
              text-decoration:none;
              padding:14px 28px;
              border-radius:8px;
              font-weight:bold;
              margin-bottom:12px;
            "
          >
            Lihat Status Pesanan
          </a>

          <br/>

          <a
            href="${riwayatUrl}"
            style="
              display:inline-block;
              background:#ffffff;
              color:#0b2c74;
              border:2px solid #0b2c74;
              text-decoration:none;
              padding:12px 26px;
              border-radius:8px;
              font-weight:bold;
            "
          >
            Lihat Riwayat Pesanan
          </a>

        </div>

      </div>

        <hr />

        <p>
          <b>Kode Pesanan:</b>
          ${kode_pesanan}
        </p>

        <p>
          <b>Nomor Meja:</b>
          ${nomor_meja}
        </p>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="
            border-collapse:collapse;
            margin-top:20px;
          "
        >

          <thead>

            <tr
              style="
                background:#002366;
                color:white;
              "
            >

              <th style="padding:10px;width:60%;">
                Menu
              </th>

              <th style="padding:10px;width:15%;">
                Jumlah  
              </th>

              <th style="padding:10px;width:25%;text-align:right;">
                Harga
              </th>

            </tr>

          </thead>

          <tbody>

            ${itemsHtml}

          </tbody>

        </table>

        <h2
          style="
            margin-top:20px;
            color:#FF8C00;
          "
        >

          Total:
          Rp ${Number(total_harga)
            .toLocaleString('id-ID')}

        </h2>

        <p
          style="
            margin-top:30px;
            color:gray;
            font-size:14px;
          "
        >

          Terima kasih telah memesan di Kios Moms

        </p>

      </div>
    `

    /* =========================================
       SEND EMAIL
    ========================================= */

    const data =
      await resend.emails.send({

        from:
          'Kios Moms <onboarding@resend.dev>',

        to: email,

        subject:
          `Pesanan ${kode_pesanan} Berhasil`,

        html,

      })

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )

  } catch (error) {

    console.log(error)

    return new Response(
      JSON.stringify(error),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )

  }

})