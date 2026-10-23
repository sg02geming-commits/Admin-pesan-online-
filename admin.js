// Tambahkan import untuk messaging
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-sw.js";

// ... kode inisialisasi db yang sudah ada ...
import { db } from './firebase-init.js';
import {
  collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============ PESANAN ============
const pesananList = document.getElementById('pesanan-list');
let pesananTerakhir = null;

const qPesanan = query(collection(db, 'pesanan'), orderBy('dibuat', 'desc'));

onSnapshot(qPesanan, (snap) => {
  // Deteksi pesanan baru untuk bunyi notifikasi
  const semua = snap.docs;
  if (pesananTerakhir !== null && semua.length > 0) {
    const terbaru = semua[0];
    if (terbaru.id !== pesananTerakhir) {
      bunyiNotif();
    }
  }
  if (semua.length > 0) pesananTerakhir = semua[0].id;

  if (semua.length === 0) {
    pesananList.innerHTML = '<div class="empty">Belum ada pesanan.</div>';
    return;
  }
  pesananList.innerHTML = semua.map(d => {
    const p = d.data();
    const statusBadge = p.status === 'baru'
      ? '<span class="badge">BARU</span>'
      : '<span class="badge" style="background:#e8f5e9;color:#2e7d32;">SELESAI</span>';
    return `
      <div class="card">
        <div class="row">
          <h3 style="flex:2;">${p.namaPemesan} ${statusBadge}</h3>
          <div style="text-align:right;font-size:0.85rem;color:#666;">${formatWaktu(p.dibuat)}</div>
        </div>
        <ul style="margin:8px 0 8px 20px;font-size:0.9rem;">
          ${p.items.map(i => `<li>${i.nama} × ${i.qty} = Rp ${(i.harga*i.qty).toLocaleString('id-ID')}</li>`).join('')}
        </ul>
        <div class="harga" style="margin-bottom:8px;">Total: Rp ${p.total.toLocaleString('id-ID')}</div>
        ${p.status === 'baru'
          ? `<button data-id="${d.id}" class="btn-selesai">Tandai Selesai</button>`
          : ''}
      </div>
    `;
  }).join('');

  pesananList.querySelectorAll('.btn-selesai').forEach(b => {
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

// Bunyi notifikasi (pakai Audio API bawaan browser)
function bunyiNotif() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch (e) { /* diabaikan */ }
}

// ============ KELOLA MENU ============
const menuAdminList = document.getElementById('menu-admin-list');
const inputNama = document.getElementById('input-nama');
const inputHarga = document.getElementById('input-harga');
const editId = document.getElementById('edit-id');
const btnSimpan = document.getElementById('btn-simpan');
const btnBatal = document.getElementById('btn-batal');
const formJudul = document.getElementById('form-judul');

onSnapshot(collection(db, 'menu'), (snap) => {
  if (snap.empty) {
    menuAdminList.innerHTML = '<div class="empty">Belum ada menu.</div>';
    return;
  }
  menuAdminList.innerHTML = snap.docs.map(d => {
    const m = d.data();
    return `
      <div class="card">
        <div class="row">
          <div style="flex:2;">
            <h3>${m.nama}</h3>
            <div class="harga">Rp ${(m.harga||0).toLocaleString('id-ID')}</div>
          </div>
          <div style="text-align:right;">
            <button data-id="${d.id}" data-nama="${m.nama}" data-harga="${m.harga}" class="btn-edit" style="padding:6px 12px;">Edit</button>
            <button data-id="${d.id}" class="btn-hapus danger" style="padding:6px 12px;">Hapus</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  menuAdminList.querySelectorAll('.btn-edit').forEach(b => {
    b.onclick = () => {
      editId.value = b.dataset.id;
      inputNama.value = b.dataset.nama;
      inputHarga.value = b.dataset.harga;
      formJudul.textContent = 'Edit Menu';
      btnBatal.style.display = 'inline-block';
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };
  });
  menuAdminList.querySelectorAll('.btn-hapus').forEach(b => {
    b.onclick = async () => {
      if (confirm('Yakin hapus menu ini?')) {
        await deleteDoc(doc(db, 'menu', b.dataset.id));
      }
    };
  });
});

btnSimpan.onclick = async () => {
  const nama = inputNama.value.trim();
  const harga = parseInt(inputHarga.value, 10);
  if (!nama || isNaN(harga) || harga < 0) {
    alert('Isi nama dan harga dengan benar.');
    return;
  }
  btnSimpan.disabled = true;
  try {
    if (editId.value) {
      await updateDoc(doc(db, 'menu', editId.value), { nama, harga });
    } else {
      await addDoc(collection(db, 'menu'), { nama, harga, dibuat: serverTimestamp() });
    }
    resetForm();
  } catch (e) {
    alert('Gagal simpan: ' + e.message);
  } finally {
    btnSimpan.disabled = false;
  }
};

btnBatal.onclick = resetForm;

function resetForm() {
  editId.value = '';
  inputNama.value = '';
  inputHarga.value = '';
  formJudul.textContent = 'Tambah Menu Baru';
  btnBatal.style.display = 'none';
}

// --- LOGIKA NOTIFIKASI PUSH ---
const VAPID_KEY = "BDc3uruxJY2y8J8nRKlsZk1_DvglGBCBOF86DZ6tk_CiUKx3EjKRzZmKGu_nPlAbZxzxhNexntv0IKLWDdch_VM"; // Paste dari Langkah 1

async function mintaIzinNotifikasi() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Izin notifikasi diberikan.');
      
      const messaging = getMessaging();
      
      // Dapatkan token unik untuk device ini
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (currentToken) {
        console.log('Token FCM berhasil didapat:', currentToken);
        // SIMPAN TOKEN INI KE DATABASE (Firestore)
        // Kamu perlu menyimpannya agar backend bisa mengirim pesan ke token ini
        // Contoh: simpan ke koleksi 'tokens_admin'
        // await addDoc(collection(db, 'tokens_admin'), { token: currentToken, dibuat: serverTimestamp() });
      } else {
        console.log('Gagal mendapatkan token. Pastikan izin diberikan.');
      }
    } else {
      console.log('Izin notifikasi ditolak.');
    }
  } catch (error) {
    console.error('Error saat meminta izin:', error);
  }
}

// Panggil fungsi ini saat halaman admin dimuat
mintaIzinNotifikasi();

// Menangani pesan saat halaman admin SEDANG TERBUKA
onMessage(getMessaging(), (payload) => {
  console.log('Pesan diterima saat foreground:', payload);
  // Kamu bisa memunculkan alert atau toast di sini
  alert(payload.notification?.title + "\n" + payload.notification?.body);
});
