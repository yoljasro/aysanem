import TelegramBot from "node-telegram-bot-api";
import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = "7897654306:AAHOyFxYuts-FLFUlFNP9xHSIfYqQ-HU8PY";
const AMOCRM_URL = process.env.AMOCRM_URL;
const AMOCRM_TOKEN = process.env.AMOCRM_TOKEN;
const CLICK_SECRET_KEY = process.env.CLICK_SECRET_KEY;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const app = express();
app.use(express.json());
const userState = {};

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendVideoNote(chatId, "./video/aysanem.mp4");

    await bot.sendMessage(chatId, "Quyidagi tugmani bosing va ma'lumotlaringizni kiriting:", {
        reply_markup: {
            inline_keyboard: [[{ text: "\ud83d\udce9 Sovg'ani olish", callback_data: "register" }]],
        },
    });
});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;

    if (query.data === "register") {
        userState[chatId] = { step: "name" };
        await bot.sendMessage(chatId, "Iltimos, ismingizni kiriting:");
    } else if (query.data === "click_payment") {
        const paymentUrl = `https://my.click.uz/services/pay?service_id=67728&merchant_id=36125&amount=1000&transaction_param=${chatId}`;
        await bot.sendMessage(chatId, `\ud83d\udcb0 Click orqali to‘lov qilish uchun quyidagi havolani bosing:\n\n[Click orqali to‘lov](${paymentUrl})`, { parse_mode: "Markdown" });
    } else if (query.data === "other_payment") {
        await bot.sendMessage(chatId, "Boshqa to‘lov usullari hozircha mavjud emas.");
    }
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (userState[chatId]) {
        if (userState[chatId].step === "name") {
            userState[chatId].name = text;
            userState[chatId].step = "phone";

            await bot.sendMessage(chatId, "Telefon raqamingizni yuboring:", {
                reply_markup: {
                    keyboard: [[{ text: "\ud83d\udcde Telefon raqamni yuborish", request_contact: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            });
        }
    }
});

bot.on("contact", async (msg) => {
    const chatId = msg.chat.id;
    const phoneNumber = msg.contact.phone_number;

    if (userState[chatId] && userState[chatId].step === "phone") {
        userState[chatId].phone = phoneNumber;
        await sendToAmoCRM(userState[chatId]);

        await bot.sendMessage(chatId, "✅ Ma'lumotlaringiz qabul qilindi! Tez orada siz bilan bog'lanamiz.", { 
            reply_markup: { remove_keyboard: true } 
        });

        // PDF faylni yuborish
        await bot.sendDocument(chatId, "./pdf/smm.pdf", {
            caption: "📄 Kurs haqida to‘liq ma’lumot shu faylda."
        });

        // Telegram kanalga qo'shilish uchun havola
        await bot.sendMessage(chatId, "📢 Yangiliklardan xabardor bo‘lish uchun kanalimizga qo‘shiling: [Bizning kanal] https://t.me/Aysanemx0n", {
            parse_mode: "Markdown"
        });

        // To‘lov tugmalari
        await bot.sendMessage(chatId, "💳 To‘lov qilish uchun quyidagi tugmalardan birini tanlang:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Click orqali to‘lov", callback_data: "click_payment" }],
                    [{ text: "Boshqa usul", callback_data: "other_payment" }]
                ],
            }
        });

        delete userState[chatId];
    }
});


const sendToAmoCRM = async (userData) => {
    try {
        await axios.post(AMOCRM_URL, {
            name: userData.name,
            phone: userData.phone,
        }, {
            headers: { Authorization: `Bearer ${AMOCRM_TOKEN}` }
        });
    } catch (error) {
        console.error("AMOCRM ga yuborishda xatolik:", error);
    }
};

app.post("/api/click/prepare", (req, res) => {
    console.log("Click prepare:", req.body);

    res.json({
        click_trans_id: req.body.click_trans_id,
        merchant_trans_id: req.body.merchant_trans_id,
        merchant_prepare_id: 123456,  // <== BU YERGA ID GENERATSIYA QILISH KERAK!
        error: 0,
        error_note: "Success"
    });
});


app.post("/api/click/complete", (req, res) => {
    console.log("Click complete:", req.body);
    if (req.body.error === 0) {
        bot.sendMessage(req.body.merchant_trans_id, "✅ To‘lovingiz muvaffaqiyatli amalga oshirildi!\nRaxmat!");
    } else {
        bot.sendMessage(req.body.merchant_trans_id, "❌ To‘lovda xatolik yuz berdi. Iltimos, qayta urinib ko‘ring.");
    }
    res.json({ click_trans_id: req.body.click_trans_id, merchant_trans_id: req.body.merchant_trans_id, error: 0, error_note: "Success" });
});

bot.onText(/\/check_payment/, async (msg) => {
    await bot.sendMessage(msg.chat.id, "\ud83d\udccb To‘lov holatini tekshirish uchun Click ilovasiga kiring.");
});

app.listen(4000, () => console.log("Server 4000-portda ishlamoqda..."));
console.log("Bot ishga tushdi...");
