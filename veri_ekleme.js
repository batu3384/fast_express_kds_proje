const mysql = require("mysql2/promise");
const { faker } = require("@faker-js/faker");
const { format, addMonths, addDays } = require("date-fns");

// Faker Türkçe yerelleştirme
faker.locale = "tr";

const connectionConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "fast_express",
};

async function veriEkle() {
  try {
    const connection = await mysql.createConnection(connectionConfig);

    // 1. Şube ID'lerini ve bağlı İlçe ID'lerini Al
    const [subeler] = await connection.execute("SELECT sube_id, ilce_id FROM subeler");
    const subeIlceMap = subeler.reduce((map, row) => {
      map[row.sube_id] = row.ilce_id;
      return map;
    }, {});

    console.log("Şube ve bağlı ilçe ID'leri:", subeIlceMap);

    // 2. Türk Müşteri Verilerini Eklemek
    console.log("Türk müşteri verileri ekleniyor...");
    const musteriSayisi = 300;
    const musteriIds = [];

    for (let i = 0; i < musteriSayisi; i++) {
      const musteriAdi = faker.person.firstName();
      const musteriSoyadi = faker.person.lastName();
      const musteriTelefon = faker.phone.number("5#########");

      // Rastgele bir şube seç ve ilgili ilçe bilgilerini al
      const randomSube = subeler[Math.floor(Math.random() * subeler.length)];
      const subeId = randomSube.sube_id;
      const ilceId = randomSube.ilce_id;

      const [result] = await connection.execute(
        `INSERT INTO musteriler (musteri_adi, musteri_soyadi, musteri_telefon, sube_id, ilce_id)
         VALUES (?, ?, ?, ?, ?)`,
        [musteriAdi, musteriSoyadi, musteriTelefon, subeId, ilceId]
      );
      musteriIds.push({ musteriId: result.insertId, subeId });
    }
    console.log(`${musteriSayisi} Türk müşteri başarıyla eklendi.`);

    // 3. Personel ID'lerini Al
    const [personeller] = await connection.execute("SELECT personel_id, sube_id FROM personel");
    const personelIds = personeller.map((personel) => ({
      personelId: personel.personel_id,
      subeId: personel.sube_id,
    }));

    // 4. Personel Gider Verisi Eklemek
    console.log("Personel gider verileri ekleniyor...");
    const baslangicTarihi = new Date(2023, 0, 1);
    const simdikiTarih = new Date();

    for (const { personelId } of personelIds) {
      let tarih = new Date(baslangicTarihi);

      while (tarih <= simdikiTarih) {
        const tarihFormatli = format(tarih, "yyyy-MM-dd");
        const maasTutari = Math.floor(Math.random() * 10000) + 25000; // En az 25.000 TL
        const ekMesaiUcreti = Math.floor(Math.random() * 5000); // En fazla 5.000 TL

        await connection.execute(
          `INSERT INTO personel_gider (personel_id, odeme_tarihi, maas_tutari, ek_mesai_ucreti)
           VALUES (?, ?, ?, ?)`,
          [personelId, tarihFormatli, maasTutari, ekMesaiUcreti]
        );

        // Bir sonraki aya geç
        tarih = addMonths(tarih, 1);
      }
    }
    console.log("Personel gider verileri başarıyla eklendi.");

    // 5. Kargo Verisi Eklemek
    console.log("Kargo verileri ekleniyor...");
    const kargoTipleri = ["Standart", "Express", "Ağır Kargo", "Hassas Kargo", "Soğuk Zincir"];

    for (const { personelId, subeId: personelSubeId } of personelIds) {
      let tarih = new Date(baslangicTarihi);

      while (tarih <= simdikiTarih) {
        const tarihFormatli = format(tarih, "yyyy-MM-dd");

        // Günlük 15-20 başarılı kargo ekle
        const basariliKargoSayisi = Math.floor(Math.random() * 6) + 15;
        for (let i = 0; i < basariliKargoSayisi; i++) {
          const uygunMusteriler = musteriIds.filter((m) => m.subeId === personelSubeId);
          if (uygunMusteriler.length === 0) continue; // Şube uyumu kontrolü

          const randomMusteri = uygunMusteriler[Math.floor(Math.random() * uygunMusteriler.length)];
          const kargoTipi = Math.floor(Math.random() * kargoTipleri.length) + 1;

          await connection.execute(
            `INSERT INTO kargo (kargo_tipi_id, kargo_tarih, personel_id, musteri_id, durum)
             VALUES (?, ?, ?, ?, ?)`,
            [kargoTipi, tarihFormatli, personelId, randomMusteri.musteriId, "teslim_edildi"]
          );
        }

        // Günlük 1-5 başarısız/iptal edilen kargo ekle
        const hataliKargoSayisi = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < hataliKargoSayisi; i++) {
          const uygunMusteriler = musteriIds.filter((m) => m.subeId === personelSubeId);
          if (uygunMusteriler.length === 0) continue; // Şube uyumu kontrolü

          const randomMusteri = uygunMusteriler[Math.floor(Math.random() * uygunMusteriler.length)];
          const kargoTipi = Math.floor(Math.random() * kargoTipleri.length) + 1;
          const durum = Math.random() > 0.5 ? "iptal_edildi" : "teslim_edilemedi";

          await connection.execute(
            `INSERT INTO kargo (kargo_tipi_id, kargo_tarih, personel_id, musteri_id, durum)
             VALUES (?, ?, ?, ?, ?)`,
            [kargoTipi, tarihFormatli, personelId, randomMusteri.musteriId, durum]
          );
        }

        // Tarihi bir gün ilerlet
        tarih = addDays(tarih, 1);
      }
    }
    console.log("Tüm kargo verileri başarıyla eklendi.");

    await connection.end();
  } catch (error) {
    console.error("Hata oluştu:", error);
  }
}

veriEkle();
