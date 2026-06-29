const express = require('express');
const router = express.Router();
const Randevu = require('../models/Randevu');
const Sadakat = require('../models/Sadakat');
const Isletme = require('../models/Isletme');
const Bildirim = require('../models/Bildirim');
const { dogrulaToken } = require('../middleware/auth');

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
          await Bildirim.create({
            aliciTipi: 'musteri',
            aliciId: randevu.musteri._id,
            baslik: 'Tebrikler, Ödül Kazandınız!',
            mesaj: `${sadakat.odul.hediye} hediyesini kazandınız. Sadakat sayfanızdan kullanabilirsiniz.`,
            tip: 'sadakat'
          });
          sadakat.mevcutPuan = 0;
        }
        sadakat.sonGuncelleme = new Date();
        // VIP kontrolü — toplam ziyaret işletmenin VIP hedefine ulaştıysa müşteriyi VIP işaretle
        if (sadakat.toplamZiyaret >= (sadakat.odul.vipHedef || 10)) {
          const Kullanici = require('../models/User');
          await Kullanici.findByIdAndUpdate(randevu.musteri._id, { vipMi: true, segment: 'vip' });
        }
        await sadakat.save();
      }
    }
  } catch (hata) {
    console.error('Otomatik tamamlama hatası:', hata.message);
  }
};

