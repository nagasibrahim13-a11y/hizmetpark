const baglan = require('./db');
const Kullanici = require('./models/User');
const Isletme = require('./models/Isletme');

async function test() {
  await baglan();

  const kullanici = await Kullanici.create({
    ad: 'Ahmet',
    soyad: 'Yılmaz',
    email: 'ahmet@gmail.com',
    sifre: '123456',
    rol: 'isletme'
  });

  console.log('✅ Kullanıcı oluştu:', kullanici.ad, kullanici.soyad);

  const isletme = await Isletme.create({
    sahip: kullanici._id,
    isletmeAdi: 'Ahmet Berber Salonu',
    kategori: 'berber',
    adres: {
      il: 'Denizli',
      ilce: 'Honaz',
      acikAdres: 'Merkez Mahallesi No:5'
    },
    telefon: '0532 111 2233',
    hizmetler: [
      { ad: 'Saç Kesim', sure: 20, fiyat: 150 },
      { ad: 'Sakal Düzeltme', sure: 15, fiyat: 80 },
      { ad: 'Saç + Sakal', sure: 30, fiyat: 200 }
    ]
  });

  console.log('✅ İşletme oluştu:', isletme.isletmeAdi);
  console.log('📋 Hizmetler:', isletme.hizmetler);

  process.exit();
}

test();