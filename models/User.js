const mongoose = require('mongoose');

const kullaniciSemasi = new mongoose.Schema({
  ad: { type: String, required: true },
  soyad: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  telefon: { type: String },
  sifre: { type: String, minlength: [6, 'Şifre en az 6 karakter olmalıdır'] },
  googleId: { type: String },
  rol: { type: String, enum: ['musteri', 'isletme'], default: 'musteri' },
  kayitTarihi: { type: Date, default: Date.now },
  vipMi: { type: Boolean, default: false },
  toplamHarcama: { type: Number, default: 0 },
  segment: { type: String, enum: ['yeni', 'duzenli', 'vip'], default: 'yeni' },
  favoriler: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Isletme' }],
  fotograf: { type: String, default: '' }
});

const Kullanici = mongoose.model('Kullanici', kullaniciSemasi);
module.exports = Kullanici;