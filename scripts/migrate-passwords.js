// Mevcut plaintext şifreleri bcrypt hash'e dönüştürür.
// Tek seferlik çalıştırılır: node scripts/migrate-passwords.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB bağlantısı kuruldu');

  const users = await mongoose.connection.db
    .collection('kullanicis')
    .find({ sifre: { $exists: true, $nin: [null, ''] } })
    .toArray();

  console.log(`Toplam ${users.length} kullanıcı bulundu`);

  let guncellenen = 0;
  let atlanan = 0;

  for (const user of users) {
    // Zaten hash'lenmiş olanları atla
    if (user.sifre.startsWith('$2b$') || user.sifre.startsWith('$2a$')) {
      atlanan++;
      continue;
    }
    const hash = await bcrypt.hash(user.sifre, 10);
    await mongoose.connection.db
      .collection('kullanicis')
      .updateOne({ _id: user._id }, { $set: { sifre: hash } });
    guncellenen++;
    console.log(`  [OK] ${user.email || user._id}`);
  }

  console.log(`\nMigration tamamlandı: ${guncellenen} güncellendi, ${atlanan} zaten hash'li (atlandı)`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
