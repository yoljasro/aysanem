import TelegramBot from "node-telegram-bot-api";
import express from "express";
import axios from "axios";
import crypto from "crypto";
import fs from "fs";

// Telegram Bot konfiguratsiyasi
const BOT_TOKEN = "8137019179:AAHQyKLpzM4NAxizWtTY7n9nJgSn7tYmHIo";
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const CHANNEL_USERNAME = "@Aysanemx0n";

// Click to‘lov konfiguratsiyasi
const CLICK_SERVICE_ID = 67728;
const CLICK_MERCHANT_ID = 36125;
const CLICK_SECRET_KEY = "5A4hp0yDU3zSCF";
// Click servisi Prepare va Complete uchun bitta callback URL ko‘rsatiladi
const CLICK_RETURN_URL = "https://farxunda-khadji.uz/payment/callback";

// AMO CRM konfiguratsiyasi
const AMOCRM_ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjhmMGY2MDI5OGMwMzI5MTk1NTBkMWQzYjhhNTQwYWRkYzhmM2JmMzNmZDY0MTM4MzhhZjY4Y2IwNDk2NTA5MDc1MmVmZWVkOThmNDAyM2QxIn0.eyJhdWQiOiIxYWQ5M2Y2ZC0xYmRmLTQzOWYtOTUwMi01YzBiM2I0MTY3NjkiLCJqdGkiOiI4ZjBmNjAyOThjMDMyOTE5NTUwZDFkM2I4YTU0MGFkZGM4ZjNiZjMzZmQ2NDEzODM4YWY2OGNiMDQ5NjUwOTA3NTJlZmVlZDk4ZjQwMjNkMSIsImlhdCI6MTc0NDEyMjY5NCwibmJmIjoxNzQ0MTIyNjk0LCJleHAiOjE3NDQ4NDgwMDAsInN1YiI6IjExODAyOTQyIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMyMDc4OTUwLCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiOTdjMTlhOGItODBjYS00NWRhLThlYjMtNmQzMTkzZDNiYzBiIiwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.PqPJmr_94KuijXuWZmbgOkmCVJRivm7YDEmN9o_5BvIr_5e-qoTbLgCxgl0zouQWxpiOzqt-7KASnuXnMfhiAlFenNKaCe4S9AZOqIuL4vrIynGnOxdQUCTY-LbTtjoPI811eONtPCpfk6A93hVzwg5LiGDvL-PyjswE2hAzXAXtdstvkPD-Ps6nwSs5c1wYajyGL7jYC9d95VRUrIpSZ67AnPK8ulANax-716rjGwS61TKsR56CngoBSWmiipk2__KTaA-fosZnBobJLkAXN3fOP6tn-tIloZML75muA3eD6xD-6nK_Ga5-xfvlsBab4qzp3yqN_fDoOOOEdc62Xw";
const AMOCRM_SUBDOMAIN = "mainstreamuz"; // masalan: "yourcompany"
const AMOCRM_API_URL = `https://${AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4/leads`;

// EXPRESS server sozlamalari
const app = express();
app.use(express.json());

// Foydalanuvchilar holatini saqlash uchun obyektlar
const userState = {};      // chatId -> { step, name, phone }
const paymentStates = {};  // chatId -> tanlangan tarif (start, premium, vip)

//
// 1. Telegram Bot: /start buyruqiga javob
//
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  // Video note yuboriladi
  await bot.sendVideoNote(chatId, "./video/aysanem.mp4");
  await bot.sendMessage(chatId, "Quyidagi tugmani bosing va ma'lumotlaringizni kiriting:", {
    reply_markup: {
      inline_keyboard: [[{ text: "📩 Sovg'ani olish", callback_data: "register" }]],
    },
  });
});

//
// 2. Callback Query: foydalanuvchi ro‘yxatdan o‘tish va tarif tanlash
//
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "register") {
    // Ro‘yxatdan o‘tish bosqichi: ismi kiritiladi
    userState[chatId] = { step: "name" };
    await bot.sendMessage(chatId, "Iltimos, ismingizni kiriting:");
  } else if (["start", "premium", "vip"].includes(data)) {
    // Tarif tanlash bosqichi
    const tarifMap = {
      start: 1000,
      premium: 5350000,
      vip: 8960000,
    };
    const summa = tarifMap[data];
    paymentStates[chatId] = data;

    const paymentUrl = `https://my.click.uz/services/pay?service_id=${CLICK_SERVICE_ID}&merchant_id=${CLICK_MERCHANT_ID}&amount=${summa}&transaction_param=${chatId}&return_url=${CLICK_RETURN_URL}`;

    await bot.sendMessage(chatId, `💳 To‘lov summasi: ${summa.toLocaleString()} so‘m\nClick orqali to‘lovni amalga oshiring:`, {
      reply_markup: {
        inline_keyboard: [[{ text: "🔗 Click orqali to‘lash", url: paymentUrl }]],
      },
    });
  }
});

