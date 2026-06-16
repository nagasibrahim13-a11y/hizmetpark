const mongoose = require('mongoose');

const yorumSemasi = new mongoose.Schema({

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

  randevu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Randevu'
  },

  puan: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },

  yorum: {
    type: String,
    maxlength: 500
  },

  tarih: {
    type: Date,
    default: Date.now
  }

});

const Yorum = mongoose.model('Yorum', yorumSemasi);
module.exports = Yorum;