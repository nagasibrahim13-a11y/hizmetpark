const express = require('express');
const cors = require('cors');
const baglan = require('./db');

const app = express();

// Gelen JSON verilerini okuyabilmek için
app.use(cors());
app.use(express.json());

// Veritabanına bağlan
baglan();

// Route'ları bağla
app.use('/api/kullanicilar', require('./routes/kullanicilar'));
app.use('/api/isletmeler', require('./routes/isletmeler'));
app.use('/api/randevular', require('./routes/randevular'));
app.use('/api/yorumlar', require('./routes/yorumlar'));
app.use('/api/sadakat', require('./routes/sadakat'));
app.use('/api/reklamlar', require('./routes/reklamlar'));


// Test endpoint'i
app.get('/', (req, res) => {
  res.json({ mesaj: '✅ HizmetPark API çalışıyor!' });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});