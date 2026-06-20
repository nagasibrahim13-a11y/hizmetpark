const express = require('express');
const router = express.Router();
const Randevu = require('../models/Randevu');
const Sadakat = require('../models/Sadakat');
const Isletme = require('../models/Isletme');

// Saati geçmiş onaylanan randevuları otomatik tamamla + sadakat puanı ekle
const otomatikTamamla = async () => {
  try {
    const simdi = new Date();
    const gecikenler = await Randevu.find({
      durum: 'onaylandi',
      tarih: { $lte: simdi }
    }).populate('musteri', 'ad soyad');

    for (const randevu of gecikenler) {
      // Saat kontrolü: tarih alanı sadece gün bilgisi taşıyorsa, saat alanını da kontrol et
      const randevuZamani = new Date(randevu.tarih);
      const [saat, dakika] = (randevu.saat || '00:00').split(':');
      randevuZamani.setHours(parseInt(saat), parseInt(dakika), 0, 0);

      if (randevuZamani > simdi) continue; // henüz saati gelmemiş

      randevu.durum = 'tamamlandi';
      await randevu.save();

      // Sadakat puanı ekle (hediye randevu değilse, müşteri varsa)
      if (!randevu.hediyeMi && randevu.musteri) {
        let sadakat = await Sadakat.findOne({ musteri: randevu.musteri._id, isletme: randevu.isletme });
        if (!sadakat) {
          sadakat = await Sadakat.create({ musteri: randevu.musteri._id, isletme: randevu.isletme });
        }
        sadakat.mevcutPuan += 1;
        sadakat.toplamZiyaret += 1;
        if (sadakat.mevcutPuan >= sadakat.odul.hedefZiyaret) {
          sadakat.kazanilanOduller.push({ tarih: new Date(), hediye: sadakat.odul.hediye, kullanildi: false });
          sadakat.mevcutPuan = 0;
        }
        sadakat.sonGuncelleme = new Date();
        await sadakat.save();
      }
    }
  } catch (hata) {
    console.error('Otomatik tamamlama hatası:', hata.message);
  }
};