// Randevu oluştur
router.post('/', dogrulaToken, async (req, res) => {
  try {
    const { hediyeMi, sadakatId, isletme: isletmeId, tarih, saat } = req.body;
    let personelId = req.body.personel;

    // 'fark_etmez', boş string, null, undefined → otomatik personel ata akışı
    const farkEtmez = !personelId || personelId === 'fark_etmez';

    // ── 1. İşletmeyi tek seferde çek ─────────────────────────────────────
    if (!isletmeId) return res.status(400).json({ hata: 'İşletme bilgisi eksik' });
    const isletmeDoc = await Isletme.findById(isletmeId);
    if (!isletmeDoc) return res.status(404).json({ hata: 'İşletme bulunamadı' });

    // ── 2. Kapalı tarih kontrolü ─────────────────────────────────────────
    if (tarih && isletmeDoc.kapaliTarihler?.length > 0) {
      const tarihStr = new Date(tarih).toISOString().split('T')[0];
      const kapali = isletmeDoc.kapaliTarihler.find(kt => {
        const ktStr = new Date(kt.tarih).toISOString().split('T')[0];
        return ktStr === tarihStr && (kt.tumGun || kt.saatler?.includes(saat));
      });
      if (kapali) {
        return res.status(400).json({ hata: 'Bu tarih ve saatte işletme kapalıdır.' });
      }
    }

    // ── 3. Hediye randevu kontrolü ───────────────────────────────────────
    if (hediyeMi) {
      if (!sadakatId) {
        return res.status(400).json({ hata: 'Yetersiz sadakat puanı veya geçersiz kart' });
      }
      const sadakat = await Sadakat.findById(sadakatId);
      if (
        !sadakat ||
        sadakat.musteri.toString() !== req.kullanici.id ||
        sadakat.isletme.toString() !== isletmeId
      ) {
        return res.status(400).json({ hata: 'Yetersiz sadakat puanı veya geçersiz kart' });
      }
      const bekleyenOdul = sadakat.kazanilanOduller.find(o => !o.kullanildi);
      if (!bekleyenOdul) {
        return res.status(400).json({ hata: 'Yetersiz sadakat puanı veya geçersiz kart' });
      }
      bekleyenOdul.kullanildi = true;
      await sadakat.save();
    }

    // ── 4. Bu slot için dolu personel setini tek DB sorgusunda çek ───────
    // Tüm personel kontrollerinde bu set kullanılır — ekstra DB sorgusu yok
    const tarihObj = new Date(tarih);
    const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const gunAdi = gunler[tarihObj.getDay()];
    const tarihStr = tarihObj.toISOString().split('T')[0];

    const doluPersonelIds = await Randevu.distinct('personel', {
      isletme: isletmeId,
      tarih,
      saat,
      durum: { $in: ['bekliyor', 'onaylandi'] },
    });
    const doluSet = new Set(doluPersonelIds.map(id => id?.toString()).filter(Boolean));

    // ── 5a. Belirli personel seçildi: doğrula + çakışma kontrolü ─────────
    if (!farkEtmez) {
      const personelDoc = isletmeDoc.personel.find(p => p._id.toString() === personelId);
      if (!personelDoc) return res.status(404).json({ hata: 'Personel bulunamadı' });

      if (!personelDoc.calismaGunleri.includes(gunAdi)) {
        return res.status(400).json({ hata: `${personelDoc.ad} bu gün çalışmıyor.` });
      }
      const izinli = personelDoc.izinTarihleri?.find(izin => {
        const izinStr = new Date(izin.tarih).toISOString().split('T')[0];
        return izinStr === tarihStr && (izin.tumGun || izin.saatler?.includes(saat));
      });
      if (izinli) {
        return res.status(400).json({ hata: `${personelDoc.ad} bu tarihte izinli.` });
      }
      if (personelDoc.yetkiliHizmetler?.length > 0) {
        const istenenHizmetler = Array.isArray(req.body.hizmet)
          ? req.body.hizmet.map(h => h.ad)
          : [req.body.hizmet?.ad];
        const yetkisizHizmet = istenenHizmetler.find(h => h && !personelDoc.yetkiliHizmetler.includes(h));
        if (yetkisizHizmet) {
          return res.status(400).json({ hata: `${personelDoc.ad} "${yetkisizHizmet}" hizmetini veremiyor.` });
        }
      }
      // Personel bazlı çakışma: sadece bu personelin slotunu kontrol et
      if (doluSet.has(personelId)) {
        return res.status(409).json({ hata: 'Bu saat dolu, lütfen başka bir saat seçin' });
      }

    // ── 5b. Fark Etmez: ilk uygun aktif personeli otomatik ata ───────────
    } else {
      const aktifPersonel = isletmeDoc.personel.filter(p => p.aktif !== false);
      let secilenPersonel = null;

      for (const p of aktifPersonel) {
        if (!p.calismaGunleri.includes(gunAdi)) continue;
        const izinli = p.izinTarihleri?.find(izin => {
          const izinStr = new Date(izin.tarih).toISOString().split('T')[0];
          return izinStr === tarihStr && (izin.tumGun || izin.saatler?.includes(saat));
        });
        if (izinli) continue;
        if (doluSet.has(p._id.toString())) continue;
        secilenPersonel = p;
        break;
      }

      if (!secilenPersonel) {
        return res.status(400).json({ hata: 'Bu saatte uygun personel bulunmamaktadır' });
      }
      personelId = secilenPersonel._id.toString();
    }

    // ── 6. Randevuyu kaydet ───────────────────────────────────────────────
    const yeniRandevu = await Randevu.create({
      ...req.body,
      musteri: req.kullanici.id,
      personel: personelId,
      durum: 'onaylandi',
    });

    await Bildirim.create({
      aliciTipi: 'isletme',
      aliciId: yeniRandevu.isletme,
      baslik: 'Yeni Randevu',
      mesaj: `${yeniRandevu.saat} saatine yeni bir randevu alındı.`,
      tip: 'randevu',
    });
    if (yeniRandevu.personel) {
      await Bildirim.create({
        aliciTipi: 'personel',
        aliciId: yeniRandevu.personel,
        baslik: 'Yeni Randevu',
        mesaj: `${yeniRandevu.saat} saatine size yeni bir randevu atandı.`,
        tip: 'randevu',
      });
    }

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

    // Plan kontrolü — VIP analizi ve detaylı raporlar sadece aktif plan sahiplerine
    const isletmeDoc = await Isletme.findById(isletmeId).select('premium');
    const premiumAktif = !!(
      isletmeDoc?.premium?.aktif &&
      isletmeDoc.premium.bitis &&
      new Date(isletmeDoc.premium.bitis) > new Date()
    );

    const otuzGunOnce = new Date();
    otuzGunOnce.setDate(otuzGunOnce.getDate() - 30);

    const tumRandevular = await Randevu.find({ isletme: isletmeId })
      .populate('musteri', 'ad soyad');

    const sonOtuzGun = tumRandevular.filter(r => new Date(r.tarih) >= otuzGunOnce);

    // Günlük istatistikler (son 30 gün)
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

    // Müşteri segmentasyonu: SADECE tamamlanan randevular sayılır
    const musteriMap = {};
    tumRandevular.forEach(r => {
      if (!r.musteri) return;
      const id = r.musteri._id.toString();
      if (!musteriMap[id]) musteriMap[id] = {
        id,
        ad: `${r.musteri.ad} ${r.musteri.soyad || ''}`.trim(),
        tamamlananSayi: 0,
        ciro: 0,
      };
      if (r.durum === 'tamamlandi') {
        musteriMap[id].tamamlananSayi++;
        if (!r.hediyeMi) {
          const tutar = Array.isArray(r.hizmet) ? r.hizmet.reduce((t, h) => t + (h.fiyat || 0), 0) : (r.hizmet?.fiyat || 0);
          musteriMap[id].ciro += tutar;
        }
      }
    });
    const musteriler = Object.values(musteriMap).filter(m => m.tamamlananSayi > 0);

    // Sadakat hedefini en az 1 kez dolduranlar da VIP sayılır
    const sadakatVipIds = await Sadakat.distinct('musteri', {
      isletme: isletmeId,
      'kazanilanOduller.0': { $exists: true },
    });
    const sadakatVipSet = new Set(sadakatVipIds.map(id => id?.toString()));

    // Segmentasyon kriterleri:
    // Yeni: 1 tamamlanmış randevu
    // Düzenli: 2–4 tamamlanmış randevu
    // VIP: 5+ tamamlanmış randevu VEYA en az 1 kez sadakat ödülü kazanmış
    // VIP'e Yakın: 3–4 tamamlanmış randevu, henüz sadakat ödülü yok
    const yeniListe = musteriler.filter(m => m.tamamlananSayi === 1 && !sadakatVipSet.has(m.id));
    const duzenliListe = musteriler.filter(m => m.tamamlananSayi >= 2 && m.tamamlananSayi <= 4 && !sadakatVipSet.has(m.id));
    const vipListe = musteriler.filter(m => m.tamamlananSayi >= 5 || sadakatVipSet.has(m.id));
    const vipeYakinListe = musteriler.filter(m => m.tamamlananSayi >= 3 && m.tamamlananSayi < 5 && !sadakatVipSet.has(m.id));

    const segmentler = {
      yeni: yeniListe.length,
      duzenli: duzenliListe.length,
      vip: vipListe.length,
      yeniListe: yeniListe.sort((a, b) => b.ciro - a.ciro),
      duzenliListe: duzenliListe.sort((a, b) => b.ciro - a.ciro),
      // VIP listeleri sadece aktif planlı işletmelere gönderilir
      vipListe: premiumAktif ? vipListe.sort((a, b) => b.ciro - a.ciro) : [],
      vipeYakinListe: premiumAktif ? vipeYakinListe.sort((a, b) => b.tamamlananSayi - a.tamamlananSayi) : [],
      segmentCiro: {
        yeni: yeniListe.reduce((t, m) => t + m.ciro, 0),
        duzenli: duzenliListe.reduce((t, m) => t + m.ciro, 0),
        vip: premiumAktif ? vipListe.reduce((t, m) => t + m.ciro, 0) : 0,
      },
    };

    res.json({
      gunlukVeriler,
      ozet: {
        toplamRandevu: tumRandevular.length,
        tamamlanan: tumRandevular.filter(r => r.durum === 'tamamlandi').length,
        iptal: tumRandevular.filter(r => r.durum === 'reddedildi').length,
        toplamCiro,
      },
      populerHizmetler,
      segmentler,
      topMusteriler: musteriler.sort((a, b) => b.tamamlananSayi - a.tamamlananSayi).slice(0, 5),
      planUyarisi: premiumAktif ? null : 'VIP analizi ve detaylı raporlar için planınızı yükseltin.',
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

    const { baslangic, bitis } = req.query;

    const filtre = { personel: personelId };
    if (baslangic || bitis) {
      filtre.tarih = {};
      if (baslangic) filtre.tarih.$gte = new Date(baslangic);
      if (bitis) {
        const bitisTarih = new Date(bitis);
        bitisTarih.setHours(23, 59, 59, 999);
        filtre.tarih.$lte = bitisTarih;
      }
    }

    const randevular = await Randevu.find(filtre)
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

// Müşterinin randevularını getir — sadece kendi randevuları
router.get('/musteri/:musteriId', dogrulaToken, async (req, res) => {
  try {
    if (req.kullanici.id !== req.params.musteriId) {
      return res.status(403).json({ hata: 'Bu bilgilere erişim yetkiniz yok' });
    }
    await otomatikTamamla();
    const randevular = await Randevu.find({ musteri: req.params.musteriId })
      .populate('isletme', 'isletmeAdi kategori adres')
      .sort({ tarih: -1 });
    res.json(randevular);
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Randevu iptal et — müşteri (kendi randevusu) veya işletme sahibi
router.put('/:id/iptal', dogrulaToken, async (req, res) => {
  try {
    const randevu = await Randevu.findById(req.params.id);
    if (!randevu) return res.status(404).json({ hata: 'Randevu bulunamadı' });
    if (randevu.durum === 'tamamlandi') {
      return res.status(400).json({ hata: 'Tamamlanmış randevu iptal edilemez' });
    }

    // Yetki kontrolü: müşteri mi yoksa işletme sahibi mi?
    const isMusteri = randevu.musteri && randevu.musteri.toString() === req.kullanici.id;
    let isIsletmeSahibi = false;
    if (!isMusteri) {
      const isletme = await Isletme.findById(randevu.isletme).select('sahip');
      isIsletmeSahibi = isletme && isletme.sahip.toString() === req.kullanici.id;
    }
    if (!isMusteri && !isIsletmeSahibi) {
      return res.status(403).json({ hata: 'Bu randevuyu iptal etme yetkiniz yok' });
    }

    randevu.durum = 'iptal';
    await randevu.save();
    if (randevu.musteri) {
      await Bildirim.create({
        aliciTipi: 'musteri',
        aliciId: randevu.musteri,
        baslik: 'Randevu İptal Edildi',
        mesaj: `${new Date(randevu.tarih).toLocaleDateString('tr-TR')} ${randevu.saat} randevunuz iptal edildi.`,
        tip: 'iptal'
      });
    }
    await Bildirim.create({
      aliciTipi: 'isletme',
      aliciId: randevu.isletme,
      baslik: 'Randevu İptal Edildi',
      mesaj: `${new Date(randevu.tarih).toLocaleDateString('tr-TR')} ${randevu.saat} randevu iptal edildi.`,
      tip: 'iptal'
    });
    res.json({ mesaj: 'Randevu iptal edildi', randevu });
  } catch (hata) {
    res.status(500).json({ hata: hata.message });
  }
});

// Toplu tamamla — sadece giriş yapmış kullanıcı kendi randevularını tamamlayabilir
router.put('/toplu-tamamla', dogrulaToken, async (req, res) => {
  try {
    const musteriId = req.kullanici.id;

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