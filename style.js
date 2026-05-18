// // Database Menu Kios Mom's
// let menus = [
//     { id: 1, nama: "Nasi Kuning Bitung", harga: 5000, desc: "Abis Makang langsung ba tikang.", stok: "ada", img: "https://i.pinimg.com/736x/97/3c/4d/973c4d1f93729876b5c554edd802cbdc.jpg" },
//     { id: 2, nama: "Mie Cakalang Gatal", harga: 20000, desc: "from dendengan dalam.", stok: "ada", img: "https://i.pinimg.com/736x/b0/2c/91/b02c918f0ad2a4fbc8e0dc65c9073ed9.jpg" },
//     { id: 3, nama: "Pisang Goreng Laikit", harga: 15000, desc: "Enak katanya.", stok: "ada", img: "https://i.pinimg.com/736x/a4/cf/25/a4cf25ba39e4b3d9e54c5f979df4502f.jpg" },
//     { id: 4, nama: "Es Teh Manis Asam", harga: 5000, desc: "Panas ini.", stok: "ada", img: "https://i.pinimg.com/736x/1b/9a/23/1b9a2382bc0fb55a1f8cea2c28e1be12.jpg" },
//     { id: 5, nama: "Nutrisari Dingin Amad", harga: 5000, desc: "Ekstrak Loloda Ambon.", stok: "ada", img: "https://i.pinimg.com/736x/f8/56/5b/f8565b7442a9df396adc387c8555d8b4.jpg" },
//     { id: 6, nama: "Kopi Panas Skali", harga: 7000, desc: "Kopiko sto.", stok: "ada", img: "https://i.pinimg.com/736x/fd/63/20/fd632032bce32f2b913e2fd46fb4e1a9.jpg" }
// ];

// let cart = {}; // Penampung sementara buat pesanan
// let activeOrders = []; // Pesanan yang sedang diproses
// let historyOrders = []; // Pesanan selesai
// let occupiedTables = [1, 2]; // Contoh meja yang lagi terpakai

// function showSection(id) {
//     document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
//     document.getElementById(id).style.display = 'block';

// // --- Tambahkan/Pastikan baris ini ada di dalam fungsi showSection ---
// function showSection(id) {
//     document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
//     document.getElementById(id).style.display = 'block';
    
//     document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
//     // Logika pemanggilan render berdasarkan ID section
//     if(id === 'buat-pesanan') renderKatalog();
//     if(id === 'order-status') renderOrderMasuk();
//     if(id === 'admin-dashboard') renderProses();
//     if(id === 'riwayat-pesanan') renderRiwayat();
    
//     // PENTING: Panggil renderKelola saat section Kelola Menu dibuka
//     if(id === 'kelola-menu') renderKelola(); 
// }

// // --- Fungsi Render Kelola Menu (Katalog Stok) ---
// function renderKelola() {
//     const container = document.getElementById('kelola-list-katalog');
//     if (!container) return; // Mencegah error jika ID tidak ditemukan

//     container.innerHTML = menus.map(m => `
//         <div class="menu-card ${m.stok === 'kosong' ? 'kosong' : ''}">
//             <img src="${m.img}" alt="${m.nama}">
//             <div class="menu-info">
//                 <h4>${m.nama}</h4>
//                 <p>Harga: Rp ${m.harga.toLocaleString()}</p>
//                 <div style="margin-top: 10px;">
//                     <label style="font-size: 0.75rem; font-weight:bold;">Status Stok:</label>
//                     <select class="status-select" style="width: 100%; margin-top:5px;" onchange="updateStokMenu(${m.id}, this.value)">
//                         <option value="ada" ${m.stok === 'ada' ? 'selected' : ''}>Tersedia (Ada)</option>
//                         <option value="kosong" ${m.stok === 'kosong' ? 'selected' : ''}>Kosong (Habis)</option>
//                     </select>
//                 </div>
//             </div>
//         </div>
//     `).join('');
// }

