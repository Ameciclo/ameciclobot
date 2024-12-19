import { Telegraf } from "telegraf";
import telegramConfig from "../credentials/telegram.json";

const BOT_TOKEN = telegramConfig.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN não definido.");
  process.exit(1);
}

export const bot = new Telegraf(BOT_TOKEN);
