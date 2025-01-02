document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/personel_analiz");

    if (!response.ok) {
      throw new Error("Personel analiz verileri alınamadı.");
    }

    const data = await response.json();

    // Kutucuklara verileri ekleme
    document.getElementById("toplamPersonel").textContent = `Toplam Personel: ${data.toplam_personel || 0}`;
    document.getElementById("ortalamaPuan").textContent = `Ortalama Puan: ${data.ortalama_puan?.toFixed(2) || 0}`;
    document.getElementById("teslimEdilenKargo").textContent = `Teslim Edilen Kargo: ${data.teslim_edilen_kargo || 0}`;
    document.getElementById("iptalEdilenKargo").textContent = `İptal Edilen Kargo: ${data.iptal_edilen_kargo || 0}`;

    // Ayın Personeli
    const ayinPersoneli = data.ayin_personeli || {};
    document.getElementById("ayinPersoneliAdi").innerText = `Ad Soyad: ${ayinPersoneli.ad_soyad || "-"}`;
    document.getElementById("ayinPersoneliPuan").innerText = `Puan: ${ayinPersoneli.personel_puan || "-"}`;
    document.getElementById("ayinPersoneliTeslim").innerText = `Teslim Edilen: ${ayinPersoneli.teslim_edilen || "-"}`;
    document.getElementById("ayinPersoneliHata").innerText = `Hatalı: ${ayinPersoneli.hatali_kargo || "-"}`;

    // Karşılaştırmalı Performans Tablosu
    const tabloBody = document.getElementById("karsilastirmaTablo").querySelector("tbody");
    tabloBody.innerHTML = ""; // Önceki verileri temizle
    data.karsilastirma.forEach((personel) => {
      const row = `
        <tr>
          <td>${personel.ad_soyad}</td>
          <td>${personel.sube_adi || "Şube Yok"}</td>
          <td>${personel.toplam_kargo}</td>
          <td>${personel.teslim_edilen}</td>
          <td>${personel.iptal_edilen}</td>
          <td>${personel.basari_orani}%</td>
          <td>${personel.hata_orani}%</td>
          <td>${personel.personel_puan}</td>
        </tr>
      `;
      tabloBody.insertAdjacentHTML("beforeend", row);
    });

    // Grafikler
    createPersonelPuanGrafik(data.karsilastirma);
    createPersonelKargoGrafik(data.karsilastirma);
  } catch (error) {
    console.error("Personel analiz verileri alınırken hata oluştu:", error);
    alert("Personel analiz verileri alınamadı.");
  }
});

// Grafik oluşturma fonksiyonları
function createPersonelPuanGrafik(karsilastirma) {
  const ctx = document.getElementById("personelPuanGrafik").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: karsilastirma.map((p) => p.ad_soyad),
      datasets: [
        {
          label: "Puan",
          data: karsilastirma.map((p) => p.personel_puan),
          backgroundColor: "#4CAF50",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        datalabels: {
          anchor: "end", // Etiket konumu
          align: "top", // Çubuğun üstünde hizalanır
          color: "#000", // Siyah yazı rengi
          font: {
            weight: "bold", // Yazı kalınlığı
            size: 12, // Yazı boyutu
          },
          formatter: (value) => value, // Etiket olarak değeri göster
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
    plugins: [ChartDataLabels], // Data Labels eklentisi
  });
}

function createPersonelKargoGrafik(karsilastirma) {
  const ctx = document.getElementById("personelKargoGrafik").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: karsilastirma.map((p) => p.ad_soyad),
      datasets: [
        {
          label: "Teslim Edilen",
          data: karsilastirma.map((p) => p.teslim_edilen),
          backgroundColor: "#4CAF50",
        },
        {
          label: "İptal Edilen",
          data: karsilastirma.map((p) => p.iptal_edilen),
          backgroundColor: "#FF5733",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        datalabels: {
          anchor: "end", // Etiket konumu
          align: "top", // Dikey merkezleme
          color: "#000", // Beyaz yazı rengi
          font: {
            weight: "bold", // Yazı kalınlığı
            size: 12, // Yazı boyutu
          },
          formatter: (value) => value, // Etiket olarak değeri göster
        },
      },
    },
    plugins: [ChartDataLabels], // Data Labels eklentisi
  });
}

// Çıkış Yap Butonu
document.getElementById("logoutButton").addEventListener("click", async (event) => {
  event.preventDefault(); // Sayfanın yenilenmesini engeller
  try {
    const response = await fetch("/logout", { method: "POST" });
    if (response.ok) {
      window.location.href = "login.html"; // Login sayfasına yönlendirme
    } else {
      alert("Çıkış işlemi sırasında bir hata oluştu.");
    }
  } catch (error) {
    console.error("Çıkış işlemi hatası:", error);
  }
});
