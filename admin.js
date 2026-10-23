import { db } from './firebase-config.js';
import { 
  collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, 
  serverTimestamp, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

// ============ NAVIGASI SIDEBAR ============
const navMenu = document.getElementById('nav-menu');
const sectionPesanan = document.getElementById('section-pesanan');
const sectionMenu = document.getElementById('section-menu');
const navPesanan = document.querySelector('nav a:first-child');

if (navMenu && navPesanan) {
  navMenu.onclick = (e) => {
    e.preventDefault();
    sectionPesanan.style.display = 'none';
    sectionMenu.style.display = 'block';
    navMenu.classList.add('active');
    navPesanan.classList.remove('active');
  };

  navPesanan.onclick = (e) => {
    e.preventDefault();
    sectionMenu.style.display = 'none';
    sectionPesanan.style.display = 'block';
    navPesanan.classList.add('active');
    navMenu.classList.remove('active');
  };
}

// ============ PESANAN ============
const pesananList = document.getElementById('pesanan-list');
let pesananTerakhir = null;
const qPesanan = query(collection(db, 'pesanan'), orderBy('dibuat', 'desc'));

onSnapshot(qPesanan, (snap) => {
  const semua = snap.docs;
  if (pesananTerakhir !== null && semua.length > 0) {
    if (semua[0].id !== pesananTerakhir) bunyiNotif();
  }
  if (semua.length > 0) pesananTerakhir = semua[0].id;

  if (semua.length === 0) {
    pesananList.innerHTML = '<div class="empty">Belum ada pesanan.</div>';
    return;
  }
  pesananList.innerHTML = semua.map(d => {
    const p = d.data();
    const isBaru = p.status === 'baru';
    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h3>${p.namaPemesan} <span class="badge ${p.status}">${p.status.toUpperCase()}</span></h3>
          <small style="color:#94a3b8">${formatWaktu(p.dibuat)}</small>
        </div>
        <ul style="margin: 10px 0 10px 20px; font-size: 0.9rem; color: #475569;">
          ${p.items.map(i => `<li>${i.nama} × ${i.qty} = Rp ${(i.harga*i.qty).toLocaleString('id-ID')}</li>`).join('')}
        </ul>
        <div class="harga" style="margin-bottom:12px;">Total: Rp ${p.total.toLocaleString('id-ID')}</div>
        ${isBaru ? `<button data-id="${d.id}" class="selesai" style="width:100%;">✓ Tandai Selesai</button>` : ''}
      </div>
    `;
  }).join('');

  pesananList.querySelectorAll('.selesai').forEach(b => {
    b.onclick = async () => {
      await updateDoc(doc(db, 'pesanan', b.dataset.id), { status: 'selesai' });
    };
  });
});

function formatWaktu(ts) {
  if (!ts) return 'baru saja';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

function bunyiNotif() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

// ============ KELOLA MENU ============
const menuAdminList = document.getElementById('menu-admin-list');
const formContainer = document.getElementById('form-container');
const inputNama = document.getElementById('input-nama');
const inputHarga = document.getElementById('input-harga');
const editId = document.getElementById('edit-id');
const btnSimpan = document.getElementById('btn-simpan');
const btnBatal = document.getElementById('btn-batal');
const btnTambahMenu = document.getElementById('btn-tambah-menu');
const formJudul = document.getElementById('form-judul');

if (btnTambahMenu) {
  btnTambahMenu.onclick = () => {
    formContainer.style.display = 'block';
    resetForm();
  };
}
if (btnBatal) {
  btnBatal.onclick = () => {
    formContainer.style.display = 'none';
    resetForm();
  };
}

onSnapshot(collection(db, 'menu'), (snap) => {
  if (snap.empty) {
    menuAdminList.innerHTML = '<div class="empty">Belum ada menu.</div>';
    return;
  }
  menuAdminList.innerHTML = snap.docs.map(d => {
    const m = d.data();
    return `
      <div class="card">
        <h3>${m.nama}</h3>
        <div class="harga">Rp ${(m.harga||0).toLocaleString('id-ID')}</div>
        <div class="row" style="margin-top:12px;">
          <button data-id="${d.id}" data-nama="${m.nama}" data-harga="${m.harga}" class="btn-edit btn-outline" style="flex:1;">Edit</button>
          <button data-id="${d.id}" class="btn-hapus danger" style="flex:1;">Hapus</button>
        </div>
      </div>
    `;
  }).join('');

  menuAdminList.querySelectorAll('.btn-edit').forEach(b => {
    b.onclick = () => {
      formContainer.style.display = 'block';
      editId.value = b.dataset.id;
      inputNama.value = b.dataset.nama;
      inputHarga.value = b.dataset.harga;
      formJudul.textContent = 'Edit Menu';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });
  menuAdminList.querySelectorAll('.btn-hapus').forEach(b => {
    b.onclick = async () => {
      if (confirm('Yakin hapus menu ini?')) await deleteDoc(doc(db, 'menu', b.dataset.id));
    };
  });
});

if (btnSimpan) {
  btnSimpan.onclick = async () => {
    const nama = inputNama.value.trim();
    const harga = parseInt(inputHarga.value, 10);
    if (!nama || isNaN(harga) || harga < 0) return alert('Isi nama dan harga dengan benar.');
    
    btnSimpan.disabled = true;
    try {
      if (editId.value) {
        await updateDoc(doc(db, 'menu', editId.value), { nama, harga });
      } else {
        await addDoc(collection(db, 'menu'), { nama, harga, dibuat: serverTimestamp() });
      }
      formContainer.style.display = 'none';
      resetForm();
    } catch (e) {
      alert('Gagal simpan: ' + e.message);
    } finally {
      btnSimpan.disabled = false;
    }
  };
}

function resetForm() {
  editId.value = ''; inputNama.value = ''; inputHarga.value = '';
  formJudul.textContent = 'Tambah Menu Baru';
}

// ==========================================
// LOGIKA NOTIFIKASI FCM (DIJALANKAN PALING AKHIR)
// ==========================================
const VAPID_KEY = "BDc3uruxJY2y8J8nRKlsZk1_DvglGBCBOF86DZ6tk_CiUKx3EjKRzZmKGu_nPlAbZxzxhNexntv0IKLWDdch_VM";

async function mintaIzinNotifikasi() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Izin notifikasi diberikan.');
      const messaging = getMessaging();
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (currentToken) {
        // Tampilkan token di Console dengan warna yang mencolok
        console.log('%c=========================================', 'color: blue');
        console.log('%c TOKEN FCM BERHASIL DIDAPAT:', 'color: green; font-size: 16px; font-weight: bold;');
        console.log(currentToken);
        console.log('%c=========================================', 'color: blue');
      } else {
        console.log('Gagal mendapatkan token.');
      }
    }
  } catch (error) {
    console.error('Error FCM (abaikan jika form menu berfungsi):', error);
  }
}

// Panggil SETELAH semua tombol siap
setTimeout(mintaIzinNotifikasi, 1000);