// Randevu oluştur
router.post('/', async (req, res) => {
  try {
    const { hediyeMi, sadakatId, isletme: isletmeId, tarih, saat } = req.body;

    // Kapalı tarih kontrolü
    if (isletmeId && tarih) {
      const isletmeDoc = await Isletme.findById(isletmeId);
      const tarihStr = new Date(tarih).toISOString().split('T')[0];
      console.log('[RANDEVU KONTROL] isletmeId:', isletmeId,
        '| istenen tarih:', tarihStr,
        '| saat:', saat,
        '| kapaliTarihSayisi:', isletmeDoc?.kapaliTarihler?.length ?? 'isletme bulunamadi');
      if (isletmeDoc && isletmeDoc.kapaliTarihler?.length > 0) {
        const kapali = isletmeDoc.kapaliTarihler.find(kt => {
          const ktStr = new Date(kt.tarih).toISOString().split('T')[0];
          const eslesti = ktStr === tarihStr && (kt.tumGun || kt.saatler?.includes(saat));
          if (eslesti) console.log('[RANDEVU KONTROL] KAPALI ESLESTI:', { ktStr, tumGun: kt.tumGun, saatler: kt.saatler });
          return eslesti;
        });
        if (kapali) {
          return res.status(400).json({ hata: 'Bu tarih ve saatte işletme kapalıdır.' });
        }
      }
    }

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

    // Personel müsaitlik kontrolü
    const { personel: personelId } = req.body;
    if (personelId && isletmeId && tarih) {
      const isletmeDoc2 = await Isletme.findById(isletmeId);
      const personelDoc = isletmeDoc2?.personel?.find(p => p._id.toString() === personelId);

      if (personelDoc) {
        const tarihObj = new Date(tarih);
        const gunler = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
        const gunAdi = gunler[tarihObj.getDay()];

        // Çalışma günü kontrolü
        if (!personelDoc.calismaGunleri.includes(gunAdi)) {
          return res.status(400).json({ hata: `${personelDoc.ad} bu gün çalışmıyor.` });
        }

        // İzin tarihi kontrolü
        const tarihStr = tarihObj.toISOString().split('T')[0];
        const izinli = personelDoc.izinTarihleri?.find(izin => {
          const izinStr = new Date(izin.tarih).toISOString().split('T')[0];
          return izinStr === tarihStr && (izin.tumGun || izin.saatler?.includes(saat));
        });
        if (izinli) {
          return res.status(400).json({ hata: `${personelDoc.ad} bu tarihte izinli.` });
        }

        // Hizmet yetkisi kontrolü
        if (personelDoc.yetkiliHizmetler && personelDoc.yetkiliHizmetler.length > 0) {
          const istenenHizmetler = Array.isArray(req.body.hizmet) ? req.body.hizmet.map(h => h.ad) : [req.body.hizmet?.ad];
          const yetkisizHizmet = istenenHizmetler.find(h => !personelDoc.yetkiliHizmetler.includes(h));
          if (yetkisizHizmet) {
            return res.status(400).json({ hata: `${personelDoc.ad} "${yetkisizHizmet}" hizmetini veremiyor.` });
          }
        }
      }
    }

    // Çakışma kontrolü
    const { isletme: isletmeId2, tarih: tarih2, saat: saat2, personel } = req.body;
    const cakismaFiltre = {
      isletme: isletmeId2,
      tarih: tarih2,
      saat: saat2,
      durum: { $in: ['bekliyor', 'onaylandi'] }
    };
    if (personel) cakismaFiltre.personel = personel;
    const cakisan = await Randevu.findOne(cakismaFiltre);
    if (cakisan) {
      return res.status(409).json({ hata: 'Bu saat dolu, lütfen başka bir saat seçin' });
    }

    const yeniRandevu = await Randevu.create({ ...req.body, durum: 'onaylandi' });
    res.status(201).json(yeniRandevu);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// İşletme doluluk durumu
router.get('/isletme/:isletmeId/doluluk', async (req, res) => {
  try {
    const { isletmeId } = req.params;
    const { tarih } = req.query;
    if (!tarih) return res.status(400).json({ hata: 'tarih parametresi zorunlu' });

    const baslangic = new Date(tarih);
    const bitis = new Date(tarih);
    bitis.setDate(bitis.getDate() + 1);

    const randevular = await Randevu.find({
      isletme: isletmeId,
      tarih: { $gte: baslangic, $lt: bitis },
      durum: { $in: ['bekliyor', 'onaylandi'] }
    });

    const saatSayac = {};
    randevular.forEach(r => {
      if (!saatSayac[r.saat]) saatSayac[r.saat] = 0;
      saatSayac[r.saat]++;
    });

    res.json({ tarih, doluluk: saatSayac });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// İşletme analitikleri
router.get('/isletme/:isletmeId/analitik', async (req, res) => {
  try {
    const { isletmeId } = req.params;
    const otuzGunOnce = new Date();
    otuzGunOnce.setDate(otuzGunOnce.getDate() - 30);

    const tumRandevular = await Randevu.find({ isletme: isletmeId })
      .populate('musteri', 'ad soyad');

    const sonOtuzGun = tumRandevular.filter(r => new Date(r.tarih) >= otuzGunOnce);

    // Günlük istatistikler
    const gunlukMap = {};
    sonOtuzGun.forEach(r => {
      const gun = new Date(r.tarih).toISOString().split('T')[0];
      if (!gunlukMap[gun]) gunlukMap[gun] = { tarih: gun, randevu: 0, ciro: 0 };
      gunlukMap[gun].randevu++;
      if (r.durum === 'tamamlandi' && !r.hediyeMi) {
        const tutar = Array.isArray(r.hizmet) ? r.hizmet.reduce((t, h) => t + (h.fiyat || 0), 0) : (r.hizmet?.fiyat || 0);
        gunlukMap[gun].ciro += tutar;
      }
    });
    const gunlukVeriler = Object.values(gunlukMap).sort((a, b) => a.tarih.localeCompare(b.tarih));

    // Toplam istatistikler
    const toplamCiro = tumRandevular
      .filter(r => r.durum === 'tamamlandi' && !r.hediyeMi)
      .reduce((t, r) => {
        const tutar = Array.isArray(r.hizmet) ? r.hizmet.reduce((s, h) => s + (h.fiyat || 0), 0) : (r.hizmet?.fiyat || 0);
        return t + tutar;
      }, 0);

    // En popüler hizmetler
    const hizmetMap = {};
    tumRandevular.forEach(r => {
      const hizmetler = Array.isArray(r.hizmet) ? r.hizmet : [r.hizmet];
      hizmetler.forEach(h => {
        if (!h?.ad) return;
        if (!hizmetMap[h.ad]) hizmetMap[h.ad] = { ad: h.ad, sayi: 0, ciro: 0 };
        hizmetMap[h.ad].sayi++;
        hizmetMap[h.ad].ciro += (h.fiyat || 0);
      });
    });
    const populerHizmetler = Object.values(hizmetMap).sort((a, b) => b.sayi - a.sayi).slice(0, 5);

    // Müşteri segmentleri
    const musteriMap = {};
    tumRandevular.forEach(r => {
      if (!r.musteri) return;
      const id = r.musteri._id.toString();
      if (!musteriMap[id]) musteriMap[id] = { ad: `${r.musteri.ad} ${r.musteri.soyad}`, sayi: 0 };
      musteriMap[id].sayi++;
    });
    const musteriler = Object.values(musteriMap);
    const segmentler = {
      yeni: musteriler.filter(m => m.sayi === 1).length,
      duzenli: musteriler.filter(m => m.sayi >= 2 && m.sayi <= 4).length,
      vip: musteriler.filter(m => m.sayi >= 5).length
    };

    res.json({
      gunlukVeriler,
      ozet: {
        toplamRandevu: tumRandevular.length,
        tamamlanan: tumRandevular.filter(r => r.durum === 'tamamlandi').length,
        iptal: tumRandevular.filter(r => r.durum === 'reddedildi').length,
        toplamCiro
      },
      populerHizmetler,
      segmentler,
      topMusteriler: musteriler.sort((a, b) => b.sayi - a.sayi).slice(0, 5)
    });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Personelin randevularını getir
router.get('/personel/:personelId', async (req, res) => {
  try {
    await otomatikTamamla();
    const { personelId } = req.params;

    const randevular = await Randevu.find({ personel: personelId })
      .populate('musteri', 'ad soyad')
      .sort({ tarih: -1 });

    const toplamCiro = randevular
      .filter(r => r.durum === 'tamamlandi' && !r.hediyeMi)
      .reduce((t, r) => {
        const tutar = Array.isArray(r.hizmet) ? r.hizmet.reduce((s, h) => s + (h.fiyat || 0), 0) : (r.hizmet?.fiyat || 0);
        return t + tutar;
      }, 0);

    res.json({
      randevular,
      ozet: {
        toplamRandevu: randevular.length,
        tamamlanan: randevular.filter(r => r.durum === 'tamamlandi').length,
        onaylanan: randevular.filter(r => r.durum === 'onaylandi').length,
        iptal: randevular.filter(r => r.durum === 'iptal').length,
        toplamCiro
      }
    });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// İşletmenin randevularını getir
router.get('/isletme/:isletmeId', async (req, res) => {
  try {
    await otomatikTamamla();
    const randevular = await Randevu.find({ isletme: req.params.isletmeId })
      .populate('musteri', 'ad soyad telefon')
      .sort({ tarih: 1, saat: 1 });
    // musteriAdi/musteriTelefon zaten dokümanda mevcut, populate sonrası otomatik gelir
    res.json(randevular);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Müşterinin randevularını getir
router.get('/musteri/:musteriId', async (req, res) => {
  try {
    await otomatikTamamla();
    const randevular = await Randevu.find({ musteri: req.params.musteriId })
      .populate('isletme', 'isletmeAdi kategori adres')
      .sort({ tarih: -1 });
    res.json(randevular);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Randevu iptal et (müşteri veya işletme kullanabilir)
router.put('/:id/iptal', async (req, res) => {
  try {
    const randevu = await Randevu.findById(req.params.id);
    if (!randevu) return res.status(404).json({ hata: 'Randevu bulunamadı' });
    if (randevu.durum === 'tamamlandi') {
      return res.status(400).json({ hata: 'Tamamlanmış randevu iptal edilemez' });
    }
    randevu.durum = 'iptal';
    await randevu.save();
    res.json({ mesaj: 'Randevu iptal edildi', randevu });
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