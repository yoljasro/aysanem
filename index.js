import TelegramBot from "node-telegram-bot-api";
import express from "express";
import axios from "axios";
import fs from "fs";

const BOT_TOKEN = "8137019179:AAHQyKLpzM4NAxizWtTY7n9nJgSn7tYmHIo";
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const CHANNEL_USERNAME = "@Aysanemx0n";

const CLICK_SERVICE_ID = 67728;
const CLICK_MERCHANT_ID = 36125;
const CLICK_SECRET_KEY = "5A4hp0yDU3zSCF";
const CLICK_RETURN_URL = "https://farxunda-khadji.uz/api/click/prepare"; // bu manzilga Click POST jo‘natadi


// AMOCRM konfiguratsiyasi
const AMOCRM_ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjhmMGY2MDI5OGMwMzI5MTk1NTBkMWQzYjhhNTQwYWRkYzhmM2JmMzNmZDY0MTM4MzhhZjY4Y2IwNDk2NTA5MDc1MmVmZWVkOThmNDAyM2QxIn0.eyJhdWQiOiIxYWQ5M2Y2ZC0xYmRmLTQzOWYtOTUwMi01YzBiM2I0MTY3NjkiLCJqdGkiOiI4ZjBmNjAyOThjMDMyOTE5NTUwZDFkM2I4YTU0MGFkZGM4ZjNiZjMzZmQ2NDEzODM4YWY2OGNiMDQ5NjUwOTA3NTJlZmVlZDk4ZjQwMjNkMSIsImlhdCI6MTc0NDEyMjY5NCwibmJmIjoxNzQ0MTIyNjk0LCJleHAiOjE3NDQ4NDgwMDAsInN1YiI6IjExODAyOTQyIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMyMDc4OTUwLCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiOTdjMTlhOGItODBjYS00NWRhLThlYjMtNmQzMTkzZDNiYzBiIiwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.PqPJmr_94KuijXuWZmbgOkmCVJRivm7YDEmN9o_5BvIr_5e-qoTbLgCxgl0zouQWxpiOzqt-7KASnuXnMfhiAlFenNKaCe4S9AZOqIuL4vrIynGnOxdQUCTY-LbTtjoPI811eONtPCpfk6A93hVzwg5LiGDvL-PyjswE2hAzXAXtdstvkPD-Ps6nwSs5c1wYajyGL7jYC9d95VRUrIpSZ67AnPK8ulANax-716rjGwS61TKsR56CngoBSWmiipk2__KTaA-fosZnBobJLkAXN3fOP6tn-tIloZML75muA3eD6xD-6nK_Ga5-xfvlsBab4qzp3yqN_fDoOOOEdc62Xw";
const AMOCRM_SUBDOMAIN = "mainstreamuz"; // masalan: 'yourcompany'
const AMOCRM_API_URL = `https://${AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4/leads`;

const app = express();
app.use(express.json());
const userState = {};

const paymentStates = {}; // chatId -> tarif

// === 1. START
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendVideoNote(chatId, "./video/aysanem.mp4");
  await bot.sendMessage(chatId, "Quyidagi tugmani bosing va ma'lumotlaringizni kiriting:", {
    reply_markup: {
      inline_keyboard: [[{ text: "📩 Sovg'ani olish", callback_data: "register" }]],
    },
  });
});

// === 2. Qadamlar ketma-ketligi
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "register") {
    userState[chatId] = { step: "name" };
    await bot.sendMessage(chatId, "Iltimos, ismingizni kiriting:");
  } else if (["start", "premium", "vip"].includes(data)) {
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

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (userState[chatId]?.step === "name") {
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

    // Optional: AMO ga yuborish
    await sendDataToAmoCRM(userState[chatId].name, phoneNumber);

    // PDF yuborish
    await bot.sendDocument(chatId, "./pdf/smm.pdf", {
      caption: "📄 Kurs haqida to‘liq ma’lumot shu faylda.",
    });

    // Tariflar
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
});z

// === 3. CLICK to‘lovdan so‘ng keladigan so‘rovni qabul qilish
import crypto from "crypto";

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

  // --- SIGNATURE tekshirish ---
  const hash = crypto.createHash("md5");
  const expectedSign = hash
    .update(
      click_trans_id +
      service_id +
      CLICK_SECRET_KEY +
      merchant_trans_id +
      amount +
      action +
      sign_time
    )
    .digest("hex");

  if (expectedSign !== sign_string) {
    return res.json({
      error: -1,
      error_note: "SIGNATURE_CHECK_FAILED"
    });
  }

  const chatId = transaction_param;

  // --- PREPARE: action == 0 ---
  if (action === 0) {
    return res.json({
      error: 0,
      error_note: "Success",
      merchant_trans_id,
      merchant_prepare_id: Math.floor(Math.random() * 100000) // yoki DB ID
    });
  }

  // --- COMPLETE: action == 1 ---
  if (error === 0) {
    await bot.sendMessage(chatId, "✅ To‘lov muvaffaqiyatli amalga oshirildi. Kurslar sizga tez orada taqdim etiladi!");
  } else {
    await bot.sendMessage(chatId, "❌ To‘lov amalga oshmadi. Iltimos, qayta urinib ko‘ring.");
  }

  return res.json({
    error,
    error_note: error_note || "Complete error",
    merchant_trans_id,
    merchant_confirm_id: Math.floor(Math.random() * 100000) // yoki DB ID
  });
});


// === 4. AMO CRM yuborish (agar kerak bo‘lsa)
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

// === 5. SERVER START
app.listen(4000, () => {
  console.log("Server 4000-portda ishlayapti...");
});
console.log("Bot ishga tushdi...");