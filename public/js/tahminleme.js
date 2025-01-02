document.addEventListener("DOMContentLoaded", async () => {
  const subeListesi = document.getElementById("subeListesi");
  const percentInput = document.getElementById("percentInput");
  const tahminleButton = document.getElementById("tahminleButton");
  const gelirGiderKarGrafikCanvas = document.getElementById("gelirGiderKarGrafik");
  let grafikInstance = null; // Chart.js grafiğini takip etmek için bir değişken

  let selectedSubeler = [];

  // Şubeleri yükle ve buton olarak oluştur
  const loadSubeler = async () => {
    try {
      const response = await fetch("/api/subeler");
      if (!response.ok) throw new Error("Şubeler yüklenirken bir hata oluştu.");
      const subeler = await response.json();

      subeler.forEach((sube) => {
        const button = document.createElement("button");
        button.textContent = sube.sube_adi;
        button.classList.add("sube-button");

        button.addEventListener("click", () => {
          if (selectedSubeler.includes(sube)) {
            selectedSubeler = selectedSubeler.filter((s) => s.sube_id !== sube.sube_id);
            button.classList.remove("selected");
          } else {
            selectedSubeler.push(sube);
            button.classList.add("selected");
          }
        });

        subeListesi.appendChild(button);
      });
    } catch (error) {
      console.error(error);
      alert("Şubeler yüklenirken bir hata oluştu.");
    }
  };

  // Eski grafiği temizleme fonksiyonu
  const clearGrafik = () => {
    if (grafikInstance) {
      grafikInstance.destroy(); // Mevcut grafiği kaldır
      grafikInstance = null; // Değeri sıfırla
    }
  };

  // Grafik oluşturma fonksiyonu
  const createGrafik = (data) => {
    clearGrafik(); // Yeni grafik oluşturmadan önce eskiyi temizle

    const labels = data.map((item) => {
      const sube = selectedSubeler.find((s) => s.sube_id === item.sube_id);
      return sube ? sube.sube_adi : `Şube ${item.sube_id}`;
    });
    const gelirler = data.map((item) => item.gelir);
    const giderler = data.map((item) => item.gider);
    const karlar = data.map((item) => item.kar);

    const numberFormatter = new Intl.NumberFormat("tr-TR"); // Türkçe formatlama

    grafikInstance = new Chart(gelirGiderKarGrafikCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Gelir",
            data: gelirler,
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
          {
            label: "Gider",
            data: giderler,
            backgroundColor: "rgba(255, 99, 132, 0.6)",
          },
          {
            label: "Kar",
            data: karlar,
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
            formatter: (value) => `${numberFormatter.format(value)} TL`, // Türkçe format
          },
          tooltip: {
            callbacks: {
              label: (tooltipItem) => {
                return `${tooltipItem.dataset.label}: ${numberFormatter.format(tooltipItem.raw)} TL`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
      plugins: [ChartDataLabels], // Veri etiketleri eklentisi
    });
  };

  // Tahminleme işlemi
  tahminleButton.addEventListener("click", async () => {
    const percentIncrease = percentInput.value;
    if (selectedSubeler.length === 0 || !percentIncrease) {
      alert("Lütfen şube(ler) seçin ve kargo artış yüzdesi girin!");
      return;
    }

    try {
      const response = await fetch("/api/tahminleme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sube_ids: selectedSubeler.map((s) => s.sube_id),
          percent_increase: parseFloat(percentIncrease),
        }),
      });

      if (!response.ok) throw new Error("Tahminleme isteği başarısız oldu.");
      const data = await response.json();

      // Grafik oluştur
      createGrafik(data);
    } catch (error) {
      console.error(error);
      alert("Tahminleme sırasında bir hata oluştu.");
    }
  });

  loadSubeler();
});
