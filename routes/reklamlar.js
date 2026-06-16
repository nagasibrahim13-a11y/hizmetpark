const express = require('express');
const router = express.Router();
const Reklam = require('../models/Reklam');

// Aktif reklamları getir (müşteri sayfası için)
router.get('/aktif', async (req, res) => {
  try {
    const simdi = new Date();
    const reklamlar = await Reklam.find({
      aktif: true,
      baslangicTarihi: { $lte: simdi },
      bitisTarihi: { $gte: simdi }
    }).populate('isletme', 'isletmeAdi kategori adres fotograf telefon');
    res.json(reklamlar);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// İşletmenin reklamlarını getir
router.get('/isletme/:isletmeId', async (req, res) => {
  try {
    const reklamlar = await Reklam.find({ isletme: req.params.isletmeId })
      .sort({ olusturmaTarihi: -1 });
    res.json(reklamlar);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Reklam oluştur
router.post('/', async (req, res) => {
  try {
    const reklam = await Reklam.create(req.body);
    res.status(201).json({ mesaj: 'Reklam oluşturuldu', reklam });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Tıklamayı say
router.put('/:id/tikla', async (req, res) => {
  try {
    await Reklam.findByIdAndUpdate(req.params.id, { $inc: { tiklama: 1 } });
    res.json({ mesaj: 'Tıklama sayıldı' });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Reklamı iptal et
router.put('/:id/iptal', async (req, res) => {
  try {
    await Reklam.findByIdAndUpdate(req.params.id, { aktif: false });
    res.json({ mesaj: 'Reklam iptal edildi' });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

module.exports = router;