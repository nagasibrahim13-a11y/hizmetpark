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
app.use('/api/auth', require('./routes/auth'));
app.use('/api/kullanicilar', require('./routes/kullanicilar'));
app.use('/api/isletmeler', require('./routes/isletmeler'));
app.use('/api/randevular', require('./routes/randevular'));
app.use('/api/yorumlar', require('./routes/yorumlar'));
app.use('/api/sadakat', require('./routes/sadakat'));
app.use('/api/reklamlar', require('./routes/reklamlar'));
app.use('/api/bildirimler', require('./routes/bildirimler'));


// Test endpoint'i
app.get('/', (req, res) => {
  res.json({ mesaj: '✅ HizmetPark API çalışıyor!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});