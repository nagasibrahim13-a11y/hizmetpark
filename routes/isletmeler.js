const express = require('express');
const router = express.Router();
const Isletme = require('../models/Isletme');

// Yakındaki işletmeleri listele
router.get('/yakinimda', async (req, res) => {
  try {
    const { lat, lng, mesafe, kategori } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ hata: 'lat ve lng parametreleri zorunludur' });
    }
    const filtre = {
      konum: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: mesafe ? parseInt(mesafe) : 5000
        }
      },
      'konum.type': { $exists: true }
    };
    if (kategori) filtre.kategori = kategori;
    const isletmeler = await Isletme.find(filtre)
      .populate('sahip', 'ad soyad')
      .limit(20);
    res.json(isletmeler);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Tüm işletmeleri listele
router.get('/', async (req, res) => {
  try {
    const { kategori, il } = req.query;
    let filtre = {};
    if (kategori) filtre.kategori = kategori;
    if (il) filtre['adres.il'] = il;
    const isletmeler = await Isletme.find(filtre).populate('sahip', 'ad soyad email');
    res.json(isletmeler);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Tek işletme getir
router.get('/:id', async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id).populate('sahip', 'ad soyad');
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
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

// Hizmet ekle
router.post('/:id/hizmet', async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    isletme.hizmetler.push(req.body);
    await isletme.save();
    res.json({ mesaj: 'Hizmet eklendi', isletme });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Hizmet güncelle
router.put('/:id/hizmet/:hizmetId', async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    const hizmet = isletme.hizmetler.id(req.params.hizmetId);
    if (!hizmet) return res.status(404).json({ hata: 'Hizmet bulunamadı' });
    hizmet.ad = req.body.ad;
    hizmet.sure = req.body.sure;
    hizmet.fiyat = req.body.fiyat;
    await isletme.save();
    res.json({ mesaj: 'Hizmet güncellendi', isletme });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Hizmet sil
router.delete('/:id/hizmet/:hizmetId', async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    isletme.hizmetler = isletme.hizmetler.filter(
      h => h._id.toString() !== req.params.hizmetId
    );
    await isletme.save();
    res.json({ mesaj: 'Hizmet silindi' });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Kapalı tarih ekle
router.put('/:id/kapali-tarih', async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    isletme.kapaliTarihler.push(req.body);
    await isletme.save();
    console.log('[KAPALI TARIH EKLENDI] isletmeId:', req.params.id,
      '| tarih:', req.body.tarih,
      '| tumGun:', req.body.tumGun,
      '| DB kaydi:', isletme.kapaliTarihler[isletme.kapaliTarihler.length - 1]);
    res.json({ mesaj: 'Kapalı tarih eklendi', isletme });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Kapalı tarih kaldır
router.delete('/:id/kapali-tarih/:tarihId', async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    isletme.kapaliTarihler = isletme.kapaliTarihler.filter(
      t => t._id.toString() !== req.params.tarihId
    );
    await isletme.save();
    res.json({ mesaj: 'Kapalı tarih kaldırıldı' });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Personel listesi
router.get('/:id/personel', async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    res.json(isletme.personel);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Personel ekle
router.post('/:id/personel', async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    isletme.personel.push(req.body);
    await isletme.save();
    res.status(201).json({ mesaj: 'Personel eklendi', personel: isletme.personel });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Personel sil
router.delete('/:id/personel/:personelId', async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    isletme.personel = isletme.personel.filter(
      p => p._id.toString() !== req.params.personelId
    );
    await isletme.save();
    res.json({ mesaj: 'Personel silindi', personel: isletme.personel });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Premium aktif et (admin kullanır)
router.put('/:id/premium', async (req, res) => {
  try {
    const { paket } = req.body; // 'aylik' veya 'yillik'
    const sure = paket === 'yillik' ? 365 : 30;
    const bitis = new Date();
    bitis.setDate(bitis.getDate() + sure);
    const isletme = await Isletme.findByIdAndUpdate(
      req.params.id,
      { premium: { aktif: true, baslangic: new Date(), bitis, paket } },
      { new: true }
    );
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    res.json({ mesaj: 'Premium aktif edildi', premium: isletme.premium });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Premium iptal et
router.put('/:id/premium/iptal', async (req, res) => {
  try {
    const isletme = await Isletme.findByIdAndUpdate(
      req.params.id,
      { premium: { aktif: false, baslangic: null, bitis: null, paket: null } },
      { new: true }
    );
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    res.json({ mesaj: 'Premium iptal edildi' });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

module.exports = router;