// // Tambahkan pemanggilan ini di BARIS PALING BAWAH file style.js
// // Agar saat pertama kali web dibuka, data sudah siap di memori
// renderKelola();
// renderKatalog();
    
//     // Reset active nav
//     document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
//     if(id === 'buat-pesanan') renderKatalog();
//     if(id === 'order-status') renderOrderMasuk();
//     if(id === 'admin-dashboard') renderProses();
//     if(id === 'riwayat-pesanan') renderRiwayat();
//     if(id === 'kelola-menu') renderKelola();
// }

// // 1. Render Katalog
// function renderKatalog() {
//     const container = document.getElementById('katalog-display');
//     container.innerHTML = menus.map(m => {
//         const isHabis = m.stok === 'kosong';
//         return `
//             <div class="menu-card ${isHabis ? 'habis' : ''}">
//                 <img src="${m.img}" alt="${m.nama}">
//                 <div class="menu-info">
//                     <h3>${m.nama}</h3>
//                     <p>${m.desc}</p>
//                     ${isHabis ? '<p class="habis-text">MENU HABIS</p>' : ''}
//                     <div class="price-row">
//                         <strong>Rp ${m.harga.toLocaleString()}</strong>
//                         <div class="qty-btn">
//                             <button onclick="updateQty(${m.id}, -1)">-</button>
//                             <span id="q-${m.id}">${cart[m.id] || 0}</span>
//                             <button onclick="updateQty(${m.id}, 1)">+</button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;
//     }).join('');
// }

// function updateQty(id, delta) {
//     const menu = menus.find(m => m.id === id);
//     if(menu.stok === 'kosong') return alert("Menu ini sedang habis!");
    
//     if(!cart[id]) cart[id] = 0;
//     cart[id] = Math.max(0, cart[id] + delta);
    
//     const el = document.getElementById(`q-${id}`);
//     if(el) el.innerText = cart[id];
// }
// // Fungsi untuk Menambah Menu Baru (Upload)
// function tambahMenuBaru() {
//     const nama = document.getElementById('new-name').value;
//     const harga = parseInt(document.getElementById('new-price').value);
//     const desc = document.getElementById('new-desc').value;
//     const img = document.getElementById('new-img').value || "https://via.placeholder.com/150";

//     if(!nama || !harga) return alert("Nama dan Harga wajib diisi!");

//     const newId = menus.length + 1;
//     menus.push({ id: newId, nama, harga, desc, stok: "ada", img });
    
//     alert("Menu " + nama + " berhasil ditambahkan!");
    
//     // Reset Form
//     document.getElementById('new-name').value = "";
//     document.getElementById('new-price').value = "";
//     document.getElementById('new-desc').value = "";
//     document.getElementById('new-img').value = "";

//     renderKelola(); // Refresh tampilan kelola
// }

// // Render Katalog di Panel Kelola Menu (Hanya untuk Ubah Stok)
// function renderKelola() {
//     const container = document.getElementById('kelola-list-katalog');
//     container.innerHTML = menus.map(m => `
//         <div class="menu-card">
//             <img src="${m.img}" alt="${m.nama}">
//             <div class="menu-info">
//                 <h4>${m.nama}</h4>
//                 <p>Harga: Rp ${m.harga.toLocaleString()}</p>
//                 <div style="margin-top: 10px;">
//                     <label style="font-size: 0.8rem;">Status Stok:</label>
//                     <select class="status-select" style="width: 100%;" onchange="updateStokMenu(${m.id}, this.value)">
//                         <option value="ada" ${m.stok === 'ada' ? 'selected' : ''}>Tersedia (Ada)</option>
//                         <option value="kosong" ${m.stok === 'kosong' ? 'selected' : ''}>Kosong (Habis)</option>
//                     </select>
//                 </div>
//             </div>
//         </div>
//     `).join('');
// }

