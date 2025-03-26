import TelegramBot from "node-telegram-bot-api";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = "8137019179:AAHQyKLpzM4NAxizWtTY7n9nJgSn7tYmHIo";
const CHANNEL_USERNAME = "@Aysanemx0n";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const app = express();
app.use(express.json());
const userState = {};

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendVideoNote(chatId, "./video/aysanem.mp4");
    await bot.sendMessage(chatId, "Quyidagi tugmani bosing va ma'lumotlaringizni kiriting:", {
        reply_markup: {
            inline_keyboard: [[{ text: "📩 Sovg'ani olish", callback_data: "register" }]],
        },
    });
});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    if (query.data === "register") {
        userState[chatId] = { step: "name" };
        await bot.sendMessage(chatId, "Iltimos, ismingizni kiriting:");
    } else if (query.data === "check_subscription") {
        await checkSubscriptionAndSendPDF(chatId, true);
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

        await bot.sendMessage(chatId, "📢 Kurs haqida batafsil ma'lumot olish uchun kanalimizga obuna bo‘ling: [Bizning kanal](https://t.me/Aysanemx0n)", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [[{ text: "✅ Obuna bo'ldim", callback_data: "check_subscription" }]],
            },
        });
    }
});

const checkSubscriptionAndSendPDF = async (chatId, isRetry = false) => {
    try {
        const chatMember = await bot.getChatMember(CHANNEL_USERNAME, chatId);
        if (["member", "administrator", "creator"].includes(chatMember.status)) {
            await bot.sendDocument(chatId, "./pdf/smm.pdf", {
                caption: "📄 Kurs haqida to‘liq ma’lumot shu faylda."
            });
        } else {
            if (!isRetry) {
                await bot.sendMessage(chatId, "❌ Si z kanalga a'zo bo‘lmadingiz! Iltimos, avval obuna bo‘ling.");
            }
        }
    } catch (error) {
        console.error("Kanal obunasini tekshirishda xatolik:", error);
    }
};

app.listen(4000, () => console.log("Server 4000-portda ishlamoqda..."));
console.log("Bot ishga tushdi...");
