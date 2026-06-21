const express = require('express');
const router = express.Router();
const Bildirim = require('../models/Bildirim');

// Kullanıcının/işletmenin bildirimlerini getir
router.get('/:aliciTipi/:aliciId', async (req, res) => {
  try {
    const bildirimler = await Bildirim.find({
      aliciTipi: req.params.aliciTipi,
      aliciId: req.params.aliciId
    }).sort({ olusturmaTarihi: -1 }).limit(30);
    res.json(bildirimler);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Okunmamış sayısı
router.get('/:aliciTipi/:aliciId/okunmamis-sayisi', async (req, res) => {
  try {
    const sayi = await Bildirim.countDocuments({
      aliciTipi: req.params.aliciTipi,
      aliciId: req.params.aliciId,
      okundu: false
    });
    res.json({ sayi });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Okundu işaretle
router.put('/:id/okundu', async (req, res) => {
  try {
    await Bildirim.findByIdAndUpdate(req.params.id, { okundu: true });
    res.json({ mesaj: 'Okundu işaretlendi' });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Tümünü okundu işaretle
router.put('/:aliciTipi/:aliciId/tumunu-okundu', async (req, res) => {
  try {
    await Bildirim.updateMany(
      { aliciTipi: req.params.aliciTipi, aliciId: req.params.aliciId, okundu: false },
      { okundu: true }
    );
    res.json({ mesaj: 'Tümü okundu işaretlendi' });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

module.exports = router;
