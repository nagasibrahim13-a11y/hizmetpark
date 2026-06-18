const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const Kullanici = require('../models/User');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google — Google ID token ile giriş/kayıt
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ hata: 'idToken gerekli' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name, family_name, name } = payload;

    let kullanici = await Kullanici.findOne({ email });

    if (!kullanici) {
      kullanici = await Kullanici.create({
        ad: given_name || name || email.split('@')[0],
        soyad: family_name || '-',
        email,
        googleId,
        rol: 'musteri',
      });
    } else if (!kullanici.googleId) {
      kullanici.googleId = googleId;
      await kullanici.save();
    }

    res.json({
      mesaj: 'Google ile giriş başarılı',
      kullanici: {
        id: kullanici._id,
        ad: kullanici.ad,
        email: kullanici.email,
        rol: kullanici.rol,
      },
    });
  } catch (hata) {
    res.status(401).json({ hata: 'Google token doğrulaması başarısız: ' + hata.message });
  }
});

module.exports = router;
