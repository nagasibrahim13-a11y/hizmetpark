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
    type: { type: String },
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
  kapaliTarihler: [{
    tarih: { type: Date, required: true },
    tumGun: { type: Boolean, default: true },
    saatler: [String],
    aciklama: String
  }],
  aktif: { type: Boolean, default: true },
  olusturmaTarihi: { type: Date, default: Date.now },
  personel: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    ad: { type: String, required: true },
    unvan: { type: String, default: 'Çalışan' },
    fotograf: { type: String, default: '' },
    aktif: { type: Boolean, default: true },
    telefon: { type: String, default: '' },
    maas: { type: Number, default: 0 },
    kullaniciAdi: { type: String, default: '' },
    sifre: {
      type: String,
      default: '',
      validate: {
        validator: (v) => !v || v.length >= 6,
        message: 'Personel şifresi en az 6 karakter olmalıdır'
      }
    },
    calismaGunleri: { type: [String], default: ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'] },
    yetkiliHizmetler: [{ type: String }],
    izinTarihleri: [{
      tarih: { type: Date, required: true },
      tumGun: { type: Boolean, default: true },
      saatler: { type: [String], default: [] },
      aciklama: { type: String, default: '' }
    }]
  }],
  giderler: [{
    ad: { type: String, required: true },
    tutar: { type: Number, required: true },
    eklenmeTarihi: { type: Date, default: Date.now }
  }],
  premium: {
    aktif: { type: Boolean, default: false },
    baslangic: { type: Date, default: null },
    bitis: { type: Date, default: null },
    paket: { type: String, enum: ['deneme', 'aylik', 'yillik'], default: null }
  }
});

isletmeSemasi.pre('save', async function () {
  if (this.konum && (!this.konum.coordinates || this.konum.coordinates.length < 2)) {
    this.konum = null;
  }
});

isletmeSemasi.index({ konum: '2dsphere' }, { sparse: true });

const Isletme = mongoose.model('Isletme', isletmeSemasi);
module.exports = Isletme;