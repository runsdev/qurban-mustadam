# Google Sheets Auto Push Notification (Apps Script)

Panduan ini membuat perubahan status di tab Hewan langsung mengirim web push notification.

## 1) Env sudah ada

Gunakan VAPID_PRIVATE_KEY yang sudah ada di .env.local.
Tidak perlu env var terpisah, sehingga tidak perlu redeploy saat update.

## 2) Deploy aplikasi

Pastikan endpoint ini bisa diakses dari internet:

POST /api/notifications/webhook

Endpoint ini menerima:

{
  "animalId": "Sapi-2",
  "oldStatus": "Persiapan",
  "newStatus": "Penyembelihan"
}

Header wajib salah satu:
- x-webhook-secret: SECRET
- Authorization: Bearer SECRET

## 3) Pasang Google Apps Script di spreadsheet

Buka spreadsheet -> Extensions -> Apps Script, lalu tempel script berikut:

```javascript
const WEBHOOK_URL = "https://qurtek.runsha.dev/api/notifications/webhook";
const WEBHOOK_SECRET = "8l37LT8ztWKcFHqJewMZXjjHGVKEKMw-5xzYutBOkD4"; // Ganti dengan VAPID_PRIVATE_KEY dari .env.local

// Sesuaikan nama tab dan index kolom bila struktur sheet berubah
const TARGET_SHEET_NAME = "Hewan";
const COL_ID = 1;      // Kolom A
const COL_STATUS = 4;  // Kolom D (A=1, B=2, C=3, D=4)

function onEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();

    if (sheet.getName() !== TARGET_SHEET_NAME) return;
    if (range.getColumn() !== COL_STATUS) return;

    const row = range.getRow();
    if (row <= 1) return; // skip header

    const animalId = String(sheet.getRange(row, COL_ID).getValue() || "").trim();
    const newStatus = String(e.value || "").trim();
    const oldStatus = String(e.oldValue || "").trim();

    if (!animalId || !newStatus) return;
    if (oldStatus === newStatus) return;

    const payload = {
      animalId,
      oldStatus,
      newStatus,
    };

    UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      headers: {
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch (err) {
    console.error("onEdit webhook error", err);
  }
}
```

## 4) Aktifkan trigger

Untuk UrlFetchApp pada simple trigger kadang diblokir, gunakan installable trigger:

1. Apps Script -> Triggers
2. Add Trigger
3. Choose function: onEdit
4. Event source: From spreadsheet
5. Event type: On edit
6. Save dan authorize

## 5) Uji end-to-end

1. User subscribe notifikasi dari halaman hewan.
2. Pastikan tab Subscriptions bertambah.
3. Ubah kolom Status di tab Hewan untuk baris hewan yang sama.
4. Browser/laptop harus menerima push notification.
5. Klik notifikasi -> terbuka ke halaman /hewan/{id}.

## Catatan penting

- Pastikan status yang dipakai konsisten, misalnya Persiapan, Disembelih, Penyembelihan, Pengolahan, Distribusi, Selesai.
- Jika pakai domain production, pastikan WEBHOOK_URL pakai HTTPS.
- Bila notifikasi tidak masuk, cek Apps Script execution log dan server log endpoint webhook.
