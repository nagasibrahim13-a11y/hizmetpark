const mongoose = require('mongoose');
require('dotenv').config();

async function baglan() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı!');
  } catch (hata) {
    console.log('❌ Bağlantı hatası:', hata);
  }
}

module.exports = baglan;