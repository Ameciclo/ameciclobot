import { Telegraf } from "telegraf";
import telegramConfig from "../credentials/telegram.json";
import {
  getQuemSouEuCommandDescription,
  getQuemSouEuCommandName,
} from "../commands/quemsoueu";
import {
  getPautaCommandDescription,
  getPautaCommandName,
} from "../commands/pauta";
import {
  getInformeCommandDescription,
  getInformeCommandName,
} from "../commands/informe";
import {
  getClippingCommandDescription,
  getClippingCommandName,
} from "../commands/clipping";
import {
  getDemandCommandDescription,
  getDemandCommandName,
} from "../commands/demanda";
import {
  getReferralsCommandDescription,
  getReferralsCommandName,
} from "../commands/encaminhamentos";
import { getHelpCommandDescription, getHelpCommandName } from "../commands/help";
import { getStartCommandDescription, getStartCommandName } from "../commands/start";

const BOT_TOKEN = telegramConfig.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN não definido.");
  process.exit(1);
}

export function setupCommands() {
  bot.telegram.setMyCommands([
    {
      command: getPautaCommandName(),
      description: getPautaCommandDescription(),
    },
    {
      command: getInformeCommandName(),
      description: getInformeCommandDescription(),
    },
    {
      command: getClippingCommandName(),
      description: getClippingCommandDescription(),
    },
    {
      command: getDemandCommandName(),
      description: getDemandCommandDescription(),
    },
    {
      command: getReferralsCommandName(),
      description: getReferralsCommandDescription(),
    },
    {
      command: getQuemSouEuCommandName(),
      description: getQuemSouEuCommandDescription(),
    },
    {
      command: getHelpCommandName(),
      description: getHelpCommandDescription(),
    },

    {
      command: getStartCommandName(),
      description: getStartCommandDescription(),
    },
  ]);
}

export const bot = new Telegraf(BOT_TOKEN);
