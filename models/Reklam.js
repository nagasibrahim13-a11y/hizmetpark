const mongoose = require('mongoose');

const reklamSemasi = new mongoose.Schema({
  isletme: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Isletme',
    required: true
  },
  tip: {
    type: String,
    enum: ['slider', 'one_cikma', 'sponsorlu'],
    required: true
  },
  baslik: { type: String },
  aciklama: { type: String },
  gorsel: { type: String },
  baslangicTarihi: { type: Date, required: true },
  bitisTarihi: { type: Date, required: true },
  aktif: { type: Boolean, default: true },
  tiklama: { type: Number, default: 0 },
  olusturmaTarihi: { type: Date, default: Date.now }
});

const Reklam = mongoose.model('Reklam', reklamSemasi);
module.exports = Reklam;