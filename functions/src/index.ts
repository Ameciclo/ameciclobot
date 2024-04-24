import * as functions from "firebase-functions";
import {Context, Telegraf} from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN ? process.env.BOT_TOKEN : "");

bot.start((ctx:Context) => ctx.reply("Welcome"));
bot.help((ctx:Context) => ctx.reply("Send me a sticker"));
bot.on("sticker", (ctx:Context) => ctx.reply("👍"));
bot.hears("hi", (ctx:Context) => ctx.reply("Hey there"));

exports.bot = functions.https.onRequest((req, res) => {
  bot.handleUpdate(req.body, res);
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

/**
 * console.log("Iniciando ameciclobot");

require("dotenv").config({ path: "../.env" });

import { Telegraf } from "telegraf";
//import * as evento from "./commands/evento/index";
import { MyContext } from "./types";
import paymentComposer from "./commands/pagamento";

const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN!);

bot.use(paymentComposer);

bot.use(async (ctx, next) => {
  const start = new Date().getMilliseconds();
  await next();
  const end = new Date().getMilliseconds();
  const ms = start - end;
  console.log("Response time: %sms", ms);
});

//bot.command("evento", (ctx) => ctx.scene.enter("evento"));
bot.catch((err) => console.log(err));

bot.launch();
console.log("ameciclobot INICIADO");

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
 */