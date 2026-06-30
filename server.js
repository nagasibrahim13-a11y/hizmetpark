const express = require('express');
const cors = require('cors');
const baglan = require('./db'); // dotenv burada yükleniyor
if (!process.env.JWT_SECRET) {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════╗');
  console.error('║  KRITIK HATA: JWT_SECRET ortam degiskeni tanimli degil.  ║');
  console.error('║  .env dosyasini kontrol et. Sunucu baslatilmiyor.        ║');
  console.error('╚══════════════════════════════════════════════════════════╝');
  console.error('');
  process.exit(1);
}
const app = express();
// Gelen JSON verilerini okuyabilmek için
app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Veritabanına bağlan
baglan();
// Route'ları bağla
console.log('1: auth yukleniyor');
app.use('/api/auth', require('./routes/auth'));
console.log('2: kullanicilar yukleniyor');
app.use('/api/kullanicilar', require('./routes/kullanicilar'));
console.log('3: isletmeler yukleniyor');
app.use('/api/isletmeler', require('./routes/isletmeler'));
console.log('4: randevular yukleniyor');
app.use('/api/randevular', require('./routes/randevular'));
console.log('5: yorumlar yukleniyor');
app.use('/api/yorumlar', require('./routes/yorumlar'));
console.log('6: sadakat yukleniyor');
app.use('/api/sadakat', require('./routes/sadakat'));
console.log('7: reklamlar yukleniyor');
app.use('/api/reklamlar', require('./routes/reklamlar'));
console.log('8: bildirimler yukleniyor');
app.use('/api/bildirimler', require('./routes/bildirimler'));
console.log('9: tum route lar yuklendi, listen cagriliyor');
// Test endpoint'i
app.get('/', (req, res) => {
  res.json({ mesaj: '✅ HizmetPark API çalışıyor!' });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});