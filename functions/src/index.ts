import * as functions from "firebase-functions";
import { Context } from "telegraf";
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx:Context) => ctx.reply('Welcome'));
bot.help((ctx:Context) => ctx.reply('Send me a sticker'));
bot.on('sticker', (ctx:Context) => ctx.reply('👍'));
bot.hears('hi', (ctx:Context) => ctx.reply('Hey there'));

exports.bot = functions.https.onRequest((req, res) => bot.handleUpdate(req.body, res))

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
