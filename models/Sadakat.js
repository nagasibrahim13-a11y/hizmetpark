const mongoose = require('mongoose');

const sadakatSemasi = new mongoose.Schema({

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

  mevcutPuan: {
    type: Number,
    default: 0
  },

  toplamZiyaret: {
    type: Number,
    default: 0
  },

  // İşletmenin belirlediği kural
  // Örnek: 5 ziyarette 1 peeling hediye
  odul: {
    hedefZiyaret: {
      type: Number,
      default: 5
    },
    hediye: {
      type: String,
      default: 'Ücretsiz Hizmet'
    }
  },

  kazanilanOduller: [
    {
      tarih: Date,
      hediye: String,
      kullanildi: { type: Boolean, default: false }
    }
  ],

  sonGuncelleme: {
    type: Date,
    default: Date.now
  }

});

const Sadakat = mongoose.model('Sadakat', sadakatSemasi);
module.exports = Sadakat;