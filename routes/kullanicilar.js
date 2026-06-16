const express = require('express');
const router = express.Router();
const Kullanici = require('../models/User');

// Kayıt ol
router.post('/kayit', async (req, res) => {
  try {
    const { ad, soyad, email, sifre, telefon, rol } = req.body;

    // Aynı email var mı?
    const mevcutKullanici = await Kullanici.findOne({ email });
    if (mevcutKullanici) {
      return res.status(400).json({ hata: 'Bu email zaten kayıtlı' });
    }

    const kullanici = await Kullanici.create({
      ad, soyad, email, sifre, telefon, rol
    });

    res.status(201).json({
      mesaj: 'Kayıt başarılı',
      kullanici: {
        id: kullanici._id,
        ad: kullanici.ad,
        email: kullanici.email,
        rol: kullanici.rol
      }
    });

  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Giriş yap
router.post('/giris', async (req, res) => {
  try {
    const { email, sifre } = req.body;

    const kullanici = await Kullanici.findOne({ email, sifre });
    if (!kullanici) {
      return res.status(400).json({ hata: 'Email veya şifre hatalı' });
    }

    res.json({
      mesaj: 'Giriş başarılı',
      kullanici: {
        id: kullanici._id,
        ad: kullanici.ad,
        email: kullanici.email,
        rol: kullanici.rol
      }
    });

  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Tüm kullanıcıları listele
router.get('/', async (req, res) => {
  try {
    const kullanicilar = await Kullanici.find().select('-sifre');
    res.json(kullanicilar);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

module.exports = router;