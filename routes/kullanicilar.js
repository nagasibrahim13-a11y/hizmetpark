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

// Profil güncelle
router.put('/:id', async (req, res) => {
  try {
    const { ad, soyad, telefon, fotograf } = req.body;
    const guncelleme = {};
    if (ad !== undefined) guncelleme.ad = ad;
    if (soyad !== undefined) guncelleme.soyad = soyad;
    if (telefon !== undefined) guncelleme.telefon = telefon;
    if (fotograf !== undefined) guncelleme.fotograf = fotograf;

    const kullanici = await Kullanici.findByIdAndUpdate(req.params.id, guncelleme, { new: true });
    if (!kullanici) return res.status(404).json({ hata: 'Kullanıcı bulunamadı' });

    res.json({
      id: kullanici._id,
      ad: kullanici.ad,
      soyad: kullanici.soyad,
      email: kullanici.email,
      telefon: kullanici.telefon,
      fotograf: kullanici.fotograf,
      rol: kullanici.rol,
      favoriler: kullanici.favoriler
    });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Favori ekle/çıkar (toggle)
router.put('/:id/favori/:isletmeId', async (req, res) => {
  try {
    const kullanici = await Kullanici.findById(req.params.id);
    if (!kullanici) return res.status(404).json({ hata: 'Kullanıcı bulunamadı' });
    const index = kullanici.favoriler.findIndex(f => f.toString() === req.params.isletmeId);
    if (index > -1) {
      kullanici.favoriler.splice(index, 1);
    } else {
      kullanici.favoriler.push(req.params.isletmeId);
    }
    await kullanici.save();
    res.json({ favoriler: kullanici.favoriler });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Favori listesi (işletme detaylarıyla)
router.get('/:id/favoriler', async (req, res) => {
  try {
    const kullanici = await Kullanici.findById(req.params.id).populate('favoriler');
    if (!kullanici) return res.status(404).json({ hata: 'Kullanıcı bulunamadı' });
    res.json(kullanici.favoriler);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

module.exports = router;