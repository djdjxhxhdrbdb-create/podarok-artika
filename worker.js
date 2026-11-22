const API = "https://api.telegram.org";
const OWNER_IDS = new Set([
  "6811997084"
]);

function isOwner(userId) {
  return OWNER_IDS.has(String(userId));
}
async function telegram(env, method, data = {}) {
  const response = await fetch(
    `${API}/bot${env.BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }
  );

  const result = await response.json();

  if (!result.ok) {
    console.error("Telegram API error:", result);
    throw new Error(result.description || "Telegram API error");
  }

  return result.result;
}

 function db(env, action, data = {}) {
  const id = env.BOT_DB.idFromName("main-database");
  const stub = env.BOT_DB.get(id);

  const response = await stub.fetch("https://database.internal/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data })
  });

  if (!response.ok) {
    throw new Error("Database error: " + response.status);
  }

  return response.json();
}

function mainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "💰 Заработок", callback_data: "earn" }],
      [
        { text: "👤 Профиль", callback_data: "profile" },
        { text: "👥 Друзья", callback_data: "referrals" }
      ],
      [
        { text: "🎁 Кейс дня", callback_data: "case" },
        { text: "🛍 Магазин звёзд", callback_data: "shop" }
      ],
      [
        { text: "🎉 Раздачи", callback_data: "giveaways" },
        { text: "✨ Ещё", callback_data: "more" }
      ],
      [{ text: "📱 Открыть приложение", callback_data: "app" }]
    ]
  };
}

function backKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "⬅️ Главное меню", callback_data: "home" }]
    ]
  };
}

 function send(env, chatId, text, keyboard = mainKeyboard()) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: keyboard,
    parse_mode: "HTML",
    disable_web_page_preview: true
  });
}

 function edit(env, chatId, messageId, text, keyboard = backKeyboard()) {
  return telegram(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: keyboard,
    parse_mode: "HTML",
    disable_web_page_preview: true
  });
}

 function answerCallback(env, callbackId, text = "") {
  return telegram(env, "answerCallbackQuery", {
    callback_query_id: callbackId,
    text,
    show_alert: false
  });
}

 function showHome(env, chatId, messageId = null) {
  const text =
    "🎁 <b>Подарок артика</b>\n\n" +
    "⭐ Выполняй задания, зарабатывай звёзды " +
    "и получай настоящие Telegram-подарки!\n\n" +
    "Выбирай нужный раздел в меню 👇";

  if (messageId) {
    return edit(env, chatId, messageId, text, mainKeyboard());
  }

  return send(env, chatId, text, mainKeyboard());
}

 function showProfile(env, chatId, messageId, user) {
  const text =
    "👤 <b>Твой профиль</b>\n\n" +
    `🆔 ID: <code>${user.id}</code>\n` +
    `⭐ Баланс: <b>${user.balance} ⭐</b>\n` +
    `👥 Приглашено друзей: <b>${user.referrals}</b>\n\n` +
    "Здесь будет отображаться твоя статистика.";

  return edit(env, chatId, messageId, text, {
    inline_keyboard: [
      [{ text: "⭐ Пополнить баланс", callback_data: "deposit" }],
      [{ text: "🎁 Вывести подарок", callback_data: "withdraw" }],
      [{ text: "🔄 Обновить баланс", callback_data: "profile" }],
      [{ text: "⬅️ Главное меню", callback_data: "home" }]
    ]
  });
}

 function showEarn(env, chatId, messageId) {
  return edit(
    env, chatId, messageId,
    "💰 <b>Заработок</b>\n\nВыбирай способ заработка:",
    {
      inline_keyboard: [
        [{ text: "📱 TikTok-задания", callback_data: "task_tiktok" }],
        [{ text: "📸 Сторис с личной ссылкой · 10 ⭐", callback_data: "task_story" }],
        [{ text: "🏆 Турнир мемов и роликов", callback_data: "tournament" }],
        [{ text: "📨 Telegram-задания", callback_data: "task_telegram" }],
        [{ text: "👥 Подписка на канал · 2 ⭐", callback_data: "task_channel" }],
        [{ text: "💬 Подарки за общение", callback_data: "task_chat" }],
        [{ text: "🎥 Заработок за видео", callback_data: "task_video" }],
        [{ text: "📷 Скриншоты комментариев", callback_data: "task_comments" }],
        [{ text: "⬅️ Главное меню", callback_data: "home" }]
      ]
    }
  );
}

 function showMore(env, chatId, messageId) {
  return edit(env, chatId, messageId, "✨ <b>Ещё</b>\n\nВыбирай раздел:", {
    inline_keyboard: [
      [{ text: "🏆 Лидеры", callback_data: "leaders" }],
      [
        { text: "🎟 Промокод", callback_data: "promo" },
        { text: "📖 Правила", callback_data: "rules" }
      ],
      [{ text: "🆘 Поддержка", url: "https://t.me/ВСТАВЬ_НИК_ПОДДЕРЖКИ" }],
      [{ text: "⬅️ Главное меню", callback_data: "home" }]
    ]
  });
}

 function handleTask(env, chatId, messageId, type) {
  const names = {
    tiktok: "TikTok-задания",
    story: "Сторис с личной ссылкой",
    telegram: "Telegram-задания",
    channel: "Подписка на канал",
    chat: "Подарки за общение в чате",
    video: "Заработок за видео",
    comments: "Скриншоты комментариев"
  };

  const name = names[type] || "Задания";

  return edit(
    env, chatId, messageId,
    `📋 <b>${name}</b>\n\n` +
    "Список заданий будет добавлен в этот раздел.\n\n" +
    "Награда будет начисляться только после проверки выполнения.",
    backKeyboard()
  );
}

 async function showAdmin(env, chatId) {
  return send(env, chatId,
    "🛠 <b>Панель администратора</b>\n\n" +
    "Добро пожаловать, владелец!\n\n" +
    "Здесь будет управление проектом «Подарок артика».",
    {
      inline_keyboard: [
        [{ text: "👥 Пользователи", callback_data: "admin_users" }],
        [{ text: "⭐ Управление балансами", callback_data: "admin_balance" }],
        [{ text: "📋 Управление заданиями", callback_data: "admin_tasks" }],
        [{ text: "🎟 Промокоды", callback_data: "admin_promos" }],
        [{ text: "🎁 Заявки на подарки", callback_data: "admin_gifts" }],
        [{ text: "🏆 Турниры и раздачи", callback_data: "admin_events" }],
        [{ text: "⬅️ Главное меню", callback_data: "home" }]
      ]
    }
  );
}
async function handleUpdate(update, env) {
  if (update.message) {
    const message = update.message;
    const chatId = message.chat.id;
    const from = message.from;

    if (!from || message.chat.type !== "private") return;
    
if (message.text === "/admin") {
  if (!isOwner(from.id)) {
    return send(env, chatId, "⛔ У тебя нет доступа.");
  }
  return showAdmin(env, chatId);
}
    
    if (message.text?.startsWith("/start")) {
      const payload = message.text.split(" ")[1] || "";
      const refMatch = payload.match(/^ref_(\d+)$/);
      const referrerId = refMatch ? Number(refMatch[1]) : null;

      await db(env, "register", {
        id: from.id,
        username: from.username || null,
        firstName: from.first_name || "Пользователь",
        referrerId
      });

      return showHome(env, chatId);
    }

    if (message.text?.startsWith("/help")) {
      return send(env, chatId,
        "🆘 <b>Помощь</b>\n\nИспользуй кнопки главного меню для навигации."
      );
    }

    return;
  }

  if (update.callback_query) {
    const query = update.callback_query;
    const data = query.data || "";
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    const userId = query.from.id;

    await answerCallback(env, query.id);

    if (!chatId || !messageId) return;

    if (data === "home") return showHome(env, chatId, messageId);
    if (data === "earn") return showEarn(env, chatId, messageId);
    if (data === "more") return showMore(env, chatId, messageId);

    if (data === "profile") {
      const user = await db(env, "get_user", { id: userId });
      return showProfile(env, chatId, messageId, user);
    }

    if (data === "referrals") {
      const user = await db(env, "get_user", { id: userId });
      const botInfo = await telegram(env, "getMe");
      const link = `https://t.me/${botInfo.username}?start=ref_${userId}`;

      return edit(env, chatId, messageId,
        "👥 <b>Пригласи друзей</b>\n\n" +
        "Отправляй свою ссылку друзьям и получай награды за приглашения.\n\n" +
        `Твоя ссылка:\n<code>${link}</code>\n\n` +
        `Приглашено: <b>${user.referrals}</b>`,
        {
          inline_keyboard: [
            [{ text: "📋 Главное меню", callback_data: "home" }]
          ]
        }
      );
    }

    if (data.startsWith("task_")) {
      return handleTask(env, chatId, messageId, data.slice(5));
    }

    const sections = {
      case: "🎁 <b>Кейс дня</b>\n\nЕжедневные кейсы скоро появятся.",
      shop: "🛍 <b>Магазин звёзд</b>\n\nКаталог будет подключён отдельно.",
      giveaways: "🎉 <b>Раздачи</b>\n\nАктивные раздачи скоро появятся.",
      app: "📱 <b>Приложение</b>\n\nСсылка на приложение будет добавлена.",
      tournament: "🏆 <b>Турниры</b>\n\nИнформация о турнирах скоро появится.",
      deposit: "⭐ <b>Пополнение баланса</b>\n\nПополнение будет реализовано через Telegram Stars.",
      withdraw: "🎁 <b>Вывод подарков</b>\n\nЗдесь появится каталог настоящих Telegram-подарков.",
      leaders: "🏆 <b>Лидеры</b>\n\nРейтинг участников скоро появится.",
      promo: "🎟 <b>Промокод</b>\n\nОтправь промокод отдельным сообщением после запуска соответствующего раздела.",
      rules: "📖 <b>Правила</b>\n\n1. Не используй накрутку.\n2. Выполняй задания честно.\n3. Не отправляй чужие доказательства.\n4. За нарушения возможна блокировка."
    };

    if (sections[data]) {
      return edit(env, chatId, messageId, sections[data], backKeyboard());
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, bot: "Подарок артика" });
    }

    if (url.pathname !== "/webhook" || request.method !== "POST") {
      return new Response("Подарок артика работает", { status: 200 });
    }

    if (
      env.WEBHOOK_SECRET &&
      request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET
    ) {
      return new Response("Forbidden", { status: 403 });
    }

    if (!env.BOT_TOKEN || !env.BOT_DB) {
      return new Response("Worker configuration error", { status: 500 });
    }

    try {
      const update = await request.json();
      await handleUpdate(update, env);
      return Response.json({ ok: true });
    } catch (error) {
      console.error("Update error:", error);
      return Response.json({ ok: true });
    }
  }
};

