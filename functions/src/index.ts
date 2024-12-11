import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/database";
import { Telegraf } from "telegraf";
import { sendPaymentRequestHandler } from "./handlers/paymentRequestHandler";
import { registerTesteCommand } from "./commands/teste";

// Inicializa o Firebase Admin SDK
admin.initializeApp();

// Bot token diretamente no código (substitua pelo seu token)
const BOT_TOKEN = "";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN não definido.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Função para buscar IDs no Realtime Database
async function getConfigData() {
  try {
    const db = admin.database();
    const [coordinatorsSnapshot, groupChatSnapshot] = await Promise.all([
      db.ref("/configuration/coordinators").once("value"),
      db.ref("/configuration/financesgroup").once("value"),
    ]);

    const coordinators = coordinatorsSnapshot.val() || [];
    const groupChatId = groupChatSnapshot.val();

    return {
      coordinators: Array.isArray(coordinators) ? coordinators : [],
      groupChatId,
    };
  } catch (err) {
    console.error("Erro ao buscar dados de configuração:", err);
    return { coordinators: [], groupChatId: "" };
  }
}

// Comandos padrões do bot
bot.start((ctx) => ctx.reply("Welcome"));
bot.help((ctx) => ctx.reply("Send me a sticker"));
bot.on("sticker", (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

// Registra o comando /teste
registerTesteCommand(bot);

// Função HTTP do bot para webhook do Telegram
export const botFunction = onRequest(async (req, res) => {
  const { coordinators, groupChatId } = await getConfigData();
  console.log("Configuração carregada:", { coordinators, groupChatId });

  bot.handleUpdate(req.body, res);
});

// Função disparada ao criar um novo request no Realtime Database
export const sendPaymentRequest = onValueCreated(
  "/requests/{requestId}",
  async (event) => {
    const { coordinators, groupChatId } = await getConfigData();
    const snapshot = event.data;
    const params = { requestId: event.params.requestId };

    return sendPaymentRequestHandler(
      snapshot,
      params,
      bot,
      groupChatId,
      coordinators
    );
  }
);
