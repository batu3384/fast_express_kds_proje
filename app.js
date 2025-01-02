const axios = require("axios");
const express = require("express");
const mysql = require("mysql2/promise");
const cron = require("node-cron");
const path = require("path");
const session = require("express-session");
require("dotenv").config();
const bcrypt = require("bcrypt");
const { SLR } = require("ml-regression"); // Doğru sınıfın import edilmesi



const app = express();
const port = 3000;


// Oturum Yönetimi
app.use(session({
  secret: "fast_express_secret_key", // Rastgele bir gizli anahtar
  resave: false, // Değişiklik olmadığında oturumu yeniden kaydetme
  saveUninitialized: false, // Başlatılmamış oturumları kaydetme
  cookie: { 
      maxAge: 3600000, // 1 saatlik oturum süresi
      httpOnly: true, // Çerezlerin istemci tarafında okunmasını engeller
      secure: false // Eğer HTTPS kullanıyorsanız true yapabilirsiniz
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// MySQL Bağlantısı
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
async function hashExistingPasswords() {
  try {
      const [users] = await pool.query("SELECT kullanici_id, sifre FROM kullanicilar");

      for (const user of users) {
          const { kullanici_id, sifre } = user;

          // Şifre zaten hashlenmiş mi kontrol et
          if (sifre.startsWith("$2b$")) {
              console.log(`Kullanıcı ID ${kullanici_id}: Şifre zaten hashlenmiş, atlanıyor.`);
              continue;
          }

          // Şifreyi bcrypt ile hashle
          const hashedPassword = await bcrypt.hash(sifre, 10);

          // Veritabanında şifreyi güncelle
          await pool.query("UPDATE kullanicilar SET sifre = ? WHERE kullanici_id = ?", [hashedPassword, kullanici_id]);

          console.log(`Kullanıcı ID ${kullanici_id}: Şifre başarıyla hashlenip güncellendi.`);
      }

      console.log("Tüm şifreler başarıyla hashlenip güncellendi.");
  } catch (error) {
      console.error("Şifre hashleme sırasında hata oluştu:", error);
  }
}

hashExistingPasswords();

// Login API
app.post("/login", async (req, res) => {
  const { kullanici_adi, sifre } = req.body;

  if (!kullanici_adi || !sifre) {
      return res.status(400).json({ message: "Kullanıcı adı ve şifre gerekli." });
  }

  try {
      // Kullanıcıyı veritabanından bul
      const [rows] = await pool.query("SELECT * FROM kullanicilar WHERE kullanici_adi = ?", [kullanici_adi]);

      if (rows.length === 0) {
          return res.status(401).json({ message: "Geçersiz kullanıcı adı veya şifre." });
      }

      const kullanici = rows[0];

      // Şifreyi doğrula
      const isPasswordMatch = await bcrypt.compare(sifre, kullanici.sifre);

      if (!isPasswordMatch) {
          return res.status(401).json({ message: "Geçersiz kullanıcı adı veya şifre." });
      }

      // Oturumu başlat
      req.session.kullanici = { id: kullanici.kullanici_id, kullanici_adi: kullanici.kullanici_adi };
      res.json({ message: "Giriş başarılı!" });
  } catch (error) {
      console.error("Login hatası:", error);
      res.status(500).json({ message: "Sunucu hatası." });
  }
});



// Login Kontrol Middleware
function loginRequired(req, res, next) {
  console.log("Middleware kontrol ediliyor, oturum bilgisi:", req.session.kullanici);
  if (!req.session || !req.session.kullanici) {
      console.log("Giriş yapılmamış, login.html sayfasına yönlendiriliyor.");
      return res.redirect("/login.html");
  }
  console.log("Kullanıcı oturumu geçerli:", req.session.kullanici);
  next(); // Eğer giriş yapılmışsa sonraki adıma geç
}



// Örnek: Korunan Bir Sayfa
app.get("/index.html", loginRequired, (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Logout API
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
      if (err) {
          console.error("Oturum silme hatası:", err);
          return res.status(500).json({ message: "Oturum kapatılamadı." });
      }

      res.clearCookie("connect.sid"); // Tarayıcıdaki oturum çerezlerini temizle
      console.log("Oturum başarıyla silindi.");
      res.json({ message: "Oturum kapatıldı." });
  });
});


app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});



app.get("/index.html", loginRequired, (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/subeler.html", loginRequired, (req, res) => {
  res.sendFile(__dirname + "/public/subeler.html");
});

app.get("/personel.html", loginRequired, (req, res) => {
  res.sendFile(__dirname + "/public/personel.html");
});

app.get("/karsilastirma.html", loginRequired, (req, res) => {
  res.sendFile(__dirname + "/public/karsilastirma.html");
});
app.get("/tahminleme.html", loginRequired, (req, res) => {
  res.sendFile(__dirname + "/public/tahminleme.html");
});
app.get("/raporlama.html", loginRequired, (req, res) => {
  res.sendFile(__dirname + "/public/raporlama.html");
});
















