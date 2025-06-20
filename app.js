let status = {
    // tegangan: true,
    // arus: true,
    powerAman: false,
    suhuAman: true,
    bateraiPenuh: false,
    pendinginAktif: false,
    pendinginOtomatis: true,
    pengisianAktif: true,
    kapasitasBaterai: 0,
    suhu: 25,
  };

let chargingActive = false;
let interval;
const overheatLevel = 50;

function mulaiPengisian(status) {
  return status.powerAman && status.suhuAman && !status.bateraiPenuh;
}

function penghentianPengisian(status) {
  return status.bateraiPenuh || !status.suhuAman || !status.powerAman;
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
      logStatus('Pendingin diaktifkan');
    }
  } else if (status.suhu <= 35) {
    if (status.pendinginAktif) {
      status.pendinginAktif = false;
      if (!status.pendinginAktif && window.kipas){
        window.kipas.stop();
        updatePendingin(status);
      }
      logStatus('Pendingin dimatikan');
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

function pengaturanPower(status){
  status.powerAman = true;
  document.getElementById('power').textContent = `Aktif`;
}

function nyalakanPower(){
  pengaturanPower(status);
}

function updateSuhu(status) {
  if (status.pengisianAktif) {
    status.suhu += Math.random() * 0.5; // Naik sedikit saat mengisi
  }
  
  if (status.pendinginAktif) {
    if (status.suhu >= 50) {
      status.suhu -= 2; // Pendingin lebih kuat saat suhu sangat tinggi
    } else {
      status.suhu -= 1; // Normal cooling
    }
  } 
  else if (!status.pengisianAktif) {
    status.suhu -= 1; // Perlahan turun meski tidak ada pendingin
  }
  
  // Batasi suhu di antara 25°C - 100°C
  status.suhu = Math.max(25, Math.min(status.suhu, 50));
  
  status.suhuAman = status.suhu <= overheatLevel;

  document.getElementById('thermo').textContent = ` ${status.suhu.toFixed(1)}°C`;
  
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
  document.getElementById('statusBaterai').textContent = `${status.kapasitasBaterai}%`;
}

function updatePendingin(status){
  if(status.pendinginAktif){
    document.getElementById('cooler').textContent = `Aktif`;
  }
  else{
    document.getElementById('cooler').textContent = `-`;
  }
}

function naikkanSuhu() {
  status.suhu += 3;
  if (status.suhu > 100) status.suhu = 100;
  status.suhuAman = status.suhu <= overheatLevel;
  document.getElementById('thermo').textContent = `${status.suhu.toFixed(1)}°C`;
  logStatus(`Suhu dinaikkan`);
}

function logStatus(teks) {
  document.getElementById('status').textContent = `${teks}`;
}

function toggleCharging() {
  const button = document.getElementById('startBtn');

  if (!chargingActive) {
    // Coba mulai pengisian
    if (!mulaiPengisian(status)) {
      logStatus(`Tidak dapat memulai`);
      return;
    }

    chargingActive = true;
    status.pengisianAktif = true;
    button.textContent = 'Stop';

    interval = setInterval(() => {
      updateSuhu(status);
      updatePendingin(status);
      updateBaterai(status);
      if (status.pendinginOtomatis) pengaturanPendingin(status);

      status.bateraiPenuh = status.kapasitasBaterai >= 100;

      if (penghentianPengisian(status)) {
        clearInterval(interval);
        chargingActive = false;
        status.pengisianAktif = false;
        status.pendinginAktif = false;
        button.textContent = 'Start';
        document.getElementById('cooler').textContent = `-`;
        logStatus(status.bateraiPenuh ? `Pengisian Selesai` : `Pengisian berhenti`);
        window.mobil?.stop();
        window.kipas?.stop();
        document.getElementById('power').textContent = `-`;
        return;
      }
      
      if (keberlanjutanPengisian(status)) {
        let kenaikan = penguranganArus(status);
        status.kapasitasBaterai = Math.min(100, status.kapasitasBaterai + kenaikan);
        updateChargeBar();
        logStatus(`Sedang Mengisi`);
        window.mobil?.play();
        document.getElementById('power').textContent = `Aktif`;
      } else {
        clearInterval(interval);
        chargingActive = false;
        status.pengisianAktif = false;
        button.textContent = 'Start';
        logStatus(`Pengisian selesai`);
        window.mobil?.stop();
        window.kipas?.stop();
      }
    }, 1000);
    
  } else {
    // Hentikan pengisian manual
    clearInterval(interval);
    chargingActive = false;
    status.pengisianAktif = false;
    status.pendinginAktif = false;
    button.textContent = 'Start';
    document.getElementById('cooler').textContent = `-`;
    document.getElementById('power').textContent = `-`;
    logStatus(`Pengisian berhenti`);
    window.mobil?.stop();
    window.kipas?.stop();
  }
}



