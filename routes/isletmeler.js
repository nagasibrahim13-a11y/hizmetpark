const express = require('express');
const router = express.Router();
const Isletme = require('../models/Isletme');

// Tüm işletmeleri listele
router.get('/', async (req, res) => {
  try {
    const { kategori, il } = req.query;
    let filtre = {};

    if (kategori) filtre.kategori = kategori;
    if (il) filtre['adres.il'] = il;

    const isletmeler = await Isletme.find(filtre)
      .populate('sahip', 'ad soyad email');

    res.json(isletmeler);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Tek işletme getir
router.get('/:id', async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id)
      .populate('sahip', 'ad soyad');

    if (!isletme) {
      return res.status(404).json({ hata: 'İşletme bulunamadı' });
    }

    res.json(isletme);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Yeni işletme oluştur
router.post('/', async (req, res) => {
  try {
    const isletme = await Isletme.create(req.body);
    res.status(201).json({ mesaj: 'İşletme oluşturuldu', isletme });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// İşletme güncelle
router.put('/:id', async (req, res) => {
  try {
    const isletme = await Isletme.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ mesaj: 'İşletme güncellendi', isletme });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

module.exports = router;