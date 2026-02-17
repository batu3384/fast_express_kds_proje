

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
