document.addEventListener("DOMContentLoaded", async () => {
  // Haritayı tanımla
  const map = L.map("harita", {
    center: [41.0082, 28.9784],
    zoom: 10,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  const subeler = {
    "Kadıköy Şubesi": [40.9919, 29.0271],
    "Tuzla Şubesi": [40.8778, 29.3045],
    "Pendik Şubesi": [40.8743, 29.2284],
    "Beylikdüzü Şubesi": [41.0014, 28.6419],
    "Başakşehir Şubesi": [41.0947, 28.8028],
    "Maltepe Şubesi": [40.9357, 29.1553],
  };

  const secilenSubeler = new Set();

  // Marker'lara seçme özelliği ekle
  Object.keys(subeler).forEach((subeAdi) => {
    const marker = L.marker(subeler[subeAdi])
      .addTo(map)
      .bindPopup(
        `<b>${subeAdi}</b><br>
        <button class="popup-button" onclick="subeSec('${subeAdi}')">Seç</button>`
      );

    marker.on("click", () => {
      if (secilenSubeler.has(subeAdi)) {
        secilenSubeler.delete(subeAdi);
        marker.setOpacity(1); // Marker eski opaklığa döner
      } else {
        secilenSubeler.add(subeAdi);
        marker.setOpacity(0.5); // Marker seçildiğinde yarı saydam olur
      }
      secimGuncelle();
    });
  });

  // Şube seçimi güncelleme fonksiyonu
  function secimGuncelle() {
    const secimListesi = document.getElementById("secilenSubeListesi");
    secimListesi.innerHTML = "";
    secilenSubeler.forEach((sube) => {
      const li = document.createElement("li");
      li.textContent = sube;
      li.classList.add("selected-sube-item"); // Estetik için class eklenir
      secimListesi.appendChild(li);
    });
  }

  // Yıl ve periyot seçeneklerini yükle
  async function secenekleriYukle() {
    try {
      // Yılları Yükle
      const yilCevap = await fetch("/api/yillar");
      const yillar = await yilCevap.json();

      const yilSecimi = document.getElementById("yilSecimi");
      yilSecimi.innerHTML = `<option value="" disabled selected hidden>Yıl Seç</option>`;
      yillar.forEach((yil) => {
        const option = document.createElement("option");
        option.value = yil;
        option.textContent = yil;
        yilSecimi.appendChild(option);
      });

      // Periyot seçeneklerini yükle
      const periyotSecimi = document.getElementById("periyotSecimi");
      periyotSecimi.innerHTML = `
        <option value="" disabled selected hidden>Periyot Seç</option>
        <option value="ilk6">İlk 6 Ay</option>
        <option value="son6">Son 6 Ay</option>
      `;
    } catch (error) {
      console.error("Seçenekler yüklenirken hata oluştu:", error);
    }
  }

  // Grafik Güncelleme
  async function grafikGuncelle(veri) {
    const ctx = document.getElementById("karsilastirmaGrafik").getContext("2d");

    if (window.sonGrafik) {
      window.sonGrafik.destroy();
    }

    const numberFormatter = new Intl.NumberFormat("tr-TR"); // Türkçe formatlama

    window.sonGrafik = new Chart(ctx, {
      type: "bar",
      data: {
        labels: veri.map((item) => item.sube),
        datasets: [
          {
            label: "Gelir (TL)",
            data: veri.map((item) => item.gelir),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
          {
            label: "Gider (TL)",
            data: veri.map((item) => item.gider),
            backgroundColor: "rgba(255, 99, 132, 0.6)",
          },
          {
            label: "Kar (TL)",
            data: veri.map((item) => item.kar),
            backgroundColor: "rgba(54, 162, 235, 0.6)",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
          datalabels: {
            anchor: "end",
            align: "top",
            color: "#000",
            font: {
              weight: "bold",
              size: 12,
            },
            formatter: (value) => `${numberFormatter.format(value)} TL`,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
      plugins: [ChartDataLabels],
    });
  }

  // Karşılaştırma
  document.getElementById("karsilastirButonu").addEventListener("click", async () => {
    const yil = document.getElementById("yilSecimi").value;
    const periyot = document.getElementById("periyotSecimi").value;

    if (!yil || !periyot || secilenSubeler.size === 0) {
      alert("Lütfen yıl, periyot seçin ve en az bir şube seçin!");
      return;
    }

    try {
      const response = await fetch("/api/karsilastir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sorguTipi: "periyot",
          secilenDeger: `${yil}-${periyot}`,
          subeler: Array.from(secilenSubeler),
        }),
      });

      const veri = await response.json();

      if (veri.message) {
        alert(veri.message);
        return;
      }

      grafikGuncelle(veri);
    } catch (error) {
      console.error("Karşılaştırma sırasında hata oluştu:", error);
    }
  });

  // Başlangıçta yıl ve periyot seçeneklerini yükle
  secenekleriYukle();
});

// Çıkış
document.getElementById("logoutButton").addEventListener("click", async (event) => {
  event.preventDefault();
  try {
    const response = await fetch("/logout", { method: "POST" });
    if (response.ok) {
      window.location.href = "login.html";
    } else {
      alert("Çıkış işlemi sırasında bir hata oluştu.");
    }
  } catch (error) {
    console.error("Çıkış işlemi hatası:", error);
  }
});