// // Fungsi Update Stok yang terhubung ke Buat Pesanan
// function updateStokMenu(id, val) {
//     const m = menus.find(item => item.id === id);
//     m.stok = val;
//     console.log("Stok " + m.nama + " diubah ke " + val);
// }

// // MODIFIKASI: Render Katalog Buat Pesanan agar mendukung "Menu Chabis"
// function renderKatalog() {
//     const container = document.getElementById('katalog-display');
//     container.innerHTML = menus.map(m => {
//         const isHabis = m.stok === 'kosong';
//         return `
//             <div class="menu-card ${isHabis ? 'kosong' : ''}">
//                 <img src="${m.img}" alt="${m.nama}">
//                 <div class="menu-info">
//                     <h3>${m.nama}</h3>
//                     <p>${m.desc}</p>
//                     ${isHabis ? '<p class="menu-chabis">menu chabis</p>' : ''}
//                     <div class="price-row">
//                         <strong>Rp ${m.harga.toLocaleString()}</strong>
//                         <div class="qty-btn">
//                             ${isHabis ? '' : `
//                                 <button onclick="updateQty(${m.id}, -1)">-</button>
//                                 <span id="q-${m.id}">${cart[m.id] || 0}</span>
//                                 <button onclick="updateQty(${m.id}, 1)">+</button>
//                             `}
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;
//     }).join('');
// }
// function kirimKeDaftarPesanan() {
//     const hasItem = Object.values(cart).some(q => q > 0);
//     if(!hasItem) return alert("Pilih minimal 1 menu!");
//     showSection('order-status');
// }

// // 2. Render Panel Pesanan Masuk
// function renderOrderMasuk() {
//     const list = document.getElementById('pesanan-masuk-list');
//     const summary = document.getElementById('summary-pesanan');
//     let html = '';
//     let totalHarga = 0;
//     let totalPcs = 0;

//     Object.keys(cart).forEach(id => {
//         const qty = cart[id];
//         if(qty > 0) {
//             const m = menus.find(menu => menu.id == id);
//             const sub = m.harga * qty;
//             totalHarga += sub;
//             totalPcs += qty;
//             html += `
//                 <div class="process-card">
//                     <div>
//                         <h4>${m.nama}</h4>
//                         <p>Rp ${m.harga.toLocaleString()} / pcs</p>
//                     </div>
//                     <div class="qty-btn">
//                         <button onclick="updateQtyInOrder(${id}, -1)">-</button>
//                         <strong>${qty} porsi</strong>
//                         <button onclick="updateQtyInOrder(${id}, 1)">+</button>
//                     </div>
//                     <div style="width:100px; text-align:right"><strong>Rp ${sub.toLocaleString()}</strong></div>
//                 </div>
//             `;
//         }
//     });

//     list.innerHTML = html || '<p>Belum ada item terpilih.</p>';
//     summary.innerHTML = `
//         <hr style="margin:10px 0">
//         <p>Total Item: <b>${totalPcs} pcs</b></p>
//         <h2 style="color:var(--orange)">Rp ${totalHarga.toLocaleString()}</h2>
//     `;
// }

// function updateQtyInOrder(id, delta) {
//     updateQty(id, delta);
//     renderOrderMasuk();
// }

// // Fungsi untuk Menambah Menu Baru (Upload)
// function tambahMenuBaru() {
//     const nama = document.getElementById('new-name').value;
//     const harga = parseInt(document.getElementById('new-price').value);
//     const desc = document.getElementById('new-desc').value;
//     const img = document.getElementById('new-img').value || "https://via.placeholder.com/150";

//     if(!nama || !harga) return alert("Nama dan Harga wajib diisi!");

//     const newId = menus.length + 1;
//     menus.push({ id: newId, nama, harga, desc, stok: "ada", img });
    
//     alert("Menu " + nama + " berhasil ditambahkan!");
    
//     // Reset Form
//     document.getElementById('new-name').value = "";
//     document.getElementById('new-price').value = "";
//     document.getElementById('new-desc').value = "";
//     document.getElementById('new-img').value = "";

