const express = require('express');
const router = express.Router();
const Yorum = require('../models/Yorum');
const Isletme = require('../models/Isletme');
const Randevu = require('../models/Randevu');

// Yorum ekle
router.post('/', async (req, res) => {
  try {
    const { musteri, isletme, randevu, puan, yorum } = req.body;

    // Randevu tamamlandı mı kontrol et
    if (randevu) {
      const randevuKontrol = await Randevu.findById(randevu);
      if (!randevuKontrol || randevuKontrol.durum !== 'tamamlandi') {
        return res.status(400).json({ hata: 'Sadece tamamlanan randevular için yorum yapılabilir' });
      }
      // Aynı randevuya iki yorum yazılmasın
      const mevcutYorum = await Yorum.findOne({ randevu });
      if (mevcutYorum) {
        return res.status(400).json({ hata: 'Bu randevu için zaten yorum yapıldı' });
      }
    }

    const yeniYorum = await Yorum.create({ musteri, isletme, randevu, puan, yorum });

    // İşletmenin ortalama puanını güncelle
    const tumYorumlar = await Yorum.find({ isletme });
    const ortalama = tumYorumlar.reduce((t, y) => t + y.puan, 0) / tumYorumlar.length;

    await Isletme.findByIdAndUpdate(isletme, {
      ortalamaPuan: Math.round(ortalama * 10) / 10,
      yorumSayisi: tumYorumlar.length
    });

    res.status(201).json({ mesaj: 'Yorum eklendi', yorum: yeniYorum });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// İşletmenin yorumlarını getir
router.get('/isletme/:isletmeId', async (req, res) => {
  try {
    const yorumlar = await Yorum.find({ isletme: req.params.isletmeId })
      .populate('musteri', 'ad soyad')
      .sort({ tarih: -1 });
    res.json(yorumlar);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Müşterinin tamamlanan randevularını getir (yorum yapılabilecekler)
router.get('/tamamlanan/:musteriId', async (req, res) => {
  try {
    const randevular = await Randevu.find({
      musteri: req.params.musteriId,
      durum: 'tamamlandi'
    }).populate('isletme', 'isletmeAdi kategori');

    // Yorum yapılmamış olanları filtrele
    const yorumsuzlar = [];
    for (const r of randevular) {
      const yorum = await Yorum.findOne({ randevu: r._id });
      if (!yorum) yorumsuzlar.push(r);
    }

    res.json(yorumsuzlar);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Müşterinin yorumlarını getir
router.get('/musteri/:musteriId', async (req, res) => {
  try {
    const yorumlar = await Yorum.find({ musteri: req.params.musteriId })
      .populate('isletme', 'isletmeAdi kategori')
      .sort({ tarih: -1 });
    res.json(yorumlar);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

module.exports = router;