// Şube listesini getiren API
app.get("/api/subeler", async (req, res) => {
  try {
    const [subeler] = await pool.query("SELECT sube_id, sube_adi FROM subeler");
    res.json(subeler);
  } catch (error) {
    console.error("Şubeler alınırken hata oluştu:", error);
    res.status(500).json({ error: "Şubeler alınamadı. Sunucuda bir hata oluştu." });
  }
});

// Şube analiz API
app.get("/api/sube_analiz", async (req, res) => {
  const subeId = req.query.sube_id;

  if (!subeId) {
    return res.status(400).json({ error: "Şube ID gerekli." });
  }

  try {
    // Şube bilgileri
    const [subeBilgi] = await pool.query(
      "SELECT sube_adi, kira_fiyati FROM subeler WHERE sube_id = ?",
      [subeId]
    );

    if (subeBilgi.length === 0) {
      return res.status(404).json({ error: "Şube bulunamadı." });
    }

    const subeAdi = subeBilgi[0].sube_adi;
    const aylikKiraFiyati = parseFloat(subeBilgi[0].kira_fiyati) || 0;
    const yillikKiraFiyati = aylikKiraFiyati * 12;

    // Yıllık toplam kargo
    const [yillikKargo] = await pool.query(
      `SELECT COUNT(*) AS yillik_toplam_kargo
       FROM kargo
       WHERE YEAR(kargo_tarih) = YEAR(CURDATE())
       AND personel_id IN (SELECT personel_id FROM personel WHERE sube_id = ?)`,
      [subeId]
    );

    // Toplam personel sayısı
    const [toplamPersonel] = await pool.query(
      "SELECT COUNT(*) AS toplam_personel FROM personel WHERE sube_id = ?",
      [subeId]
    );

    // Yıllık toplam personel gideri
    const [personelGideri] = await pool.query(
      `SELECT SUM(maas_tutari + ek_mesai_ucreti) AS toplam_personel_gideri
       FROM personel_gider
       WHERE YEAR(odeme_tarihi) = YEAR(CURDATE())
       AND personel_id IN (SELECT personel_id FROM personel WHERE sube_id = ?)`,
      [subeId]
    );
    const toplamPersonelGideri = parseFloat(personelGideri[0].toplam_personel_gideri) || 0;

    // Yıllık toplam kargo geliri ve maliyeti
    const [kargoGeliriMaliyeti] = await pool.query(
      `SELECT 
          SUM(kargo_tip.fiyat) AS toplam_kargo_geliri,
          SUM(kargo_tip.maliyet) AS toplam_kargo_maliyeti
       FROM kargo
       JOIN kargo_tip ON kargo.kargo_tipi_id = kargo_tip.kargo_tipi_id
       WHERE YEAR(kargo_tarih) = YEAR(CURDATE())
       AND personel_id IN (SELECT personel_id FROM personel WHERE sube_id = ?)`,
      [subeId]
    );
    const toplamKargoGeliri = parseFloat(kargoGeliriMaliyeti[0].toplam_kargo_geliri) || 0;
    const toplamKargoMaliyeti = parseFloat(kargoGeliriMaliyeti[0].toplam_kargo_maliyeti) || 0;

    // Yıllık toplam kar ve gider
    const toplamGider = toplamKargoMaliyeti + toplamPersonelGideri + yillikKiraFiyati;
    const toplamKargoKari = toplamKargoGeliri - toplamGider;

    // En çok kargo veren 10 müşteri
    const [topMusteriler] = await pool.query(
      `SELECT musteriler.musteri_adi, musteriler.musteri_soyadi, COUNT(kargo.kargo_id) AS kargo_sayisi
       FROM kargo
       JOIN musteriler ON kargo.musteri_id = musteriler.musteri_id
       WHERE kargo.personel_id IN (SELECT personel_id FROM personel WHERE sube_id = ?)
       GROUP BY musteriler.musteri_id
       ORDER BY kargo_sayisi DESC
       LIMIT 10`,
      [subeId]
    );

    // Yıllara göre gelir-gider-kar
    const [yillikGelirGiderKar] = await pool.query(
      `SELECT 
          YEAR(kargo_tarih) AS yil,
          SUM(kargo_tip.fiyat) AS toplam_gelir,
          (SUM(kargo_tip.maliyet) + ? + ?) AS toplam_gider,
          (SUM(kargo_tip.fiyat) - (SUM(kargo_tip.maliyet) + ? + ?)) AS toplam_kar
       FROM kargo
       JOIN kargo_tip ON kargo.kargo_tipi_id = kargo_tip.kargo_tipi_id
       WHERE personel_id IN (SELECT personel_id FROM personel WHERE sube_id = ?)
       GROUP BY YEAR(kargo_tarih)
       ORDER BY yil DESC`,
      [toplamPersonelGideri, yillikKiraFiyati, toplamPersonelGideri, yillikKiraFiyati, subeId]
    );

    // Son 20 kargo
    const [sonKargolar] = await pool.query(
      `SELECT kargo.kargo_tarih, kargo_tip.kargo_tipi_adi, kargo_tip.fiyat AS ucret, kargo_tip.maliyet, subeler.sube_adi
       FROM kargo
       JOIN kargo_tip ON kargo.kargo_tipi_id = kargo_tip.kargo_tipi_id
       JOIN personel ON kargo.personel_id = personel.personel_id
       JOIN subeler ON personel.sube_id = subeler.sube_id
       WHERE subeler.sube_id = ?
       ORDER BY kargo.kargo_tarih DESC
       LIMIT 20`,
      [subeId]
    );

    // Tüm verileri döndür
    res.json({
      sube_adi: subeAdi,
      yillik_toplam_kargo: yillikKargo[0].yillik_toplam_kargo || 0,
      toplam_personel: toplamPersonel[0].toplam_personel || 0,
      toplam_personel_gideri: toplamPersonelGideri,
      toplam_kira: yillikKiraFiyati,
      toplam_kargo_geliri: toplamKargoGeliri,
      toplam_kargo_maliyeti: toplamKargoMaliyeti,
      toplam_kargo_kari: toplamKargoKari,
      toplam_gider: toplamGider,
      top_musteriler: topMusteriler,
      yillik_gelir_gider_kar: yillikGelirGiderKar,
      son_kargolar: sonKargolar,
    });
  } catch (error) {
    console.error("Şube analiz verileri alınırken hata oluştu:", error);
    res.status(500).json({ error: "Şube analiz verileri alınamadı." });
  }
});



