const express = require('express');
const router = express.Router();
const Sadakat = require('../models/Sadakat');
const Isletme = require('../models/Isletme');
const { dogrulaToken, isletmeSahibiOl } = require('../middleware/auth');

// Müşterinin tüm sadakat kartlarını getir — sadece kendi kartları
router.get('/musteri/:musteriId', dogrulaToken, async (req, res) => {
  try {
    if (req.kullanici.id !== req.params.musteriId) {
      return res.status(403).json({ hata: 'Bu bilgilere erişim yetkiniz yok' });
    }
    const sadakatlar = await Sadakat.find({ musteri: req.params.musteriId })
      .populate('isletme', 'isletmeAdi kategori adres');
    res.json(sadakatlar);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// İşletmenin sadakat ayarlarını güncelle — sadece işletme sahibi
router.put('/isletme/:id', dogrulaToken, isletmeSahibiOl, async (req, res) => {
  try {
    const { hedefZiyaret, hediye, vipHedef, vipHediye } = req.body;

    const guncelleme = { 'odul.hedefZiyaret': hedefZiyaret, 'odul.hediye': hediye };
    if (vipHedef !== undefined) guncelleme['odul.vipHedef'] = vipHedef;
    if (vipHediye !== undefined) guncelleme['odul.vipHediye'] = vipHediye;

    // Bu işletmedeki tüm sadakat kartlarını güncelle
    await Sadakat.updateMany(
      { isletme: req.params.id },
      guncelleme
    );

    res.json({ mesaj: 'Sadakat ayarları güncellendi' });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// İşletmenin sadakat listesini getir
router.get('/isletme/:isletmeId', async (req, res) => {
  try {
    const sadakatlar = await Sadakat.find({ isletme: req.params.isletmeId })
      .populate('musteri', 'ad soyad email');
    res.json(sadakatlar);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Ödülü kullanıldı olarak işaretle
router.put('/:id/odul-kullan', async (req, res) => {
  try {
    const { odulIndex } = req.body;
    const sadakat = await Sadakat.findById(req.params.id);

    if (!sadakat) return res.status(404).json({ hata: 'Bulunamadı' });

    sadakat.kazanilanOduller[odulIndex].kullanildi = true;
    await sadakat.save();

    res.json({ mesaj: 'Ödül kullanıldı olarak işaretlendi' });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

module.exports = router;