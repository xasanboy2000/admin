const { Telegraf, Markup } = require("telegraf");

// 🔐 BOT TOKEN VA ADMIN ID
const BOT_TOKEN = "7593846547:AAEUx_qUvHI5CDH-yrwA3_W-LAo1RcvrnTk"; // O'zingizning bot tokeningizni kiriting
const ADMIN_ID = "5884122134"; // O'zingizning Telegram ID'ingizni kiriting
const bot = new Telegraf(BOT_TOKEN);
const userState = {}; // Foydalanuvchi holatini saqlash

// ✅ Start bosilganda asosiy menyu
bot.start((ctx) => {
    showMainMenu(ctx);
});

// ✅ Asosiy menyuga qaytarish funksiyasi
function showMainMenu(ctx) {
    userState[ctx.from.id] = { step: "main" }; // Foydalanuvchi asosiy menyuda
    ctx.reply(
        "👋 Assalamu alaykum! Botimizga xush kelibsiz ❗",
        Markup.keyboard([
            ["📍 Lokatsiya", "📞 Bog‘lanish"],
            ["📚 Kurslar", "📷 Instagram"]
        ]).resize()
    );
}

// ✅ Lokatsiya
bot.hears("📍 Lokatsiya", (ctx) => {
    ctx.reply("📍 *Manzil:* Chinoz tumani, Biznes Fabrika O‘quv Markazi", { parse_mode: "Markdown" });
    ctx.replyWithLocation(40.9413404, 68.7643290);
});

// ✅ Bog‘lanish
bot.hears("📞 Bog‘lanish", (ctx) => {
    ctx.reply("📞 Biz bilan bog‘lanish uchun: +998 97 882 09 29");
});

// ✅ Instagram havolasi
bot.hears("📷 Instagram", (ctx) => {
    ctx.reply(
        "📷 Bizning Instagram sahifamiz:",
        Markup.inlineKeyboard([
            Markup.button.url("📷 Instagram sahifamiz", "https://www.instagram.com/sheraliyevich_1309?igsh=MW55dnZtMjc4MDYwdA==")
        ])
    );
});

// ✅ Kurslar menyusi
bot.hears("📚 Kurslar", (ctx) => {
    userState[ctx.from.id] = { step: "courses" }; // Foydalanuvchi kurslar menyusida
    ctx.reply(
        "📚 Kurslarimiz:\n\n⬇️ Kursni tanlang!",
        Markup.keyboard([
            ["🌐 Web dasturlash", "💻 Kompyuter savodxonligi"],
            ["📊 Buxgalteriya", "⬅️ Ortga"]
        ]).resize()
    );
});

// ✅ Kurslar haqida ma'lumot
const courses = {
    "🌐 Web dasturlash": "📌 HTML, CSS, JavaScript va Node.js asoslari o‘rgatiladi.",
    "💻 Kompyuter savodxonligi": "📌 Kompyuter va ofis dasturlaridan foydalanishni o‘rgatamiz.",
    "📊 Buxgalteriya": "📌 1C dasturi va moliyaviy hisob-kitob kursi."
};

bot.hears(Object.keys(courses), (ctx) => {
    let course = ctx.message.text;
    userState[ctx.from.id] = { step: "register", course, messages: [] };

    ctx.reply(
        `✅ Siz *${course}* kursini tanladingiz.\n\n${courses[course]}\n\n✅ Ro‘yxatdan o‘tish uchun tugmani bosing.`,
        {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
                Markup.button.callback("✅ Ro‘yxatdan o‘tish", `register_${ctx.from.id}`)
            ])
        }
    );
});

// ✅ Ro‘yxatdan o‘tish - Ism so‘rash
bot.action(/^register_/, async (ctx) => { // ✅ async qo‘shildi
    let userId = ctx.match.input.split("_")[1];

    if (!userState[userId]) return ctx.answerCbQuery("⛔ Kurs tanlanmagan!", { show_alert: true });

    userState[userId].messages = [];
    let msg = await ctx.reply("📌 Iltimos, ismingizni kiriting (misol: Hasanboy):");
    userState[userId].messages.push(msg.message_id);
});

// ✅ Ism kiritish va telefon raqam so‘rash
bot.on("text", async (ctx) => {
    let userId = ctx.from.id;
    if (!userState[userId] || userState[userId].step !== "register") return;

    if (!userState[userId].name) {
        let name = ctx.message.text.trim();
        if (name.length < 3) {
            return ctx.reply("❌ Ism juda qisqa! Iltimos, to‘liq ismingizni kiriting:");
        }
        userState[userId].name = name;

        deleteMessages(ctx, userId);

        let msg = await ctx.reply(
            "📞 Telefon raqamingizni kiriting yoki tugmani bosing.",
            Markup.keyboard([
                [Markup.button.contactRequest("📞 Telefon raqamni yuborish")],
                ["⬅️ Ortga"]
            ]).resize()
        );

        userState[userId].messages.push(msg.message_id);
        return;
    }

    let phone = ctx.message.text.trim();
    if (!/^\+?\d{9,15}$/.test(phone)) {
        return ctx.reply("❌ Noto‘g‘ri telefon raqam! Iltimos, to‘g‘ri raqam kiriting:");
    }

    userState[userId].phone = phone;
    sendUserInfo(ctx, userId);
});

// ✅ Telefon raqamni avtomatik olish
bot.on("contact", async (ctx) => {
    let userId = ctx.from.id;
    if (!userState[userId] || userState[userId].step !== "register") return;

    userState[userId].phone = ctx.message.contact.phone_number;
    sendUserInfo(ctx, userId);
});

// ✅ Foydalanuvchi ma'lumotlarini adminga yuborish
async function sendUserInfo(ctx, userId) { // ✅ async qo‘shildi
    if (!userState[userId]) return;

    let userInfo = `📝 Yangi ro‘yxatdan o‘tish:\n\n👤 Ism: ${userState[userId].name}\n📞 Telefon: ${userState[userId].phone}\n📚 Kurs: ${userState[userId].course}`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, userInfo);
    } catch (error) {
        console.log("❌ Xatolik: " + error.message);
    }

    deleteMessages(ctx, userId);
    await ctx.reply("✅ Siz muvaffaqiyatli ro‘yxatdan o‘tdingiz ❗");
    showMainMenu(ctx);

    delete userState[userId];
}

// ✅ Xabarlarni o‘chirish funksiyasi
async function deleteMessages(ctx, userId) { // ✅ async qo‘shildi
    if (userState[userId]?.messages) {
        for (let msgId of userState[userId].messages) {
            try { await ctx.deleteMessage(msgId); } catch (e) {}
        }
    }
    userState[userId].messages = [];
}

// ✅ Ortga qaytish tugmasi
bot.hears("⬅️ Ortga", (ctx) => {
    showMainMenu(ctx);
});

// ✅ Botni ishga tushirish
bot.launch();