// Personel listesi API'si
app.get("/api/personel", async (req, res) => {
  try {
    const [personelVerileri] = await pool.query(
      `SELECT 
          p.personel_id,
          CONCAT(p.personel_adi, ' ', p.personel_soyad) AS ad_soyad,
          s.sube_adi,
          COUNT(k.kargo_id) AS toplam_kargo,
          SUM(CASE WHEN k.durum = 'teslim_edildi' THEN 10 ELSE 0 END) -
          SUM(CASE WHEN k.durum = 'iptal_edildi' OR k.durum = 'teslim_edilemedi' THEN 5 ELSE 0 END) AS personel_puan,
          SUM(CASE WHEN k.durum = 'teslim_edildi' THEN 1 ELSE 0 END) AS teslim_edilen,
          SUM(CASE WHEN k.durum = 'iptal_edildi' OR k.durum = 'teslim_edilemedi' THEN 1 ELSE 0 END) AS iptal_edilen
       FROM personel AS p
       LEFT JOIN kargo AS k ON p.personel_id = k.personel_id
       LEFT JOIN subeler AS s ON p.sube_id = s.sube_id
       GROUP BY p.personel_id
       ORDER BY personel_puan DESC`
    );

    res.json(personelVerileri);
  } catch (error) {
    console.error("Personel verileri alınırken hata oluştu:", error);
    res.status(500).json({ error: "Personel verileri alınamadı." });
  }
});

// Günlük puan güncelleyici cron job
cron.schedule("0 0 * * *", async () => {
  console.log("Personel puanları güncelleniyor...");

  try {
    await pool.query(`
      UPDATE personel AS p
      LEFT JOIN (
          SELECT 
              k.personel_id,
              SUM(CASE WHEN k.durum = 'teslim_edildi' THEN 10 ELSE 0 END) -
              SUM(CASE WHEN k.durum = 'iptal_edildi' OR k.durum = 'teslim_edilemedi' THEN 5 ELSE 0 END) AS hesaplanan_puan
          FROM kargo AS k
          WHERE MONTH(k.kargo_tarih) = MONTH(CURDATE()) AND YEAR(k.kargo_tarih) = YEAR(CURDATE())
          GROUP BY k.personel_id
      ) AS puanlama ON p.personel_id = puanlama.personel_id
      SET p.personel_puan = COALESCE(puanlama.hesaplanan_puan, 0);
    `);

    console.log("Personel puanları başarıyla güncellendi.");
  } catch (error) {
    console.error("Personel puanları güncellenirken hata oluştu:", error);
  }
});

