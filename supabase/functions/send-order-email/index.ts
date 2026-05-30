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

    } = await req.json()

    
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
      items?.map((item: any) => {

        return `
          <tr>
            <td style="padding:8px;">
              ${item.nama}
            </td>

            <td style="padding:8px;">
              ${item.qty}x
            </td>

            <td style="padding:8px;">
              Rp ${Number(item.harga)
                .toLocaleString('id-ID')}
            </td>
          </tr>
        `

      }).join('')

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
          Pesanan Berhasil
        </h2>

        <p>
          Halo ${nama_pembeli},
        </p>

        <p>
          Pesanan Anda berhasil dibuat.
        </p>

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

              <th style="padding:10px;">
                Menu
              </th>

              <th style="padding:10px;">
                Qty
              </th>

              <th style="padding:10px;">
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