document.addEventListener("DOMContentLoaded", async () => {
    const subeButtonsContainer = document.getElementById("sube-buttons");
    const raporKutulariContainer = document.getElementById("rapor-kutulari");
    const raporlaButton = document.getElementById("raporla-button");

    let selectedSubeler = [];

    // Veritabanından şube verilerini çekme
    const fetchSubeler = async () => {
        try {
            const response = await fetch("/api/subeler");
            const subeler = await response.json();
            return subeler;
        } catch (error) {
            console.error("Şubeler alınırken hata oluştu:", error);
            return [];
        }
    };

    // Şube butonlarını oluşturma
    const createSubeButtons = async () => {
        const subeler = await fetchSubeler();
        subeler.forEach((sube) => {
            const button = document.createElement("button");
            button.textContent = sube.sube_adi;
            button.classList.add("sube-button");
            button.addEventListener("click", () => toggleSubeSelection(sube.sube_id, button));
            subeButtonsContainer.appendChild(button);
        });
    };

    // Şube seçimlerini yönetme
    const toggleSubeSelection = (subeId, button) => {
        if (selectedSubeler.includes(subeId)) {
            selectedSubeler = selectedSubeler.filter((id) => id !== subeId);
            button.classList.remove("active");
        } else {
            selectedSubeler.push(subeId);
            button.classList.add("active");
        }
    };

    // Seçilen şubeler için raporları getir
    const fetchSubeRapor = async () => {
        raporKutulariContainer.innerHTML = ""; // Önceki kutuları temizle
        for (const subeId of selectedSubeler) {
            try {
                const response = await fetch(`/api/raporlama?sube_id=${subeId}`);
                const data = await response.json();

                const kutu = document.createElement("div");
                kutu.classList.add("rapor-kutusu");

                kutu.innerHTML = `
                    <h3>${data.sube_adi}</h3>
                    <p><strong>Gelir:</strong> ${data.gelir} TL</p>
                    <p><strong>Gider:</strong> ${data.gider} TL</p>
                    <p><strong>Kâr:</strong> ${data.kar} TL</p>
                    <p><strong>En Verimli Çalışan:</strong> ${data.verimli_calisan}</p>
                    <p><strong>En Verimsiz Çalışan:</strong> ${data.verimsiz_calisan}</p>
                    <p><strong>Durum:</strong> ${data.durum}</p>
                `;

                raporKutulariContainer.appendChild(kutu);
            } catch (error) {
                console.error("Şube raporu alınırken hata oluştu:", error);
            }
        }
    };

    // "Raporla" butonuna tıklama olayı
    raporlaButton.addEventListener("click", fetchSubeRapor);

    createSubeButtons();
});
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