// Ayın personeli ve karşılaştırmalı performans analizi API'si
app.get("/api/personel_analiz", async (req, res) => {
  try {
    // Toplam Personel
    const [toplamPersonelData] = await pool.query(`
      SELECT COUNT(*) AS toplam_personel FROM personel
    `);
    const toplamPersonel = toplamPersonelData[0]?.toplam_personel || 0;

    // Ortalama Puan
    const [ortalamaPuanData] = await pool.query(`
      SELECT COALESCE(AVG(p.personel_puan), 0) AS ortalama_puan
      FROM personel AS p
    `);
    const ortalamaPuan = parseFloat(ortalamaPuanData[0]?.ortalama_puan);

    // Teslim Edilen Kargo
    const [teslimEdilenData] = await pool.query(`
      SELECT COUNT(*) AS teslim_edilen
      FROM kargo AS k
      WHERE k.durum = 'teslim_edildi'
        AND MONTH(k.kargo_tarih) = MONTH(CURDATE())
        AND YEAR(k.kargo_tarih) = YEAR(CURDATE())
    `);
    const teslimEdilenKargo = teslimEdilenData[0]?.teslim_edilen || 0;

    // İptal Edilen Kargo
    const [iptalEdilenData] = await pool.query(`
      SELECT COUNT(*) AS iptal_edilen
      FROM kargo AS k
      WHERE (k.durum = 'iptal_edildi' OR k.durum = 'teslim_edilemedi')
        AND MONTH(k.kargo_tarih) = MONTH(CURDATE())
        AND YEAR(k.kargo_tarih) = YEAR(CURDATE())
    `);
    const iptalEdilenKargo = iptalEdilenData[0]?.iptal_edilen || 0;

    // Ayın Personeli
    const [ayinPersoneliData] = await pool.query(`
      SELECT 
        p.personel_id,
        CONCAT(p.personel_adi, ' ', p.personel_soyad) AS ad_soyad,
        p.personel_puan,
        COUNT(k.kargo_id) AS toplam_kargo,
        SUM(CASE WHEN k.durum = 'teslim_edildi' THEN 1 ELSE 0 END) AS teslim_edilen,
        SUM(CASE WHEN k.durum = 'iptal_edildi' OR k.durum = 'teslim_edilemedi' THEN 1 ELSE 0 END) AS hatali_kargo
      FROM personel AS p
      LEFT JOIN kargo AS k ON p.personel_id = k.personel_id
      WHERE MONTH(k.kargo_tarih) = MONTH(CURDATE()) AND YEAR(k.kargo_tarih) = YEAR(CURDATE())
      GROUP BY p.personel_id
      ORDER BY p.personel_puan DESC
      LIMIT 1
    `);
    const ayinPersoneli = ayinPersoneliData[0];

    // Karşılaştırmalı Performans Tablosu
    const [karsilastirmaTablosu] = await pool.query(`
      SELECT 
        p.personel_id,
        CONCAT(p.personel_adi, ' ', p.personel_soyad) AS ad_soyad,
        IFNULL(s.sube_adi, 'Şube Yok') AS sube_adi,
        COUNT(k.kargo_id) AS toplam_kargo,
        SUM(CASE WHEN k.durum = 'teslim_edildi' THEN 1 ELSE 0 END) AS teslim_edilen,
        SUM(CASE WHEN k.durum = 'iptal_edildi' OR k.durum = 'teslim_edilemedi' THEN 1 ELSE 0 END) AS iptal_edilen,
        ROUND((SUM(CASE WHEN k.durum = 'teslim_edildi' THEN 1 ELSE 0 END) / COUNT(k.kargo_id)) * 100, 2) AS basari_orani,
        ROUND((SUM(CASE WHEN k.durum = 'iptal_edildi' OR k.durum = 'teslim_edilemedi' THEN 1 ELSE 0 END) / COUNT(k.kargo_id)) * 100, 2) AS hata_orani,
        p.personel_puan
      FROM personel AS p
      LEFT JOIN kargo AS k ON p.personel_id = k.personel_id
      LEFT JOIN subeler AS s ON p.sube_id = s.sube_id
      WHERE MONTH(k.kargo_tarih) = MONTH(CURDATE()) AND YEAR(k.kargo_tarih) = YEAR(CURDATE())
      GROUP BY p.personel_id
      ORDER BY basari_orani DESC
    `);

    res.json({
      toplam_personel: toplamPersonel,
      ortalama_puan: ortalamaPuan,
      teslim_edilen_kargo: teslimEdilenKargo,
      iptal_edilen_kargo: iptalEdilenKargo,
      ayin_personeli: ayinPersoneli,
      karsilastirma: karsilastirmaTablosu,
    });
  } catch (error) {
    console.error("Personel analiz verileri alınırken hata oluştu:", error);
    res.status(500).json({ error: "Personel analiz verileri alınamadı." });
  }
});

