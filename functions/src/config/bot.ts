import { Telegraf } from "telegraf";
import telegramConfig from "../credentials/telegram.json";

const isDev = process.env.DEV_MODE === "true";

const BOT_TOKEN = isDev
  ? telegramConfig.DEV_BOT_TOKEN
  : telegramConfig.BOT_TOKEN;

console.log("BOT_TOKEN em uso:", BOT_TOKEN);
console.log("isDev:", process.env.FUNCTIONS_EMULATOR === "true");
console.log("process.env.DEV_MODE:", process.env.DEV_MODE);

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN não definido.");
  process.exit(1);
}

export const bot = new Telegraf(BOT_TOKEN);