//
// 3. Foydalanuvchidan ism va telefon raqamni olish
//
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (userState[chatId]?.step === "name") {
    // Ismni saqlaymiz va telefon raqam bosqichiga o‘tamiz
    userState[chatId].name = text;
    userState[chatId].step = "phone";
    
    await bot.sendMessage(chatId, "📞 Telefon raqamingizni yuboring:", {
      reply_markup: {
        keyboard: [[{ text: "📞 Telefon raqamni yuborish", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }
});

bot.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  const phoneNumber = msg.contact.phone_number;

  if (userState[chatId]?.step === "phone") {
    userState[chatId].phone = phoneNumber;

    // AMO CRM ga yuborish
    await sendDataToAmoCRM(userState[chatId].name, phoneNumber);

    // PDF hujjatni yuborish
    await bot.sendDocument(chatId, "./pdf/smm.pdf", {
      caption: "📄 Kurs haqida to‘liq ma’lumot shu faylda.",
    });

    // Tarif variantlarini tanlash
    await bot.sendMessage(chatId, "💰 Quyidagi tariflardan birini tanlang:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💼 Start – 1000 so’m", callback_data: "start" }],
          [{ text: "🚀 Premium – 5 350 000 so’m", callback_data: "premium" }],
          [{ text: "👑 VIP – 8 960 000 so’m", callback_data: "vip" }],
        ],
      },
    });
  }
});

//
// 4. Click Payment Callback Endpoint (prepare & complete bosqichlari)
// URL: https://farxunda-khadji.uz/payment/callback
//
app.post("/payment/callback", async (req, res) => {
  const {
    click_trans_id,
    service_id,
    merchant_trans_id,
    amount,
    action,
    error,
    error_note,
    sign_string,
    sign_time,
    transaction_param
  } = req.body;

  // MD5 imzosini hisoblash
  const expectedSign = crypto.createHash("md5")
    .update(
      String(click_trans_id) +
      String(service_id) +
      CLICK_SECRET_KEY +
      String(merchant_trans_id) +
      String(amount) +
      String(action) +
      String(sign_time)
    )
    .digest("hex");

  if (expectedSign !== sign_string) {
    return res.json({
      error: -1,
      error_note: "SIGNATURE_CHECK_FAILED",
    });
  }

  // transaction_param orqali chatId olamiz (foydalanuvchi chatId si)
  const chatId = transaction_param;

  // Action 0 - Prepare bosqichi: Click mijozni tayyorlash bosqichi
  if (Number(action) === 0) {
    return res.json({
      error: 0,
      error_note: "Success",
      merchant_trans_id,
      merchant_prepare_id: Math.floor(Math.random() * 100000),
    });
  }

  // Action 1 - Complete bosqichi: To‘lov yakunlangandan keyingi javob
  if (Number(action) === 1) {
    if (Number(error) === 0) {
      await bot.sendMessage(chatId, "✅ To‘lov muvaffaqiyatli amalga oshirildi. Kurslar sizga tez orada taqdim etiladi!");
    } else {
      await bot.sendMessage(chatId, "❌ To‘lov amalga oshmadi. Iltimos, qayta urinib ko‘ring.");
    }
    return res.json({
      error,
      error_note: error_note || "Complete error",
      merchant_trans_id,
      merchant_confirm_id: Math.floor(Math.random() * 100000),
    });
  }

  // Agar action kutilmagan qiymat bo‘lsa
  return res.json({
    error: -2,
    error_note: "Unknown action",
  });
});

//
// 5. AMO CRM ga ma'lumot yuborish funksiyasi
//
const sendDataToAmoCRM = async (name, phone) => {
  try {
    await axios.post(
      AMOCRM_API_URL,
      {
        _embedded: {
          contacts: [
            {
              first_name: name,
              custom_fields_values: [
                {
                  field_code: "PHONE",
                  values: [{ value: phone }],
                },
              ],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("AMOCRM xato:", error.response?.data || error.message);
  }
};

//
// 6. EXPRESS SERVERNI ishga tushurish
//
app.listen(4000, () => {
  console.log("Server 4000-portda ishlayapti...");
});
console.log("Telegram Bot ishga tushdi...");