// Anasayfa verileri API'si
app.get("/api/anasayfa", async (req, res) => {
  try {
    const kutucukVerileriQuery = `
      SELECT 
        (SELECT COUNT(*) FROM subeler) AS toplam_sube,
        (SELECT COUNT(*) FROM kargo WHERE YEAR(kargo_tarih) = YEAR(CURDATE())) AS yillik_toplam_kargo,
        (SELECT SUM(maas_tutari + ek_mesai_ucreti) FROM personel_gider WHERE YEAR(odeme_tarihi) = YEAR(CURDATE())) AS yillik_personel_gider,
        (SELECT SUM(kira_fiyati * 12) FROM subeler) AS yillik_toplam_kira,
        (SELECT SUM(kargo_tip.fiyat) FROM kargo JOIN kargo_tip ON kargo.kargo_tipi_id = kargo_tip.kargo_tipi_id WHERE YEAR(kargo_tarih) = YEAR(CURDATE())) AS yillik_toplam_kargo_gelir,
        (SELECT SUM(kargo_tip.maliyet) FROM kargo JOIN kargo_tip ON kargo.kargo_tipi_id = kargo_tip.kargo_tipi_id WHERE YEAR(kargo_tarih) = YEAR(CURDATE())) AS yillik_toplam_kargo_maliyet,
        (SELECT 
            (SELECT SUM(kargo_tip.fiyat) FROM kargo JOIN kargo_tip ON kargo.kargo_tipi_id = kargo_tip.kargo_tipi_id WHERE YEAR(kargo_tarih) = YEAR(CURDATE())) - 
            ((SELECT SUM(maas_tutari + ek_mesai_ucreti) FROM personel_gider WHERE YEAR(odeme_tarihi) = YEAR(CURDATE())) + 
            (SELECT SUM(kira_fiyati * 12) FROM subeler) + 
            (SELECT SUM(kargo_tip.maliyet) FROM kargo JOIN kargo_tip ON kargo.kargo_tipi_id = kargo_tip.kargo_tipi_id WHERE YEAR(kargo_tarih) = YEAR(CURDATE())))
        ) AS yillik_toplam_kargo_kari,
        (SELECT 
            (SELECT SUM(maas_tutari + ek_mesai_ucreti) FROM personel_gider WHERE YEAR(odeme_tarihi) = YEAR(CURDATE())) + 
            (SELECT SUM(kira_fiyati * 12) FROM subeler) + 
            (SELECT SUM(kargo_tip.maliyet) FROM kargo JOIN kargo_tip ON kargo.kargo_tipi_id = kargo_tip.kargo_tipi_id WHERE YEAR(kargo_tarih) = YEAR(CURDATE()))
        ) AS yillik_toplam_gider,
        ROUND(
          (SELECT COUNT(*) FROM kargo WHERE durum = 'teslim_edildi' AND YEAR(kargo_tarih) = YEAR(CURDATE())) /
          (SELECT COUNT(*) FROM kargo WHERE YEAR(kargo_tarih) = YEAR(CURDATE())) * 100, 2
        ) AS teslim_orani,
        ROUND(
          (SELECT COUNT(*) FROM kargo WHERE durum IN ('iptal_edildi', 'teslim_edilemedi') AND YEAR(kargo_tarih) = YEAR(CURDATE())) /
          (SELECT COUNT(*) FROM kargo WHERE YEAR(kargo_tarih) = YEAR(CURDATE())) * 100, 2
        ) AS iptal_orani
    `;

    const yillarQuery = `
      SELECT 
        YEAR(kargo_tarih) AS yil,
        SUM(kargo_tip.fiyat) AS toplam_gelir,
        SUM(kargo_tip.maliyet) + 
        (SELECT SUM(maas_tutari + ek_mesai_ucreti) FROM personel_gider WHERE YEAR(odeme_tarihi) = YEAR(kargo_tarih)) +
        (SELECT SUM(kira_fiyati * 12) FROM subeler) AS toplam_gider,
        SUM(kargo_tip.fiyat) - (
          SUM(kargo_tip.maliyet) + 
          (SELECT SUM(maas_tutari + ek_mesai_ucreti) FROM personel_gider WHERE YEAR(odeme_tarihi) = YEAR(kargo_tarih)) +
          (SELECT SUM(kira_fiyati * 12) FROM subeler)
        ) AS toplam_kar
      FROM kargo
      JOIN kargo_tip ON kargo.kargo_tipi_id = kargo_tip.kargo_tipi_id
      GROUP BY YEAR(kargo_tarih)
      ORDER BY yil ASC
    `;

    const topSubelerQuery = `
      SELECT 
        s.sube_adi,
        COUNT(k.kargo_id) AS toplam_kargo
      FROM kargo AS k
      JOIN personel AS p ON k.personel_id = p.personel_id
      JOIN subeler AS s ON p.sube_id = s.sube_id
      WHERE YEAR(k.kargo_tarih) = YEAR(CURDATE())
      GROUP BY s.sube_id
      ORDER BY toplam_kargo DESC
      LIMIT 3
    `;

    const subePerformansiQuery = `
      SELECT 
        s.sube_adi,
        COUNT(k.kargo_id) AS toplam_kargo,
        SUM(CASE WHEN k.durum = 'teslim_edildi' THEN 1 ELSE 0 END) AS teslim_edilen,
        SUM(CASE WHEN k.durum IN ('iptal_edildi', 'teslim_edilemedi') THEN 1 ELSE 0 END) AS iptal_edilen,
        ROUND((SUM(CASE WHEN k.durum = 'teslim_edildi' THEN 1 ELSE 0 END) / COUNT(k.kargo_id)) * 100, 2) AS basari_orani,
        ROUND((SUM(CASE WHEN k.durum IN ('iptal_edildi', 'teslim_edilemedi') THEN 1 ELSE 0 END) / COUNT(k.kargo_id)) * 100, 2) AS hata_orani
      FROM kargo AS k
      JOIN personel AS p ON k.personel_id = p.personel_id
      JOIN subeler AS s ON p.sube_id = s.sube_id
      WHERE YEAR(k.kargo_tarih) = YEAR(CURDATE())
      GROUP BY s.sube_id
      ORDER BY toplam_kargo DESC
    `;

    const kutucukVerileriPromise = pool.query(kutucukVerileriQuery);
    const yillarPromise = pool.query(yillarQuery);
    const topSubelerPromise = pool.query(topSubelerQuery);
    const subePerformansiPromise = pool.query(subePerformansiQuery);

    const [
      [kutucukVerileri],
      [yillar],
      [topSubeler],
      [subePerformansi],
    ] = await Promise.all([
      kutucukVerileriPromise,
      yillarPromise,
      topSubelerPromise,
      subePerformansiPromise,
    ]);

    res.json({
      kutucukVerileri: kutucukVerileri[0],
      yillar,
      topSubeler,
      subePerformansi,
    });
  } catch (error) {
    console.error("Anasayfa verileri alınırken hata oluştu:", error);
    res.status(500).json({ error: "Anasayfa verileri alınamadı." });
  }
});


