from flask import Flask, request, jsonify
import pymysql
import numpy as np
from sklearn.linear_model import LinearRegression

app = Flask(__name__)

# Veritabanı bağlantısı fonksiyonu
def get_db_connection():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="",
        database="fast_express",
        cursorclass=pymysql.cursors.DictCursor
    )

# 5 yıllık enflasyon verilerine göre tahminleme
def tahmini_enflasyon():
    # 5 yıllık geçmiş enflasyon verileri
    enflasyon_verileri = [15.18, 14.60, 36.08, 64.27, 58.82]  # 2019-2023
    years = np.array([2019, 2020, 2021, 2022, 2023]).reshape(-1, 1)

    model = LinearRegression()
    model.fit(years, np.array(enflasyon_verileri).reshape(-1, 1))
    return model.predict(np.array([[2025]]))[0][0]  # 2025 yılı tahmini enflasyon

# Tahminleme API'si
@app.route('/api/tahminleme', methods=['POST'])
def tahminleme():
    try:
        data = request.get_json()
        sube_ids = data.get("sube_ids")
        percent_increase = float(data.get("percent_increase"))

        if not sube_ids or percent_increase is None:
            return jsonify({"error": "Eksik parametreler"}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        results = []
        enflasyon_orani = tahmini_enflasyon() / 100  # Enflasyon oranı

        for sube_id in sube_ids:
            # Geçmiş 2 yıllık kargo gelirleri
            kargo_query = """
                SELECT YEAR(kargo_tarih) AS yil, 
                       SUM(kargo_tip.fiyat) AS toplam_gelir,
                       SUM(kargo_tip.maliyet) AS toplam_maliyet
                FROM kargo
                JOIN kargo_tip ON kargo.kargo_tipi_id = kargo_tip.kargo_tipi_id
                JOIN personel ON kargo.personel_id = personel.personel_id
                WHERE personel.sube_id = %s AND YEAR(kargo_tarih) IN (2023, 2024)
                GROUP BY YEAR(kargo_tarih)
            """
            cursor.execute(kargo_query, (sube_id,))
            kargo_verileri = cursor.fetchall()

            # Geçmiş 2 yıllık personel giderleri
            gider_query = """
                SELECT YEAR(odeme_tarihi) AS yil, 
                       SUM(personel_gider.maas_tutari + personel_gider.ek_mesai_ucreti) AS toplam_personel_gider
                FROM personel_gider
                JOIN personel ON personel_gider.personel_id = personel.personel_id
                WHERE personel.sube_id = %s AND YEAR(odeme_tarihi) IN (2023, 2024)
                GROUP BY YEAR(odeme_tarihi)
            """
            cursor.execute(gider_query, (sube_id,))
            gider_verileri = cursor.fetchall()

            # Verilerin hazırlanması
            years = np.array([row["yil"] for row in kargo_verileri]).reshape(-1, 1)
            gelirler = np.array([row["toplam_gelir"] for row in kargo_verileri]).reshape(-1, 1)
            maliyetler = np.array([row["toplam_maliyet"] for row in kargo_verileri]).reshape(-1, 1)
            personel_giderler = np.array([row["toplam_personel_gider"] for row in gider_verileri]).reshape(-1, 1)

            # Toplam gider hesaplama (personel gideri + kargo maliyeti)
            toplam_giderler = personel_giderler + maliyetler

            # Regresyon modelleri
            gelir_model = LinearRegression()
            gider_model = LinearRegression()

            gelir_model.fit(years, gelirler)
            gider_model.fit(years, toplam_giderler)

            # 2025 tahmini
            next_year = np.array([[2025]])
            tahmini_gelir = gelir_model.predict(next_year)[0][0]
            tahmini_gider = gider_model.predict(next_year)[0][0]

            # Kullanıcı yüzdesine göre artış
            gelir_artis = tahmini_gelir * (percent_increase / 100)
            gider_artis = tahmini_gider * (percent_increase / 100)

            # Nihai tahminler (enflasyon etkisi dahil)
            nihai_gelir = (tahmini_gelir + gelir_artis) * (1 + enflasyon_orani)
            nihai_gider = (tahmini_gider + gider_artis) * (1 + enflasyon_orani)
            nihai_kar = nihai_gelir - nihai_gider

            results.append({
                "sube_id": sube_id,
                "year": 2025,
                "gelir": round(nihai_gelir, 2),
                "gider": round(nihai_gider, 2),
                "kar": round(nihai_kar, 2),
                "gelecek_enflasyon_orani": round(enflasyon_orani * 100, 2),
            })

        return jsonify(results)

    except Exception as e:
        print(f"Hata: {e}")
        return jsonify({"error": f"Bir hata oluştu: {str(e)}"}), 500

    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'connection' in locals() and connection:
            connection.close()

if __name__ == '__main__':
    app.run(debug=True)
