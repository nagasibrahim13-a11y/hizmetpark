const express = require('express');
const router = express.Router();
const Randevu = require('../models/Randevu');
const Sadakat = require('../models/Sadakat');

// Randevu oluştur
router.post('/', async (req, res) => {
  try {
    const randevu = await Randevu.create(req.body);
    res.status(201).json({ mesaj: 'Randevu oluşturuldu', randevu });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// İşletmenin randevularını getir
router.get('/isletme/:isletmeId', async (req, res) => {
  try {
    const randevular = await Randevu.find({ isletme: req.params.isletmeId })
      .populate('musteri', 'ad soyad telefon')
      .sort({ tarih: 1, saat: 1 });

    res.json(randevular);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Müşterinin randevularını getir
router.get('/musteri/:musteriId', async (req, res) => {
  try {
    const randevular = await Randevu.find({ musteri: req.params.musteriId })
      .populate('isletme', 'isletmeAdi kategori adres')
      .sort({ tarih: -1 });

    res.json(randevular);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Randevu onayla / reddet
router.put('/:id/durum', async (req, res) => {
  try {
    const { durum } = req.body;
    const randevu = await Randevu.findByIdAndUpdate(
      req.params.id,
      { durum },
      { new: true }
    ).populate('musteri', 'ad soyad');

    // Randevu tamamlandıysa sadakat puanı ekle
    if (durum === 'tamamlandi') {
      let sadakat = await Sadakat.findOne({
        musteri: randevu.musteri._id,
        isletme: randevu.isletme
      });

      if (!sadakat) {
        sadakat = await Sadakat.create({
          musteri: randevu.musteri._id,
          isletme: randevu.isletme
        });
      }

      sadakat.mevcutPuan += 1;
      sadakat.toplamZiyaret += 1;

      // Ödül kazandı mı?
      if (sadakat.mevcutPuan >= sadakat.odul.hedefZiyaret) {
        sadakat.kazanilanOduller.push({
          tarih: new Date(),
          hediye: sadakat.odul.hediye,
          kullanildi: false
        });
        sadakat.mevcutPuan = 0;
        console.log('🎁 Müşteri ödül kazandı!');
      }

      sadakat.sonGuncelleme = new Date();
      await sadakat.save();
    }

    res.json({ mesaj: `Randevu ${durum}`, randevu });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

module.exports = router;