// Yıllar API
app.get("/api/yillar", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT YEAR(kargo_tarih) AS yil FROM kargo ORDER BY yil ASC"
    );
    res.json(rows.map((row) => row.yil));
  } catch (error) {
    console.error("Yıllar alınırken hata oluştu:", error);
    res.status(500).json({ error: "Yıllar alınamadı." });
  }
});

// Aylar API
app.get("/api/aylar", async (req, res) => {
  const { yil } = req.query;

  if (!yil) {
    return res.status(400).json({ error: "Yıl bilgisi eksik." });
  }

  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT MONTH(kargo_tarih) AS ay FROM kargo WHERE YEAR(kargo_tarih) = ? ORDER BY ay ASC",
      [yil]
    );

    res.json(rows.map((row) => row.ay));
  } catch (error) {
    console.error("Aylar alınırken hata oluştu:", error);
    res.status(500).json({ error: "Aylar alınamadı." });
  }
});

// Karşılaştırma API
app.post("/api/karsilastir", async (req, res) => {
  const { sorguTipi, secilenDeger, subeler } = req.body;

  // Parametre Kontrolü
  if (!sorguTipi || !secilenDeger || !subeler || subeler.length === 0) {
    return res.status(400).json({ error: "Geçersiz parametreler. Yıl, ay veya şube bilgisi eksik." });
  }

  try {
    let query = "";
    let params = [];
    let subeFilterColumn = ""; // Şube adları mı yoksa şube ID'leri mi?

    // Gelen parametrelere göre sütun belirle
    if (typeof subeler[0] === "number") {
      subeFilterColumn = "s.sube_id"; // Şube ID'leri
    } else {
      subeFilterColumn = "s.sube_adi"; // Şube adları
    }

    if (sorguTipi === "yil") {
      // Yıl Sorgusu
      query = `
        SELECT 
          ${subeFilterColumn} AS sube, 
          SUM(kt.fiyat) AS toplam_gelir, 
          (SUM(kt.maliyet) + (s.kira_fiyati * 12) +
           COALESCE((
             SELECT 
               SUM(pg.maas_tutari + pg.ek_mesai_ucreti)
             FROM personel_gider pg
             WHERE pg.personel_id IN (
               SELECT p.personel_id FROM personel p WHERE p.sube_id = s.sube_id
             ) AND YEAR(pg.odeme_tarihi) = ?
           ), 0)) AS toplam_gider
        FROM kargo k
        INNER JOIN personel p ON k.personel_id = p.personel_id
        INNER JOIN subeler s ON p.sube_id = s.sube_id
        INNER JOIN kargo_tip kt ON k.kargo_tipi_id = kt.kargo_tipi_id
        WHERE YEAR(k.kargo_tarih) = ? AND ${subeFilterColumn} IN (${subeler.map(() => "?").join(", ")})
        GROUP BY ${subeFilterColumn};
      `;
      params = [secilenDeger, secilenDeger, ...subeler];
    } else if (sorguTipi === "ay") {
      // Ay Sorgusu
      const [yil, ay] = secilenDeger.split("-");
      query = `
        SELECT 
          ${subeFilterColumn} AS sube, 
          SUM(kt.fiyat) AS toplam_gelir, 
          (SUM(kt.maliyet) + s.kira_fiyati +
           COALESCE((
             SELECT 
               SUM(pg.maas_tutari + pg.ek_mesai_ucreti)
             FROM personel_gider pg
             WHERE pg.personel_id IN (
               SELECT p.personel_id FROM personel p WHERE p.sube_id = s.sube_id
             ) AND YEAR(pg.odeme_tarihi) = ? AND MONTH(pg.odeme_tarihi) = ?
           ), 0)) AS toplam_gider
        FROM kargo k
        INNER JOIN personel p ON k.personel_id = p.personel_id
        INNER JOIN subeler s ON p.sube_id = s.sube_id
        INNER JOIN kargo_tip kt ON k.kargo_tipi_id = kt.kargo_tipi_id
        WHERE YEAR(k.kargo_tarih) = ? AND MONTH(k.kargo_tarih) = ? AND ${subeFilterColumn} IN (${subeler.map(() => "?").join(", ")})
        GROUP BY ${subeFilterColumn};
      `;
      params = [yil, ay, yil, ay, ...subeler];
    } else if (sorguTipi === "periyot") {
      // Periyot Sorgusu
      const yil = secilenDeger.split("-")[0];
      const [baslangic, bitis] = secilenDeger.includes("ilk6") ? [1, 6] : [7, 12];
      query = `
        SELECT 
          ${subeFilterColumn} AS sube, 
          SUM(kt.fiyat) AS toplam_gelir, 
          (SUM(kt.maliyet) + (s.kira_fiyati * (?)) +
           COALESCE((
             SELECT 
               SUM(pg.maas_tutari + pg.ek_mesai_ucreti)
             FROM personel_gider pg
             WHERE pg.personel_id IN (
               SELECT p.personel_id FROM personel p WHERE p.sube_id = s.sube_id
             ) AND YEAR(pg.odeme_tarihi) = ? AND MONTH(pg.odeme_tarihi) BETWEEN ? AND ?
           ), 0)) AS toplam_gider
        FROM kargo k
        INNER JOIN personel p ON k.personel_id = p.personel_id
        INNER JOIN subeler s ON p.sube_id = s.sube_id
        INNER JOIN kargo_tip kt ON k.kargo_tipi_id = kt.kargo_tipi_id
        WHERE YEAR(k.kargo_tarih) = ? AND MONTH(k.kargo_tarih) BETWEEN ? AND ? AND ${subeFilterColumn} IN (${subeler.map(() => "?").join(", ")})
        GROUP BY ${subeFilterColumn};
      `;
      params = [
        bitis - baslangic + 1, // Kira hesaplaması için ay farkı
        yil, baslangic, bitis, // personel_gider tarih aralığı
        yil, baslangic, bitis, // kargo_tarih tarih aralığı
        ...subeler,
      ];
    } else {
      return res.status(400).json({ error: "Geçersiz sorgu tipi." });
    }

    // Sorgu ve Parametre Loglama
    console.log("Çalıştırılan Sorgu:", query);
    console.log("Parametreler:", params);

    // Sorguyu Çalıştır
    const [rows] = await pool.query(query, params);

    // Sonuçları İşle
    const result = rows.map((row) => ({
      sube: row.sube,
      gelir: parseFloat(row.toplam_gelir || 0),
      gider: parseFloat(row.toplam_gider || 0),
      kar: parseFloat(row.toplam_gelir || 0) - parseFloat(row.toplam_gider || 0),
    }));

    if (result.length === 0) {
      console.log("Hiçbir sonuç dönmedi.");
      return res.json({ message: "Seçilen kriterlere uygun veri bulunamadı." });
    }

    res.json(result);
  } catch (error) {
    console.error("Veriler karşılaştırılamadı:", error);
    res.status(500).json({ error: "Veriler karşılaştırılamadı." });
  }
});






