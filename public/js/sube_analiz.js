document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subeId = urlParams.get("sube_id");

    if (!subeId) {
        alert("Şube ID bulunamadı. Lütfen geçerli bir şube seçin.");
        return;
    }

    try {
        const response = await fetch(`/api/sube_analiz?sube_id=${subeId}`);

        if (!response.ok) {
            throw new Error("Analiz verileri alınamadı.");
        }

        const data = await response.json();
        displaySubeData(data);
    } catch (error) {
        console.error("Şube analiz verileri alınırken hata oluştu:", error);
        alert("Şube analiz verileri alınamadı. Lütfen tekrar deneyin.");
    }
});

function displaySubeData(data) {
    // Şube başlığını güncelle
    document.getElementById("subeBaslik").textContent = `${data.sube_adi} Analizi`;

    // Kutucukları güncelle
    document.getElementById("yillikToplamKargo").textContent = formatNumber(data.yillik_toplam_kargo);
    document.getElementById("toplamPersonel").textContent = formatNumber(data.toplam_personel);
    document.getElementById("yillikPersonelGideri").textContent = `${formatNumber(data.toplam_personel_gideri)} TL`;
    document.getElementById("yillikKiraTutari").textContent = `${formatNumber(data.toplam_kira)} TL`;
    document.getElementById("yillikKargoGeliri").textContent = `${formatNumber(data.toplam_kargo_geliri)} TL`;
    document.getElementById("yillikKargoMaliyeti").textContent = `${formatNumber(data.toplam_kargo_maliyeti)} TL`;
    document.getElementById("yillikKargoKari").textContent = `${formatNumber(data.toplam_kargo_kari)} TL`;
    document.getElementById("yillikToplamGider").textContent = `${formatNumber(data.toplam_gider)} TL`;

    // Pasta grafik için en çok kargo veren müşterileri kullan
    createPieChart(data.top_musteriler);

    // Çubuk grafik için yıllık gelir-gider-kar verilerini kullan
    createBarChart(data.yillik_gelir_gider_kar);

    // Son 20 kargo tablosunu doldur
    fillLastCargoTable(data.son_kargolar);
}

// Sayıları Türkçe formatlama
function formatNumber(num) {
    return num.toLocaleString("tr-TR"); // Türkçe format
}

// Pasta Grafik Oluşturma
function createPieChart(topMusteriler) {
    const ctx = document.getElementById("pastaGrafik").getContext("2d");

    const labels = topMusteriler.map((musteri) => `${musteri.musteri_adi} ${musteri.musteri_soyadi}`);
    const data = topMusteriler.map((musteri) => musteri.kargo_sayisi);

    const numberFormatter = new Intl.NumberFormat("tr-TR"); // Türkçe formatlama

    new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [
                {
                    data,
                    backgroundColor: [
                        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
                        "#FF9F40", "#66CC99", "#FF6666", "#66CCCC", "#CCCC66"
                    ],
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        font: {
                            size: 14,
                        },
                    },
                },
                datalabels: {
                    anchor: "center",
                    align: "center",
                    color: "#fff",
                    font: {
                        weight: "bold",
                        size: 14,
                    },
                    formatter: (value) => `${numberFormatter.format(value)} kargo`, // Türkçe format
                },
            },
        },
        plugins: [ChartDataLabels], // Veri etiketleri eklentisi
    });
}

// Çubuk Grafik Oluşturma (Renkler Güncellendi)
function createBarChart(yillikGelirGiderKar) {
    const ctx = document.getElementById("cizgiGrafik").getContext("2d");

    const labels = yillikGelirGiderKar.map((item) => item.yil);
    const gelir = yillikGelirGiderKar.map((item) => item.toplam_gelir);
    const gider = yillikGelirGiderKar.map((item) => item.toplam_gider);
    const kar = yillikGelirGiderKar.map((item) => item.toplam_kar);

    const numberFormatter = new Intl.NumberFormat("tr-TR"); // Türkçe formatlama

    new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Gelir (TL)",
                    data: gelir,
                    backgroundColor: "#1E88E5", // Yeni renk: Mavi
                },
                {
                    label: "Gider (TL)",
                    data: gider,
                    backgroundColor: "#E53935", // Yeni renk: Kırmızı
                },
                {
                    label: "Kar (TL)",
                    data: kar,
                    backgroundColor: "#43A047", // Yeni renk: Yeşil
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
            },
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        },
        plugins: [ChartDataLabels], // Veri etiketleri eklentisi
    });
}

// Son 20 Kargo Tablosunu Doldurma
function fillLastCargoTable(sonKargolar) {
    const tableBody = document.getElementById("sonKargolarBody");
    tableBody.innerHTML = ""; // Eski verileri temizle

    sonKargolar.forEach((kargo) => {
        const row = `
            <tr>
                <td>${kargo.kargo_tarih}</td>
                <td>${kargo.kargo_tipi_adi}</td>
                <td>${formatNumber(kargo.ucret)} TL</td>
                <td>${formatNumber(kargo.maliyet)} TL</td>
                <td>${kargo.sube_adi}</td>
            </tr>
        `;
        tableBody.insertAdjacentHTML("beforeend", row);
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
