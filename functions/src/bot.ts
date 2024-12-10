// src/bot.ts

import { Telegraf } from "telegraf";
import { Context } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN ? process.env.BOT_TOKEN : "");

bot.start((ctx: Context) => ctx.reply("Welcome"));
bot.help((ctx: Context) => ctx.reply("Send me a sticker"));
bot.on("sticker", (ctx: Context) => ctx.reply("👍"));
bot.hears("hi", (ctx: Context) => ctx.reply("Hey there"));

export { bot };
