const mongoose = require('mongoose');

const randevuSemasi = new mongoose.Schema({

  musteri: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kullanici',
    required: true
  },

  isletme: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Isletme',
    required: true
  },

  hizmet: {
    ad: String,
    sure: Number,
    fiyat: Number
  },

  tarih: {
    type: Date,
    required: true
  },

  saat: {
    type: String,
    required: true
  },

  durum: {
    type: String,
    enum: ['bekliyor', 'onaylandi', 'reddedildi', 'tamamlandi'],
    default: 'bekliyor'
  },

  notlar: String,

  olusturmaTarihi: {
    type: Date,
    default: Date.now
  }

});

const Randevu = mongoose.model('Randevu', randevuSemasi);
module.exports = Randevu;