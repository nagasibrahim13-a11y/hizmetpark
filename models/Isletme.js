const mongoose = require('mongoose');

const isletmeSemasi = new mongoose.Schema({
  sahip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kullanici',
    required: true
  },
  isletmeAdi: { type: String, required: true },
  kategori: {
    type: String,
    enum: ['berber', 'kuafor', 'guzellik', 'halisaha'],
    required: true
  },
  slogan: { type: String, maxlength: 200 },
  hakkinda: { type: String, maxlength: 1000 },
  fotograf: { type: String }, // base64 veya URL
  adres: {
    il: String,
    ilce: String,
    acikAdres: String
  },
  konum: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  telefon: String,
  calismaGunleri: {
    type: [String],
    default: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
  },
  calismaBaslangic: { type: String, default: '09:00' },
  calismaBitis: { type: String, default: '19:00' },
  hizmetler: [{ ad: String, sure: Number, fiyat: Number }],
  ortalamaPuan: { type: Number, default: 0 },
  yorumSayisi: { type: Number, default: 0 },
  aktif: { type: Boolean, default: true },
  olusturmaTarihi: { type: Date, default: Date.now }
});

isletmeSemasi.index({ konum: '2dsphere' });

const Isletme = mongoose.model('Isletme', isletmeSemasi);
module.exports = Isletme;