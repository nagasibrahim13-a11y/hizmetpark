const express = require('express');
const router = express.Router();
const Randevu = require('../models/Randevu');
const Sadakat = require('../models/Sadakat');

// Randevu oluştur
router.post('/', async (req, res) => {
  try {
    const { hediyeMi, sadakatId } = req.body;

    // Hediye randevu ise sadakat kartını kontrol et
    if (hediyeMi && sadakatId) {
      const sadakat = await Sadakat.findById(sadakatId);
      if (!sadakat) return res.status(400).json({ hata: 'Sadakat kartı bulunamadı' });

      const bekleyenOdul = sadakat.kazanilanOduller.find(o => !o.kullanildi);
      if (!bekleyenOdul) return res.status(400).json({ hata: 'Kullanılabilir ödül yok' });

      // Ödülü kullanıldı olarak işaretle
      bekleyenOdul.kullanildi = true;
      await sadakat.save();
    }

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

// Randevu durum güncelle
router.put('/:id/durum', async (req, res) => {
  try {
    const { durum } = req.body;
    const randevu = await Randevu.findByIdAndUpdate(
      req.params.id,
      { durum },
      { new: true }
    ).populate('musteri', 'ad soyad');

    // Tamamlandıysa sadakat puanı ekle (hediye randevu değilse)
    if (durum === 'tamamlandi' && !randevu.hediyeMi) {
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
      }

      sadakat.sonGuncelleme = new Date();
      await sadakat.save();
    }

    res.json({ mesaj: `Randevu ${durum}`, randevu });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Toplu tamamla (test için)
router.put('/toplu-tamamla', async (req, res) => {
  try {
    const { musteriId } = req.body;

    // Tüm bekleyen/onaylanan randevuları getir
    const randevular = await Randevu.find({
      musteri: musteriId,
      durum: { $in: ['bekliyor', 'onaylandi'] },
      hediyeMi: { $ne: true }
    });

    // Her randevu için sadakat puanı ekle
    for (const r of randevular) {
      let sadakat = await Sadakat.findOne({
        musteri: musteriId,
        isletme: r.isletme
      });

      if (!sadakat) {
        sadakat = await Sadakat.create({
          musteri: musteriId,
          isletme: r.isletme
        });
      }

      sadakat.mevcutPuan += 1;
      sadakat.toplamZiyaret += 1;

      if (sadakat.mevcutPuan >= sadakat.odul.hedefZiyaret) {
        sadakat.kazanilanOduller.push({
          tarih: new Date(),
          hediye: sadakat.odul.hediye,
          kullanildi: false
        });
        sadakat.mevcutPuan = 0;
      }

      sadakat.sonGuncelleme = new Date();
      await sadakat.save();

      // Randevuyu tamamlandı olarak işaretle
      r.durum = 'tamamlandi';
      await r.save();
    }

    res.json({ mesaj: `${randevular.length} randevu tamamlandı ve sadakat güncellendi` });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

module.exports = router;