app.get("/api/raporlama", async (req, res) => {
  const subeId = req.query.sube_id;

  if (!subeId) {
      return res.status(400).json({ error: "Şube ID gerekli." });
  }

  try {
      // Şubenin toplam gelirini hesapla
      const [gelirData] = await pool.query(
          `SELECT 
              COALESCE(SUM(kt.fiyat), 0) AS toplam_gelir
           FROM kargo k
           JOIN kargo_tip kt ON k.kargo_tipi_id = kt.kargo_tipi_id
           JOIN personel p ON k.personel_id = p.personel_id
           WHERE p.sube_id = ? AND YEAR(k.kargo_tarih) = YEAR(CURDATE())`,
          [subeId]
      );
      const toplamGelir = parseFloat(gelirData[0]?.toplam_gelir || 0);

      // Şubenin toplam kargo maliyetini hesapla
      const [maliyetData] = await pool.query(
          `SELECT 
              COALESCE(SUM(kt.maliyet), 0) AS toplam_maliyet
           FROM kargo k
           JOIN kargo_tip kt ON k.kargo_tipi_id = kt.kargo_tipi_id
           JOIN personel p ON k.personel_id = p.personel_id
           WHERE p.sube_id = ? AND YEAR(k.kargo_tarih) = YEAR(CURDATE())`,
          [subeId]
      );
      const toplamKargoMaliyeti = parseFloat(maliyetData[0]?.toplam_maliyet || 0);

      // Şubenin personel maaş ve ek mesai giderlerini hesapla
      const [personelGiderData] = await pool.query(
          `SELECT 
              COALESCE(SUM(pg.maas_tutari), 0) AS toplam_maas,
              COALESCE(SUM(pg.ek_mesai_ucreti), 0) AS toplam_ek_mesai
           FROM personel_gider pg
           JOIN personel p ON pg.personel_id = p.personel_id
           WHERE p.sube_id = ? AND YEAR(pg.odeme_tarihi) = YEAR(CURDATE())`,
          [subeId]
      );
      const toplamMaas = parseFloat(personelGiderData[0]?.toplam_maas || 0);
      const toplamEkMesai = parseFloat(personelGiderData[0]?.toplam_ek_mesai || 0);

      // Şubenin yıllık kira giderini hesapla
      const [kiraData] = await pool.query(
          `SELECT 
              (kira_fiyati * 12) AS kira_gideri,
              sube_adi
           FROM subeler
           WHERE sube_id = ?`,
          [subeId]
      );
      const kiraGideri = parseFloat(kiraData[0]?.kira_gideri || 0);
      const subeAdi = kiraData[0]?.sube_adi || "Bilinmeyen Şube";

      // Toplam gideri hesapla
      const toplamGider = toplamKargoMaliyeti + toplamMaas + toplamEkMesai + kiraGideri;

      // Toplam karı hesapla
      const toplamKar = toplamGelir - toplamGider;

      // En verimli ve en verimsiz çalışanları belirle
      const [personelData] = await pool.query(
          `SELECT 
              CONCAT(p.personel_adi, ' ', p.personel_soyad) AS ad_soyad,
              p.personel_puan
           FROM personel p
           WHERE p.sube_id = ?
           ORDER BY p.personel_puan DESC`,
          [subeId]
      );
      const verimliCalisan = personelData[0]?.ad_soyad || "Belirlenemedi";
      const verimsizCalisan = personelData[personelData.length - 1]?.ad_soyad || "Belirlenemedi";

      // Şubenin durumunu belirle
      const durum =
          toplamKar > 4000000
              ? "Şube kârda ve sürdürülebilir durumda. Her şey yolunda ilerliyor."
              : "Şube kârı istenilen düzeyde değil. Maliyet düşürülmeli.";

      // JSON yanıtı döndür
      res.json({
          sube_adi: subeAdi,
          gelir: toplamGelir.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
          gider: toplamGider.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
          kar: toplamKar.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
          verimli_calisan: verimliCalisan,
          verimsiz_calisan: verimsizCalisan,
          durum,
      });
  } catch (error) {
      console.error("Raporlama API hatası:", error);
      res.status(500).json({ error: "Raporlama verileri alınamadı." });
  }
});





// Şubeleri listeleme API'si
app.get("/api/subeler", async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();

    const [rows] = await connection.query("SELECT sube_id, sube_adi FROM subeler");
    res.json(rows);
  } catch (error) {
    console.error("Şubeler alınırken bir hata oluştu:", error);
    res.status(500).json({ error: "Şubeler alınamadı." });
  } finally {
    if (connection) connection.release();
  }
});

// Tahminleme için Python API'ye istek gönderme
app.post("/api/tahminleme", async (req, res) => {
  const { sube_ids, percent_increase } = req.body;

  if (!sube_ids || !percent_increase) {
    return res.status(400).json({ error: "Eksik parametreler." });
  }

  try {
    // Python Flask API'ye POST isteği gönder
    const response = await axios.post("http://127.0.0.1:5000/api/tahminleme", {
      sube_ids,
      percent_increase,
    });

    res.json(response.data); // Python API'den gelen yanıtı döndür
  } catch (error) {
    console.error("Tahminleme isteği sırasında bir hata oluştu:", error.message);
    res.status(500).json({ error: "Tahminleme işlemi başarısız oldu." });
  }
});

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${port}`);
});
