const mongoose = require('mongoose');

const bildirimSemasi = new mongoose.Schema({
  aliciTipi: { type: String, enum: ['musteri', 'isletme', 'personel'], required: true },
  aliciId: { type: mongoose.Schema.Types.ObjectId, required: true },
  baslik: { type: String, required: true },
  mesaj: { type: String, required: true },
  tip: { type: String, enum: ['randevu', 'iptal', 'sadakat', 'genel'], default: 'genel' },
  okundu: { type: Boolean, default: false },
  olusturmaTarihi: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bildirim', bildirimSemasi);
