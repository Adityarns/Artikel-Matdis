let status = {
    // tegangan: true,
    // arus: true,
    daya: true,
    suhuAman: true,
    bateraiPenuh: false,
    pendinginAktif: false,
    pendinginOtomatis: true,
    pengisianAktif: true,
    kapasitasBaterai: 0,
    suhu: 30,
  };

let interval;
const overheatLevel = 50;
// const overheatSound = new Audio('overheat-sound.mp3');
// const notifSound = new Audio('notif-sound.mp3');

function mulaiPengisian(status) {
  return status.daya && status.suhuAman && !status.bateraiPenuh;
}

function penghentianPengisian(status) {
  return status.bateraiPenuh || !status.suhuAman || !status.daya;
}

function keberlanjutanPengisian(status) {
  return (
    status.pengisianAktif && !status.bateraiPenuh && (status.suhuAman || status.pendinginAktif)
   );
}

function pengaturanPendingin(status) {
  if (status.suhu > 40) {
    if (!status.pendinginAktif) {
      status.pendinginAktif = true;
      if (status.pendinginAktif && window.kipas){
        window.kipas.play();
        updatePendingin(status);
      }
      logStatus('Pendingin diaktifkan otomatis karena suhu tinggi!');
    }
  } else if (status.suhu <= 40) {
    if (status.pendinginAktif) {
      status.pendinginAktif = false;
      if (!status.pendinginAktif && window.kipas){
        window.kipas.stop();
        updatePendingin(status);
      }
      logStatus('Pendingin dimatikan otomatis, suhu sudah aman.');
    }
  }
}

function penguranganArus(status) {
  if (status.kapasitasBaterai >= 90) {
    return 1;
  } else if (status.kapasitasBaterai >= 80) {
    return 2;
  } else {
    return 3;
  }
}

function pengaturanDaya(status){
  
}

function updateSuhu(status) {
  if (status.pengisianAktif) {
    status.suhu += Math.random() * 0.5; // Naik sedikit saat mengisi
  }

  if (status.pendinginAktif) {
    if (status.suhu >= 45) {
      status.suhu -= 2; // Pendingin lebih kuat saat suhu sangat tinggi
    } else {
      status.suhu -= 1; // Normal cooling
    }
  } else if (!status.pengisianAktif) {
    status.suhu -= 0.1; // Perlahan turun meski tidak ada pendingin
  }

  // Batasi suhu di antara 25°C - 100°C
  status.suhu = Math.max(25, Math.min(status.suhu, 100));

  status.suhuAman = status.suhu <= overheatLevel;

  document.getElementById('thermo').textContent = `Suhu: ${status.suhu.toFixed(1)}°C`;

  if (status.suhu > overheatLevel && status.pengisianAktif && status.pendinginOtomatis) {
    status.pendinginAktif = true;
    document.getElementById('startBtn').disabled = true;
  }
}

function updateChargeBar() {
  const bar = document.getElementById('chargeBar');
  bar.style.width = status.kapasitasBaterai + '%';

  if (status.kapasitasBaterai < 20) {
    bar.style.background = 'red';
  } else if (status.kapasitasBaterai < 80) {
    bar.style.background = 'gold';
  } else {
    bar.style.background = 'limegreen';
  }
}

function updateBaterai(status){
  document.getElementById('statusBaterai').textContent = `Baterai: ${status.kapasitasBaterai}%`;
}

function updatePendingin(status){
  if(status.pendinginAktif){
    document.getElementById('cooler').textContent = `Pendingin: Aktif`;
  }
  else{
    document.getElementById('cooler').textContent = `Pendingin: -`;
  }
}

function naikkanSuhu() {
  status.suhu += 5;
  if (status.suhu > 100) status.suhu = 100;
  status.suhuAman = status.suhu <= overheatLevel;
  document.getElementById('thermo').textContent = `Suhu: ${status.suhu.toFixed(1)}°C`;
  logStatus(`Suhu dinaikkan manual: ${status.suhu.toFixed(1)}°C`);
}

function togglePendingin() {
  status.pendinginAktif = !status.pendinginAktif;
  clearInterval(interval);
  status.pendinginOtomatis = !status.pendinginOtomatis;
  logStatus(`Pendingin otomatis ${status.pendinginOtomatis ? 'dimatikan' : 'dinyalakan'} manual`);
  setTimeout(() => {
    if (!status.suhuAman){
      status.pendinginAktif = true;
      updateSuhu(status);
      logStatus('Pendingin diaktifkan otomatis karena suhu tinggi!');
    }
    else{
      startCharging();
    }
  },  500);
}
  
function logStatus(teks) {
  document.getElementById('status').textContent = `Status: ${teks}`;
}
// Fungsi untuk memulai pengisian kembali ketika suhu sudah turun
function checkTemperatureAndRestartCharging() {
  if (status.suhu <= 40 && !status.pengisianAktif) {
    logStatus('Suhu sudah aman. Pengisian siap dimulai kembali.');
    document.getElementById('startBtn').disabled = false;
  }
}

function startCharging() {
  if (!mulaiPengisian(status)) {
    alert('Tidak dapat memulai pengisian! Periksa tegangan, arus, atau suhu.');
    return;
  }
  document.getElementById('startBtn').disabled = true;
  interval = setInterval(() => {
    updateSuhu(status);
    updatePendingin(status);
    updateBaterai(status);
    if (status.pendinginOtomatis) pengaturanPendingin(status);

    status.bateraiPenuh = status.kapasitasBaterai >= 100;

    if (penghentianPengisian(status)) {
      clearInterval(interval);
      status.pengisianAktif = false;
      document.getElementById('startBtn').disabled = false;
      logStatus(
        `Pengisian berhenti`
      );
      window.mobil.stop();
      return;
    }
    
    if (keberlanjutanPengisian(status)) {
      let kenaikan = penguranganArus(status);
      status.kapasitasBaterai = Math.min(100, status.kapasitasBaterai + kenaikan);
      updateChargeBar();
      logStatus(
        `Sedang Mengisi`
      );
      window.mobil.play();
    } 
    else {
      clearInterval(interval);
      document.getElementById('startBtn').disabled = false;
      logStatus(`Pengisian selesai`);
      window.mobil.stop();
    }
  }, 1000);
}

// Periksa suhu setiap detik
setInterval(() => {
  if (status.suhu <= 40 && !status.pengisianAktif) {
    checkTemperatureAndRestartCharging();
  }
}, 1000);
