// index.ts

import {Telegraf} from "telegraf";
import {message} from "telegraf/filters";

const bot = new Telegraf(process.env.BOT_TOKEN!);
bot.start((ctx: any) => ctx.reply("Welcome"));
bot.help((ctx: any) => ctx.reply("Send me a sticker"));
bot.on(message("sticker"), (ctx: any) => ctx.reply("👍"));
bot.hears("hi", (ctx: any) => ctx.reply("Hey there"));
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