//     renderKelola(); // Refresh tampilan kelola
// }

// // Render Katalog di Panel Kelola Menu (Hanya untuk Ubah Stok)
// function renderKelola() {
//     const container = document.getElementById('kelola-list-katalog');
//     container.innerHTML = menus.map(m => `
//         <div class="menu-card">
//             <img src="${m.img}" alt="${m.nama}">
//             <div class="menu-info">
//                 <h4>${m.nama}</h4>
//                 <p>Harga: Rp ${m.harga.toLocaleString()}</p>
//                 <div style="margin-top: 10px;">
//                     <label style="font-size: 0.8rem;">Status Stok:</label>
//                     <select class="status-select" style="width: 100%;" onchange="updateStokMenu(${m.id}, this.value)">
//                         <option value="ada" ${m.stok === 'ada' ? 'selected' : ''}>Tersedia (Ada)</option>
//                         <option value="kosong" ${m.stok === 'kosong' ? 'selected' : ''}>Kosong (Habis)</option>
//                     </select>
//                 </div>
//             </div>
//         </div>
//     `).join('');
// }

// // Fungsi Update Stok yang terhubung ke Buat Pesanan
// function updateStokMenu(id, val) {
//     const m = menus.find(item => item.id === id);
//     m.stok = val;
//     console.log("Stok " + m.nama + " diubah ke " + val);
// }

// // MODIFIKASI: Render Katalog Buat Pesanan agar mendukung "Menu Chabis"
// function renderKatalog() {
//     const container = document.getElementById('katalog-display');
//     container.innerHTML = menus.map(m => {
//         const isHabis = m.stok === 'kosong';
//         return `
//             <div class="menu-card ${isHabis ? 'kosong' : ''}">
//                 <img src="${m.img}" alt="${m.nama}">
//                 <div class="menu-info">
//                     <h3>${m.nama}</h3>
//                     <p>${m.desc}</p>
//                     ${isHabis ? '<p class="menu-chabis">menu chabis</p>' : ''}
//                     <div class="price-row">
//                         <strong>Rp ${m.harga.toLocaleString()}</strong>
//                         <div class="qty-btn">
//                             ${isHabis ? '' : `
//                                 <button onclick="updateQty(${m.id}, -1)">-</button>
//                                 <span id="q-${m.id}">${cart[m.id] || 0}</span>
//                                 <button onclick="updateQty(${m.id}, 1)">+</button>
//                             `}
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;
//     }).join('');
// }

// // 3. Pindahkan ke Proses Pesanan
// function pindahkanKeProses() {
//     const meja = parseInt(document.getElementById('meja-input').value);
//     if(occupiedTables.includes(meja)) return alert("Meja No. " + meja + " sedang digunakan pelanggan lain!");

//     const itemsOrdered = [];
//     Object.keys(cart).forEach(id => {
//         if(cart[id] > 0) {
//             const m = menus.find(menu => menu.id == id);
//             itemsOrdered.push({ nama: m.nama, qty: cart[id], subtotal: m.harga * cart[id] });
//         }
//     });

//     const newOrder = {
//         id: "KM-" + Date.now().toString().slice(-6),
//         meja: meja,
//         email: document.getElementById('email-input').value || "Manual @ Kasir",
//         items: itemsOrdered,
//         total: itemsOrdered.reduce((a, b) => a + b.subtotal, 0),
//         status: "diproses"
//     };

//     activeOrders.push(newOrder);
//     occupiedTables.push(meja);
//     cart = {}; // Reset keranjang
//     alert("Pesanan meja " + meja + " berhasil diproses!");
//     showSection('admin-dashboard');
// }

