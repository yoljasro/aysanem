const { Telegraf, Markup } = require("telegraf");
const express = require("express");
const axios = require("axios");

const BOT_TOKEN = "7897654306:AAHOyFxYuts-FLFUlFNP9xHSIfYqQ-HU8PY"; // Telegram bot tokeningiz
const SERVICE_ID = "67728";
const MERCHANT_ID = "36125";
const SECRET_KEY = "5A4hp0yDU3zSCF";
const MERCHANT_USER_ID = "52347";
const COURSE_PRICE = 1000; // Kurs narxi so'mda

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());

const users = {}; // Foydalanuvchilarni vaqtinchalik saqlash

// 🚀 Start komandasi
bot.start((ctx) => {
    ctx.reply(
        "Assalomu alaykum! 👋\n\n" +
        "Bu bot orqali siz kursga ro‘yxatdan o‘tib, Click orqali to‘lov qilishingiz mumkin.",
        Markup.keyboard([
            ["📋 Ro‘yxatdan o‘tish"],
        ]).resize()
    );
});

// 📌 Ro‘yxatdan o‘tish jarayoni
bot.hears("📋 Ro‘yxatdan o‘tish", (ctx) => {
    ctx.reply("Iltimos, ismingiz va familiyangizni kiriting (masalan: Jasur Saidaliyev).");
    users[ctx.from.id] = { step: "name" }; // Bosqichni saqlash
});

// 📌 Ism va familiya olish
bot.on("text", (ctx) => {
    const userId = ctx.from.id;

    if (users[userId] && users[userId].step === "name") {
        users[userId].name = ctx.message.text;
        users[userId].step = "phone";
        ctx.reply("📞 Endi telefon raqamingizni yuboring.", Markup.keyboard([
            [Markup.button.contactRequest("📲 Raqamni yuborish")]
        ]).resize());
    }
});

// 📌 Telefon raqam olish
bot.on("contact", (ctx) => {
    const userId = ctx.from.id;

    if (users[userId] && users[userId].step === "phone") {
        users[userId].phone = ctx.message.contact.phone_number;
        users[userId].step = "done";

        ctx.reply(
            `✅ Ro‘yxatdan o‘tish muvaffaqiyatli yakunlandi!\n\n👤 *FIO:* ${users[userId].name}\n📞 *Telefon:* ${users[userId].phone}`,
            { parse_mode: "Markdown", ...Markup.removeKeyboard() }
        );

        // To‘lov tugmalarini yuborish
        ctx.reply(
            "Kurs uchun to‘lov qilish usulini tanlang:",
            Markup.inlineKeyboard([
                [Markup.button.callback("💳 Click orqali to‘lov", "pay_click")],
                [Markup.button.callback("🔄 Boshqa usul", "pay_other")]
            ])
        );
    }
});

// 📌 Click orqali to‘lov tugmasi bosilganda Click ilovasiga yo‘naltirish
bot.action("pay_click", (ctx) => {
    const userId = ctx.from.id;
    const orderID = `ORDER_${userId}_${Date.now()}`;
    const amount = COURSE_PRICE * 100; // Click tizimi tiyinda ishlaydi

    // Click to‘lov havolasi
    const clickPaymentUrl = `https://my.click.uz/services/pay?service_id=${SERVICE_ID}&merchant_id=${MERCHANT_ID}&amount=${amount}&transaction_param=${orderID}`;

    ctx.reply(
        "To‘lovni amalga oshirish uchun quyidagi tugmani bosing:",
        Markup.inlineKeyboard([
            Markup.button.url("💳 Click orqali to‘lov", clickPaymentUrl),
        ])
    );
});

// 📌 Boshqa to‘lov usullari tugmasi
bot.action("pay_other", (ctx) => {
    ctx.reply("Boshqa to‘lov usullari haqida ma’lumot uchun admin bilan bog‘laning.");
});

// 🚀 Botni ishga tushirish
bot.launch();
console.log("✅ Telegram bot ishga tushdi!");

// 🚀 Express serverini ishga tushirish (Agar Click callback ishlatsa)
app.listen(4000, () => console.log("✅ Express server 4000-portda ishga tushdi!"));
