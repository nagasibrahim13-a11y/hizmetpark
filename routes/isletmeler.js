const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Isletme = require('../models/Isletme');
const { dogrulaToken, isletmeSahibiOl, planKontrol } = require('../middleware/auth');

// Yakındaki işletmeleri listele
router.get('/yakinimda', async (req, res) => {
  try {
    const { lat, lng, mesafe, kategori } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ hata: 'lat ve lng parametreleri zorunludur' });
    }

    const matchFiltre = { 'konum.type': { $exists: true } };
    if (kategori) matchFiltre.kategori = kategori;

    const isletmeler = await Isletme.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'mesafeMetre',
          maxDistance: mesafe ? parseInt(mesafe) : 5000,
          spherical: true,
          query: matchFiltre
        }
      },
      { $limit: 20 },
      {
        $lookup: {
          from: 'kullanicis',
          localField: 'sahip',
          foreignField: '_id',
          as: 'sahipBilgi'
        }
      },
      { $unwind: { path: '$sahipBilgi', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          sahip: { ad: '$sahipBilgi.ad', soyad: '$sahipBilgi.soyad' }
        }
      },
      { $unset: 'sahipBilgi' }
    ]);

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

// Yeni işletme oluştur — sadece giriş yapmış kullanıcılar; sahip token'dan alınır
router.post('/', dogrulaToken, async (req, res) => {
  try {
    const Kullanici = require('../models/User');

    // İlk 10 işletme 90 gün deneme, sonrakiler 7 gün
    const mevcutSayi = await Isletme.countDocuments();
    const denemeGun = mevcutSayi < 10 ? 90 : 7;
    const denemeBitis = new Date();
    denemeBitis.setDate(denemeBitis.getDate() + denemeGun);

    const isletme = await Isletme.create({
      ...req.body,
      sahip: req.kullanici.id,
      premium: {
        aktif: true,
        baslangic: new Date(),
        bitis: denemeBitis,
        paket: 'deneme',
      },
    });

    // İşletme yaratmak kullanıcıyı otomatik 'isletme' rolüne yükseltir
    const kullanici = await Kullanici.findByIdAndUpdate(
      req.kullanici.id,
      { rol: 'isletme' },
      { new: true }
    );
    // Güncel rol içeren yeni token döndür (kayıt akışında otomatik giriş için)
    const yeniToken = jwt.sign(
      { id: kullanici._id, rol: kullanici.rol },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.status(201).json({
      mesaj: 'İşletme oluşturuldu',
      isletme,
      token: yeniToken,
      kullanici: { id: kullanici._id, ad: kullanici.ad, email: kullanici.email, rol: kullanici.rol },
    });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// İşletme güncelle — sadece sahip
// Whitelist: premium, sahip, ortalamaPuan, yorumSayisi gibi sistem alanları body'den alınamaz
router.put('/:id', dogrulaToken, isletmeSahibiOl, async (req, res) => {
  try {
    const {
      isletmeAdi, kategori, slogan, hakkinda, fotograf,
      adres, konum, telefon,
      calismaGunleri, calismaBaslangic, calismaBitis,
      aktif,
    } = req.body;

    const guncelleme = {};
    if (isletmeAdi   !== undefined) guncelleme.isletmeAdi        = isletmeAdi;
    if (kategori     !== undefined) guncelleme.kategori          = kategori;
    if (slogan       !== undefined) guncelleme.slogan            = slogan;
    if (hakkinda     !== undefined) guncelleme.hakkinda          = hakkinda;
    if (fotograf     !== undefined) guncelleme.fotograf          = fotograf;
    if (adres        !== undefined) guncelleme.adres             = adres;
    if (konum        !== undefined) guncelleme.konum             = konum;
    if (telefon      !== undefined) guncelleme.telefon           = telefon;
    if (calismaGunleri  !== undefined) guncelleme.calismaGunleri  = calismaGunleri;
    if (calismaBaslangic !== undefined) guncelleme.calismaBaslangic = calismaBaslangic;
    if (calismaBitis !== undefined) guncelleme.calismaBitis      = calismaBitis;
    if (aktif        !== undefined) guncelleme.aktif             = aktif;

    const isletme = await Isletme.findByIdAndUpdate(
      req.params.id,
      guncelleme,
      { new: true }
    );
    res.json({ mesaj: 'İşletme güncellendi', isletme });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Hizmet ekle — sadece sahip
router.post('/:id/hizmet', dogrulaToken, isletmeSahibiOl, async (req, res) => {
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

// Hizmet güncelle — sadece sahip
router.put('/:id/hizmet/:hizmetId', dogrulaToken, isletmeSahibiOl, async (req, res) => {
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

// Hizmet sil — sadece sahip
router.delete('/:id/hizmet/:hizmetId', dogrulaToken, isletmeSahibiOl, async (req, res) => {
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

// Kapalı tarih ekle — sadece sahip
router.put('/:id/kapali-tarih', dogrulaToken, isletmeSahibiOl, async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    isletme.kapaliTarihler.push(req.body);
    await isletme.save();
    res.json({ mesaj: 'Kapalı tarih eklendi', isletme });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Kapalı tarih kaldır — sadece sahip
router.delete('/:id/kapali-tarih/:tarihId', dogrulaToken, isletmeSahibiOl, async (req, res) => {
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

// Personel ekle — sadece sahip; ücretsiz planda max 1 personel
router.post('/:id/personel', dogrulaToken, isletmeSahibiOl, planKontrol('personelEkle'), async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    const { ad, unvan, telefon, maas, kullaniciAdi, sifre, calismaGunleri, yetkiliHizmetler } = req.body;
    const sifreHash = sifre ? await bcrypt.hash(sifre, 10) : '';
    isletme.personel.push({
      ad,
      unvan: unvan || 'Çalışan',
      telefon: telefon || '',
      maas: maas || 0,
      kullaniciAdi: kullaniciAdi || '',
      sifre: sifreHash,
      calismaGunleri: calismaGunleri && calismaGunleri.length > 0 ? calismaGunleri : ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],
      yetkiliHizmetler: yetkiliHizmetler || []
    });
    await isletme.save();
    res.status(201).json({ mesaj: 'Personel eklendi', personel: isletme.personel });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Personel sil — sadece sahip
router.delete('/:id/personel/:personelId', dogrulaToken, isletmeSahibiOl, async (req, res) => {
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

// Premium aktif et — sadece sahip
router.put('/:id/premium', dogrulaToken, isletmeSahibiOl, async (req, res) => {
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

// Premium iptal et — sadece sahip
router.put('/:id/premium/iptal', dogrulaToken, isletmeSahibiOl, async (req, res) => {
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

// Personel güncelle — sadece sahip
router.put('/:id/personel/:personelId', dogrulaToken, isletmeSahibiOl, async (req, res) => {
  try {
    const { ad, unvan, telefon, maas, kullaniciAdi, sifre, calismaGunleri, yetkiliHizmetler } = req.body;
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });

    const personel = isletme.personel.id(req.params.personelId);
    if (!personel) return res.status(404).json({ hata: 'Personel bulunamadı' });

    if (ad !== undefined) personel.ad = ad;
    if (unvan !== undefined) personel.unvan = unvan;
    if (telefon !== undefined) personel.telefon = telefon;
    if (maas !== undefined) personel.maas = maas;
    if (kullaniciAdi !== undefined) personel.kullaniciAdi = kullaniciAdi;
    if (sifre) personel.sifre = await bcrypt.hash(sifre, 10);
    if (calismaGunleri !== undefined) personel.calismaGunleri = calismaGunleri;
    if (yetkiliHizmetler !== undefined) personel.yetkiliHizmetler = yetkiliHizmetler;

    await isletme.save();
    res.json({ mesaj: 'Personel güncellendi', personel: isletme.personel });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Gider ekle — sadece sahip
router.post('/:id/gider', dogrulaToken, isletmeSahibiOl, async (req, res) => {
  try {
    const { ad, tutar } = req.body;
    if (!ad || tutar == null) return res.status(400).json({ hata: 'Gider adı ve tutar gerekli' });
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    isletme.giderler.push({ ad, tutar });
    await isletme.save();
    res.status(201).json({ mesaj: 'Gider eklendi', giderler: isletme.giderler });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Gider sil — sadece sahip
router.delete('/:id/gider/:giderId', dogrulaToken, isletmeSahibiOl, async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    isletme.giderler = isletme.giderler.filter(g => g._id.toString() !== req.params.giderId);
    await isletme.save();
    res.json({ mesaj: 'Gider silindi', giderler: isletme.giderler });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Net kar hesabı
router.get('/:id/net-kar', async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });

    const { baslangic, bitis } = req.query;
    const Randevu = require('../models/Randevu');

    const filtre = { isletme: req.params.id, durum: 'tamamlandi', hediyeMi: { $ne: true } };
    if (baslangic || bitis) {
      filtre.tarih = {};
      if (baslangic) filtre.tarih.$gte = new Date(baslangic);
      if (bitis) {
        const bitisTarih = new Date(bitis);
        bitisTarih.setHours(23, 59, 59, 999);
        filtre.tarih.$lte = bitisTarih;
      }
    }

    const randevular = await Randevu.find(filtre);
    const toplamCiro = randevular.reduce((t, r) => {
      const tutar = Array.isArray(r.hizmet) ? r.hizmet.reduce((s, h) => s + (h.fiyat || 0), 0) : (r.hizmet?.fiyat || 0);
      return t + tutar;
    }, 0);

    const toplamMaas = isletme.personel.reduce((t, p) => t + (p.maas || 0), 0);
    const toplamGider = isletme.giderler.reduce((t, g) => t + (g.tutar || 0), 0);
    const netKar = toplamCiro - toplamMaas - toplamGider;

    res.json({ toplamCiro, toplamMaas, toplamGider, netKar });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Personele izin tarihi ekle — sadece sahip
router.post('/:id/personel/:personelId/izin', dogrulaToken, isletmeSahibiOl, async (req, res) => {
  try {
    const { tarih, tumGun, saatler, aciklama } = req.body;
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });

    const personel = isletme.personel.id(req.params.personelId);
    if (!personel) return res.status(404).json({ hata: 'Personel bulunamadı' });

    personel.izinTarihleri.push({ tarih, tumGun: tumGun !== false, saatler: saatler || [], aciklama: aciklama || '' });
    await isletme.save();
    res.status(201).json({ mesaj: 'İzin eklendi', izinTarihleri: personel.izinTarihleri });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Personel izin tarihi sil — sadece sahip
router.delete('/:id/personel/:personelId/izin/:izinId', dogrulaToken, isletmeSahibiOl, async (req, res) => {
  try {
    const isletme = await Isletme.findById(req.params.id);
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });

    const personel = isletme.personel.id(req.params.personelId);
    if (!personel) return res.status(404).json({ hata: 'Personel bulunamadı' });

    personel.izinTarihleri = personel.izinTarihleri.filter(i => i._id.toString() !== req.params.izinId);
    await isletme.save();
    res.json({ mesaj: 'İzin silindi', izinTarihleri: personel.izinTarihleri });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Personel girişi
router.post('/personel-giris', async (req, res) => {
  try {
    const { kullaniciAdi, sifre } = req.body;
    if (!kullaniciAdi || !sifre) {
      return res.status(400).json({ hata: 'Kullanıcı adı ve şifre gerekli' });
    }

    const isletme = await Isletme.findOne({ 'personel.kullaniciAdi': kullaniciAdi });
    if (!isletme) {
      return res.status(401).json({ hata: 'Kullanıcı adı veya şifre hatalı' });
    }

    const personel = isletme.personel.find(p => p.kullaniciAdi === kullaniciAdi);
    const sifreEslesti = personel?.sifre ? await bcrypt.compare(sifre, personel.sifre) : false;
    if (!personel || !sifreEslesti) {
      return res.status(401).json({ hata: 'Kullanıcı adı veya şifre hatalı' });
    }

    res.json({
      personelId: personel._id,
      ad: personel.ad,
      unvan: personel.unvan,
      isletmeId: isletme._id,
      isletmeAdi: isletme.isletmeAdi,
      rol: 'personel'
    });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

module.exports = router;