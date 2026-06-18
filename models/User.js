const mongoose = require('mongoose');

const kullaniciSemasi = new mongoose.Schema({
  ad: { type: String, required: true },
  soyad: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  telefon: { type: String },
  sifre: { type: String },
  googleId: { type: String },
  rol: { type: String, enum: ['musteri', 'isletme'], default: 'musteri' },
  kayitTarihi: { type: Date, default: Date.now }
});

const Kullanici = mongoose.model('Kullanici', kullaniciSemasi);
module.exports = Kullanici;