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
    type: mongoose.Schema.Types.Mixed
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
  hediyeMi: {
    type: Boolean,
    default: false
  },
  sadakatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sadakat'
  },
  notlar: String,
  olusturmaTarihi: {
    type: Date,
    default: Date.now
  }
});

const Randevu = mongoose.model('Randevu', randevuSemasi);
module.exports = Randevu;