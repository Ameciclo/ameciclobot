import { Telegraf } from "telegraf";
import telegramConfig from "../credentials/telegram.json";
import telegramConfigDEV from "../credentials/dev/telegram.json";
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
  getDemandaCommandDescription,
  getDemandaCommandName,
} from "../commands/demanda";
import {
  getEncaminhamentoCommandDescription,
  getEncaminhamentoCommandName,
} from "../commands/encaminhamentos";
import {
  getHelpCommandDescription,
  getHelpCommandName,
} from "../commands/help";
import {
  getStartCommandDescription,
  getStartCommandName,
} from "../commands/start";
import {
  getPedidoCommandDescription,
  getPedidoCommandName,
} from "../commands/pedido_de_informacao";
import {
  getPlanilhaCommandDescription,
  getPlanilhaCommandName,
} from "../commands/planilha";
import {
  getDocumentoCommandDescription,
  getDocumentoCommandName,
} from "../commands/documento";
import {
  getApresentacaoCommandDescription,
  getApresentacaoCommandName,
} from "../commands/apresentacao";
import {
  getFormularioCommandDescription,
  getFormularioCommandName,
} from "../commands/formulario";

const BOT_TOKEN = process.env.DEV_MODE
  ? telegramConfigDEV.BOT_TOKEN
  : telegramConfig.BOT_TOKEN;

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
      command: getDemandaCommandName(),
      description: getDemandaCommandDescription(),
    },
    {
      command: getEncaminhamentoCommandName(),
      description: getEncaminhamentoCommandDescription(),
    },
    {
      command: getPedidoCommandName(),
      description: getPedidoCommandDescription(),
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
    {
      command: getDocumentoCommandName(),
      description: getDocumentoCommandDescription(),
    },

    {
      command: getApresentacaoCommandName(),
      description: getApresentacaoCommandDescription(),
    },

    {
      command: getFormularioCommandName(),
      description: getFormularioCommandDescription(),
    },
    {
      command: getPlanilhaCommandName(),
      description: getPlanilhaCommandDescription(),
    },
  ]);
}

export const bot = new Telegraf(BOT_TOKEN);
