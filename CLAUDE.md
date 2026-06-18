# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HizmetPark is a Turkish-language REST API backend for a local service marketplace. It connects customers with service businesses (berber/barber, kuaför/hairdresser, güzellik/beauty, halısaha/futsal). Core features: appointment booking, loyalty card system, reviews, and business ads.

## Running the Server

```bash
node server.js
```

Server runs on port 5000 (hardcoded). No nodemon or watch mode is configured — restart manually after changes.

Required `.env` variables:
- `MONGODB_URI` — MongoDB connection string
- `GOOGLE_CLIENT_ID` — Google OAuth client ID for `/api/auth/google`

## Architecture

**Entry point:** `server.js` mounts all routes and calls `db.js` to connect to MongoDB.

**Models (`models/`):**
- `User.js` → `Kullanici` — users with `rol: 'musteri' | 'isletme'`
- `Isletme.js` → `Isletme` — business profiles with services (`hizmetler`), working hours, closed dates (`kapaliTarihler`), and sparse 2dsphere geo index on `konum`
- `Randevu.js` → `Randevu` — appointments linking customer + business + service; supports both registered customers and walk-in (`manuelMi: true`) with `musteriAdi`/`musteriTelefon`
- `Sadakat.js` → `Sadakat` — per-customer-per-business loyalty cards; auto-created on first completed appointment; awards `kazanilanOduller` when `mevcutPuan >= odul.hedefZiyaret`
- `Yorum.js` → `Yorum` — reviews; one per completed appointment; updating `ortalamaPuan` on `Isletme` is done inline in the route
- `Reklam.js` → `Reklam` — time-bounded ads with types `slider | one_cikma | sponsorlu`

**Routes (`routes/`):**

| Prefix | File | Notes |
|--------|------|-------|
| `/api/auth` | `auth.js` | Google ID token verification only |
| `/api/kullanicilar` | `kullanicilar.js` | Register/login (plaintext passwords — no hashing) |
| `/api/isletmeler` | `isletmeler.js` | CRUD + nested hizmet/kapali-tarih sub-resources |
| `/api/randevular` | `randevular.js` | Create with closed-date guard + loyalty side-effects on status update |
| `/api/sadakat` | `sadakat.js` | Loyalty card reads + reward management |
| `/api/yorumlar` | `yorumlar.js` | Reviews gated on completed appointment |
| `/api/reklamlar` | `reklamlar.js` | Ad CRUD + click counter |

## Key Design Notes

**No auth middleware:** There is no JWT or session system. The caller passes their user/business ID directly in request bodies or URL params. All routes are publicly accessible.

**Language:** All variable names, schema fields, comments, and error messages are in Turkish. Maintain this convention when adding code.

**Loyalty trigger:** Sadakat points are awarded inside `PUT /api/randevular/:id/durum` when status changes to `tamamlandi`. Gift appointments (`hediyeMi: true`) and walk-in appointments (`manuelMi: true` or no `musteri` ref) do not earn points.

**Closed-date check:** `POST /api/randevular` checks `Isletme.kapaliTarihler` by comparing ISO date strings (YYYY-MM-DD) before creating the appointment.

**Geo index:** `Isletme` has `{ konum: '2dsphere', sparse: true }`. The pre-save hook nullifies `konum` when coordinates are incomplete to avoid index errors.
