document.addEventListener("DOMContentLoaded", async () => {
  try {
      const response = await fetch("/api/anasayfa");
      if (!response.ok) {
          throw new Error("Anasayfa verileri alınamadı.");
      }

      const data = await response.json();

      // Sayıları formatlamak için Intl.NumberFormat kullanımı
      const numberFormatter = new Intl.NumberFormat("tr-TR"); // Türkçe format için

      // Kutucuklara verileri ekleme
      const toplamSubeCard = document.getElementById("toplamSube");
      toplamSubeCard.textContent = `Toplam Şube Sayısı: ${numberFormatter.format(data.kutucukVerileri.toplam_sube || 0)}`;

      const yillikToplamKargoCard = document.getElementById("yillikToplamKargo");
      yillikToplamKargoCard.textContent = `Yıllık Toplam Kargo Sayısı: ${numberFormatter.format(data.kutucukVerileri.yillik_toplam_kargo || 0)}`;

      const yillikPersonelGiderCard = document.getElementById("yillikPersonelGider");
      yillikPersonelGiderCard.textContent = `Yıllık Personel Gideri: ${numberFormatter.format(data.kutucukVerileri.yillik_personel_gider || 0)} TL`;

      const yillikToplamKiraCard = document.getElementById("yillikToplamKira");
      yillikToplamKiraCard.textContent = `Yıllık Kira Tutarı: ${numberFormatter.format(data.kutucukVerileri.yillik_toplam_kira || 0)} TL`;

      const yillikToplamGelirCard = document.getElementById("yillikToplamGelir");
      yillikToplamGelirCard.textContent = `Yıllık Toplam Kargo Geliri: ${numberFormatter.format(data.kutucukVerileri.yillik_toplam_kargo_gelir || 0)} TL`;

      const yillikToplamMaliyetCard = document.getElementById("yillikToplamMaliyet");
      yillikToplamMaliyetCard.textContent = `Yıllık Toplam Kargo Maliyeti: ${numberFormatter.format(data.kutucukVerileri.yillik_toplam_kargo_maliyet || 0)} TL`;

      const yillikToplamKariCard = document.getElementById("yillikToplamKari");
      yillikToplamKariCard.textContent = `Yıllık Toplam Kargo Karı: ${numberFormatter.format(data.kutucukVerileri.yillik_toplam_kargo_kari || 0)} TL`;

      const yillikToplamGiderCard = document.getElementById("yillikToplamGider");
      yillikToplamGiderCard.textContent = `Yıllık Toplam Gider: ${numberFormatter.format(data.kutucukVerileri.yillik_toplam_gider || 0)} TL`;

      const teslimOraniCard = document.getElementById("teslimOrani");
      teslimOraniCard.textContent = `Teslim Edilen Kargo Oranı: ${data.kutucukVerileri.teslim_orani}%`;

      const iptalOraniCard = document.getElementById("iptalOrani");
      iptalOraniCard.textContent = `İptal Edilen Kargo Oranı: ${data.kutucukVerileri.iptal_orani}%`;

      // Gelir-Gider-Kar Çubuk Grafiği
      createBarChart(data.yillar);

      // En Çok Kargo Giden İlk 3 Şube Pasta Grafiği
      createPieChart(data.topSubeler);

      // Karşılaştırmalı Performans Tablosu
      const tableBody = document.getElementById("subePerformansTabloBody");
      data.subePerformansi.forEach((sube) => {
          const row = `
              <tr>
                  <td>${sube.sube_adi}</td>
                  <td>${numberFormatter.format(sube.toplam_kargo)}</td>
                  <td>${numberFormatter.format(sube.teslim_edilen)}</td>
                  <td>${numberFormatter.format(sube.iptal_edilen)}</td>
                  <td>${sube.basari_orani}%</td>
                  <td>${sube.hata_orani}%</td>
              </tr>
          `;
          tableBody.innerHTML += row;
      });
  } catch (error) {
      console.error("Anasayfa verileri alınırken hata oluştu:", error);
      alert("Anasayfa verileri alınamadı.");
  }
});

// Grafik Fonksiyonları
function createBarChart(yillar) {
  const ctx = document.getElementById("gelirGiderKarGrafik").getContext("2d");
  const numberFormatter = new Intl.NumberFormat("tr-TR"); // Türkçe formatlama

  new Chart(ctx, {
      type: "bar",
      data: {
          labels: yillar.map((y) => y.yil),
          datasets: [
              {
                  label: "Gelir",
                  data: yillar.map((y) => y.toplam_gelir),
                  backgroundColor: "#4CAF50",
              },
              {
                  label: "Gider",
                  data: yillar.map((y) => y.toplam_gider),
                  backgroundColor: "#FF5733",
              },
              {
                  label: "Kar",
                  data: yillar.map((y) => y.toplam_kar),
                  backgroundColor: "#2196F3",
              },
          ],
      },
      options: {
          responsive: true,
          plugins: {
              datalabels: {
                  anchor: "end",
                  align: "top",
                  color: "#000",
                  font: {
                      weight: "bold",
                      size: 12,
                  },
                  formatter: (value) => numberFormatter.format(value) + " TL", // Formatlama
              },
              legend: {
                  position: "top",
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

function createPieChart(topSubeler) {
  const ctx = document.getElementById("topSubelerGrafik").getContext("2d");
  const numberFormatter = new Intl.NumberFormat("tr-TR"); // Türkçe formatlama

  new Chart(ctx, {
      type: "pie",
      data: {
          labels: topSubeler.map((s) => s.sube_adi),
          datasets: [
              {
                  data: topSubeler.map((s) => s.toplam_kargo),
                  backgroundColor: ["#4CAF50", "#FF5733", "#2196F3"],
              },
          ],
      },
      options: {
          responsive: true,
          plugins: {
              datalabels: {
                  anchor: "center",
                  align: "center",
                  color: "#fff",
                  font: {
                      weight: "bold",
                      size: 14,
                  },
                  formatter: (value) => numberFormatter.format(value) + " kargo", // Formatlama
              },
              legend: {
                  position: "top",
              },
          },
      },
      plugins: [ChartDataLabels],
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
