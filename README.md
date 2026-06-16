\# 🏪 HizmetPark — Türkiye'nin Hizmet Marketplace'i



> Trendyol ürünü buluşturdu. Biz hizmeti buluşturuyoruz.



HizmetPark, berber, kuaför, güzellik salonu ve halısaha gibi hizmet işletmelerini müşterilerle buluşturan bir marketplace platformudur.



\---



\## 🚀 Özellikler



\### Müşteri Tarafı

\- 📍 Konuma göre işletme keşfi

\- 🗂️ Kategori filtresi (Berber, Kuaför, Güzellik, Halısaha)

\- 📅 Online randevu alma

\- ⏱️ Çoklu hizmet seçimi ve otomatik süre hesaplama

\- ⭐ Yorum ve puanlama sistemi

\- 🎁 Sadakat puan takibi



\### İşletme Yönetim Paneli

\- 📊 Günlük randevu takibi

\- ✅ Randevu onaylama ve reddetme

\- 🏁 Randevu tamamlama

\- ✂️ Hizmet ve fiyat yönetimi

\- 🎁 Sadakat programı ayarları



\### Reklam Paneli (yakında)

\- 📢 Ana sayfa slider reklamı

\- 📍 Konuma göre öne çıkarma

\- 🃏 Sponsorlu işletme kartı



\---



\## 🛠️ Teknolojiler



\### Backend

| Teknoloji | Kullanım |

|-----------|----------|

| Node.js | Sunucu |

| Express.js | API framework |

| MongoDB Atlas | Veritabanı |

| Mongoose | ODM |



\### Frontend

| Teknoloji | Kullanım |

|-----------|----------|

| React | UI framework |

| CSS | Styling |

| Fetch API | HTTP istekleri |



\---



\## 📁 Proje Yapısı



&#x20;   hizmetpark/

&#x20;   ├── models/

&#x20;   │   ├── User.js

&#x20;   │   ├── Isletme.js

&#x20;   │   ├── Randevu.js

&#x20;   │   ├── Sadakat.js

&#x20;   │   └── Yorum.js

&#x20;   ├── routes/

&#x20;   │   ├── kullanicilar.js

&#x20;   │   ├── isletmeler.js

&#x20;   │   └── randevular.js

&#x20;   ├── db.js

&#x20;   └── server.js



&#x20;   hizmetpark-frontend/

&#x20;   └── src/

&#x20;       ├── pages/

&#x20;       │   ├── Giris.js

&#x20;       │   ├── Kayit.js

&#x20;       │   ├── MusteriAnaSayfa.js

&#x20;       │   └── IsletmePanel.js

&#x20;       ├── App.js

&#x20;       └── index.js



\---



\## ⚙️ Kurulum



\### Backend



&#x20;   git clone https://github.com/nagasibrahim13-a11y/hizmetpark.git

&#x20;   cd hizmetpark

&#x20;   npm install

&#x20;   node server.js



\### Frontend



&#x20;   git clone https://github.com/nagasibrahim13-a11y/-hizmetpark-frontend.git

&#x20;   cd -hizmetpark-frontend

&#x20;   npm install

&#x20;   npm start



\---



\## 📡 API Endpoints



\### Kullanıcılar

| Method | Endpoint | Açıklama |

|--------|----------|----------|

| POST | /api/kullanicilar/kayit | Kayıt ol |

| POST | /api/kullanicilar/giris | Giriş yap |

| GET | /api/kullanicilar | Tüm kullanıcılar |



\### İşletmeler

| Method | Endpoint | Açıklama |

|--------|----------|----------|

| GET | /api/isletmeler | Tüm işletmeler |

| GET | /api/isletmeler/:id | Tek işletme |

| POST | /api/isletmeler | İşletme oluştur |

| PUT | /api/isletmeler/:id | İşletme güncelle |



\### Randevular

| Method | Endpoint | Açıklama |

|--------|----------|----------|

| POST | /api/randevular | Randevu oluştur |

| GET | /api/randevular/isletme/:id | İşletme randevuları |

| GET | /api/randevular/musteri/:id | Müşteri randevuları |

| PUT | /api/randevular/:id/durum | Durum güncelle |



\---



\## 🗺️ Yol Haritası



\- \[x] Kullanıcı kayıt ve giriş

\- \[x] İşletme listeleme ve keşif

\- \[x] Online randevu sistemi

\- \[x] Çoklu hizmet ve süre hesaplama

\- \[x] İşletme yönetim paneli

\- \[ ] Yorum ve puanlama

\- \[ ] Sadakat sistemi arayüzü

\- \[ ] Gerçek zamanlı bildirimler

\- \[ ] Reklam paneli

\- \[ ] Mobil uygulama

\- \[ ] Ödeme entegrasyonu



\---



\## 👨‍💻 Geliştirici



\*\*İbrahim Nagaş\*\*

GitHub: \[@nagasibrahim13-a11y](https://github.com/nagasibrahim13-a11y)



\---



\## 📄 Lisans



MIT License

