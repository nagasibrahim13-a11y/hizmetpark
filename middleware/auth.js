const jwt = require('jsonwebtoken');
const Isletme = require('../models/Isletme');

const dogrulaToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ hata: 'Oturum açmanız gerekiyor' });
  }
  try {
    req.kullanici = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ hata: 'Geçersiz veya süresi dolmuş oturum' });
  }
};

const isletmeSahibiOl = async (req, res, next) => {
  try {
    const isletme = await Isletme.findById(req.params.id).select('sahip');
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });
    if (isletme.sahip.toString() !== req.kullanici.id) {
      return res.status(403).json({ hata: 'Bu işlem için yetkiniz yok' });
    }
    next();
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
};

// İşletmenin aktif bir ücretli/deneme planı olup olmadığını kontrol eder
const planAktifMi = (isletme) =>
  !!(isletme.premium?.aktif &&
     isletme.premium.bitis &&
     new Date(isletme.premium.bitis) > new Date());

// Belirli bir özelliğe erişim için plan kontrolü
// ozellik: 'personelEkle' | 'gelismisRapor' | 'vipAnaliz' | 'kampanya'
const planKontrol = (ozellik) => async (req, res, next) => {
  try {
    const isletmeId = req.params.id || req.params.isletmeId;
    const isletme = await Isletme.findById(isletmeId).select('premium personel');
    if (!isletme) return res.status(404).json({ hata: 'İşletme bulunamadı' });

    if (planAktifMi(isletme)) return next();

    // Ücretsiz plan limitleri
    if (ozellik === 'personelEkle') {
      const aktifSayi = isletme.personel.filter(p => p.aktif !== false).length;
      if (aktifSayi >= 1) {
        return res.status(403).json({
          hata: 'Planınızı yükseltin',
          detay: 'Ücretsiz planda en fazla 1 personel ekleyebilirsiniz.',
          planYukselt: true,
        });
      }
    } else if (['gelismisRapor', 'vipAnaliz', 'kampanya'].includes(ozellik)) {
      return res.status(403).json({
        hata: 'Planınızı yükseltin',
        detay: 'Bu özellik ücretli plana sahip işletmeler için kullanılabilir.',
        planYukselt: true,
      });
    }

    next();
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
};

module.exports = { dogrulaToken, isletmeSahibiOl, planKontrol, planAktifMi };
