// src/index.ts
import * as dotenv from "dotenv";
dotenv.config();

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/database";
import { Telegraf } from "telegraf";
import { sendPaymentRequestHandler } from "./handlers/paymentRequestHandler";
import { registerTesteCommand } from "./commands/teste";

admin.initializeApp();

// Inicializa o bot com o token do .env
if (!process.env.BOT_TOKEN) {
  console.error("BOT_TOKEN não definido no .env");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// Comandos padrões
bot.start((ctx) => ctx.reply("Welcome"));
bot.help((ctx) => ctx.reply("Send me a sticker"));
bot.on("sticker", (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

// Registra o comando /teste
registerTesteCommand(bot);

// Função HTTP do bot para ser usada como webhook pelo Telegram
export const botFunction = onRequest((req, res) => {
  bot.handleUpdate(req.body, res);
});

// Função disparada ao criar um novo request no Realtime Database
export const sendPaymentRequest = onValueCreated(
  "/requests/{requestId}",
  (event) => {
    const snapshot = event.data;
    const params = { requestId: event.params.requestId };
    return sendPaymentRequestHandler(snapshot, params, bot);
  }
);

// Parada graciosa do bot (opcional, principalmente em ambientes serverless)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