export class BotDatabase {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.sql = ctx.storage.sql;

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        balance INTEGER NOT NULL DEFAULT 0,
        referrals INTEGER NOT NULL DEFAULT 0,
        referrer_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      let result;

      if (body.action === "register") {
        const existing = this.sql.exec(
          "SELECT id FROM users WHERE id = ?",
          body.id
        ).toArray();

        if (existing.length === 0) {
          const referrer = body.referrerId &&
            body.referrerId !== body.id
            ? this.sql.exec(
                "SELECT id FROM users WHERE id = ?",
                body.referrerId
              ).toArray()
            : [];

          this.sql.exec(
            `INSERT INTO users
             (id, username, first_name, referrer_id)
             VALUES (?, ?, ?, ?)`,
            body.id,
            body.username,
            body.firstName,
            referrer.length ? body.referrerId : null
          );

          if (referrer.length) {
            this.sql.exec(
              "UPDATE users SET referrals = referrals + 1 WHERE id = ?",
              body.referrerId
            );
          }
        } else {
          this.sql.exec(
            "UPDATE users SET username = ?, first_name = ? WHERE id = ?",
            body.username,
            body.firstName,
            body.id
          );
        }

        result = { ok: true };
      } else if (body.action === "get_user") {
        const rows = this.sql.exec(
          "SELECT id, username, first_name, balance, referrals FROM users WHERE id = ?",
          body.id
        ).toArray();

        result = rows[0] || {
          id: body.id,
          balance: 0,
          referrals: 0
        };
      } else {
        return Response.json({ error: "Unknown action" }, { status: 400 });
      }

      return Response.json(result);
    } catch (error) {
      console.error("Database error:", error);
      return Response.json({ error: "Database operation failed" }, { status: 500 });
    }
  }
}

