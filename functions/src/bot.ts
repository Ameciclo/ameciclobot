import { Telegraf } from "telegraf";
import * as dotenv from "dotenv";
dotenv.config();
console.log(process.env.BOT_TOKEN ? process.env.BOT_TOKEN.substring(0,5) : "Token not found");
const bot = new Telegraf(process.env.BOT_TOKEN!); // Aqui o BOT_TOKEN é lido da variável de ambiente

bot.start((ctx) => ctx.reply("Welcome"));
bot.help((ctx) => ctx.reply("Send me a sticker"));
bot.on("sticker", (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

export { bot };
