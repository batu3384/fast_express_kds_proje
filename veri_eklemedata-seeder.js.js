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


// Rename verified