// // 4. Render Proses
// function renderProses() {
//     const container = document.getElementById('proses-list');
//     container.innerHTML = activeOrders.map((order, idx) => `
//         <div class="process-card">
//             <div>
//                 <strong>${order.id} | Meja ${order.meja}</strong>
//                 <p style="font-size:0.7rem">${order.items.map(i => i.nama + ' ('+i.qty+')').join(', ')}</p>
//             </div>
//             <div class="status-tag">DIPROSES</div>
//             <div>
//                 <select class="status-select" onchange="ubahKeSelesai(${idx}, this.value)">
//                     <option value="diproses" selected>Diproses</option>
//                     <option value="selesai">Selesai</option>
//                 </select>
//             </div>
//         </div>
//     `).join('');
// }

// function ubahKeSelesai(idx, val) {
//     if(val === 'selesai') {
//         const order = activeOrders[idx];
//         order.status = 'selesai';
//         historyOrders.push(order);
//         // Bebaskan meja
//         occupiedTables = occupiedTables.filter(m => m !== order.meja);
//         activeOrders.splice(idx, 1);
//         alert("Pesanan selesai dan masuk riwayat.");
//         showSection('riwayat-pesanan');
//     }
// }

// // 5. Riwayat Accordion
// function renderRiwayat() {
//     const container = document.getElementById('riwayat-list');
//     container.innerHTML = historyOrders.map((o, idx) => `
//         <div class="riwayat-item">
//             <div class="riwayat-header" onclick="toggleDetail(${idx})">
//                 <span><b>Meja ${o.meja}</b> | ${o.id}</span>
//                 <span>Rp ${o.total.toLocaleString()} ▾</span>
//             </div>
//             <div class="riwayat-body" id="det-${idx}">
//                 <ul>${o.items.map(i => `<li>${i.nama} x ${i.qty} - Rp ${i.subtotal.toLocaleString()}</li>`).join('')}</ul>
//                 <p style="margin-top:10px; font-weight:bold; color:green">STATUS: SELESAI</p>
//             </div>
//         </div>
//     `).join('');
// }

// function toggleDetail(idx) {
//     const el = document.getElementById(`det-${idx}`);
//     el.style.display = el.style.display === 'block' ? 'none' : 'block';
// }

// // 6. Kelola Stok
// function renderKelola() {
//     const container = document.getElementById('kelola-list');
//     container.innerHTML = menus.map(m => `
//         <div class="process-card">
//             <div style="display:flex; align-items:center; gap:15px">
//                 <img src="${m.img}" style="width:50px; height:50px; border-radius:5px; object-fit:cover">
//                 <strong>${m.nama}</strong>
//             </div>
//             <select class="status-select" onchange="updateStokMenu(${m.id}, this.value)">
//                 <option value="ada" ${m.stok === 'ada' ? 'selected' : ''}>Tersedia</option>
//                 <option value="kosong" ${m.stok === 'kosong' ? 'selected' : ''}>Habis</option>
//             </select>
//         </div>
//     `).join('');
// }

// function updateStokMenu(id, val) {
//     const m = menus.find(item => item.id === id);
//     m.stok = val;
//     alert("Stok " + m.nama + " diubah!");
// }
// function showSection(sectionId) {
//     // Sembunyikan semua section
//     document.querySelectorAll('.content-section').forEach(sec => {
//         sec.style.display = 'none';
//     });

//     // Tampilkan section yang dipilih
//     const activeSection = document.getElementById(sectionId);
//     if (activeSection) {
//         activeSection.style.display = 'block';
//     }

//     // PENTING: Panggil fungsi render khusus untuk Kelola Menu
//     if (sectionId === 'kelola-menu') {
//         renderKelola(); // Ini yang membuat daftar stok muncul
//     }
    
//     // Fungsi render lainnya sesuai kebutuhan
//     if (sectionId === 'buat-pesanan') renderKatalog();
//     if (sectionId === 'order-status') renderOrderMasuk();
//     if (sectionId === 'admin-dashboard') renderProses();
//     if (sectionId === 'riwayat-pesanan') renderRiwayat();

//     window.scrollTo({ top: 0, behavior: 'smooth' });
// }