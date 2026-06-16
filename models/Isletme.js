const mongoose = require('mongoose');

const isletmeSemasi = new mongoose.Schema({
  sahip: { type: mongoose.Schema.Types.ObjectId, ref: 'Kullanici', required: true },
  isletmeAdi: { type: String, required: true },
  kategori: { type: String, enum: ['berber', 'kuafor', 'guzellik', 'halisaha'], required: true },
  adres: { il: String, ilce: String, acikAdres: String },
  telefon: String,
  calismaGunleri: { type: [String], default: ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'] },
  calismaBaslangic: { type: String, default: '09:00' },
  calismaBitis: { type: String, default: '19:00' },
  hizmetler: [{ ad: String, sure: Number, fiyat: Number }],
  ortalamaPuan: { type: Number, default: 0 },
  yorumSayisi: { type: Number, default: 0 },
  aktif: { type: Boolean, default: true },
  olusturmaTarihi: { type: Date, default: Date.now }
});

const Isletme = mongoose.model('Isletme', isletmeSemasi);
module.exports = Isletme;