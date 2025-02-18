import {
  getPautaCommandName,
  getPautaCommandDescription,
  getPautaCommandHelp,
} from "../commands/pauta";
import {
  getInformeCommandName,
  getInformeCommandDescription,
  getInformeCommandHelp,
} from "../commands/informe";
import {
  getClippingCommandName,
  getClippingCommandDescription,
  getClippingCommandHelp,
} from "../commands/clipping";
import {
  getDemandaCommandName,
  getDemandaCommandDescription,
  getDemandaCommandHelp,
} from "../commands/demanda";
import {
  getEncaminhamentoCommandName,
  getEncaminhamentoCommandDescription,
  getEncaminhamentoCommandHelp,
} from "../commands/encaminhamentos";
import {
  getPedidoCommandName,
  getPedidoCommandDescription,
} from "../commands/pedido_de_informacao";
import {
  getQuemSouEuCommandName,
  getQuemSouEuCommandDescription,
  getQuemSouEuCommandHelp,
} from "../commands/quemsoueu";
import {
  getDocumentoCommandName,
  getDocumentoCommandDescription,
  getDocumentoCommandHelp,
} from "../commands/documento";
import {
  getPlanilhaCommandName,
  getPlanilhaCommandDescription,
  getPlanilhaCommandHelp,
} from "../commands/planilha";
import {
  getApresentacaoCommandName,
  getApresentacaoCommandDescription,
  getApresentacaoCommandHelp,
} from "../commands/apresentacao";
import {
  getFormularioCommandName,
  getFormularioCommandDescription,
  getFormularioCommandHelp,
} from "../commands/formulario";

export interface CommandEntry {
  name: string;
  description: string;
  helpText: string;
  hideFromStart?: boolean;
  hideFromHelp?: boolean;
}

export const commandsList: CommandEntry[] = [
  {
    name: getPautaCommandName(),
    description: getPautaCommandDescription(),
    helpText: getPautaCommandHelp(),
  },
  {
    name: getInformeCommandName(),
    description: getInformeCommandDescription(),
    helpText: getInformeCommandHelp(),
  },
  {
    name: getClippingCommandName(),
    description: getClippingCommandDescription(),
    helpText: getClippingCommandHelp(),
  },
  {
    name: getDemandaCommandName(),
    description: getDemandaCommandDescription(),
    helpText: getDemandaCommandHelp(),
  },
  {
    name: getEncaminhamentoCommandName(),
    description: getEncaminhamentoCommandDescription(),
    helpText: getEncaminhamentoCommandHelp(),
  },
  {
    name: getPedidoCommandName(),
    description: getPedidoCommandDescription(),
    helpText: getPedidoCommandDescription(),
  },
  {
    name: getQuemSouEuCommandName(),
    description: getQuemSouEuCommandDescription(),
    helpText: getQuemSouEuCommandHelp(),
  },
  {
    name: getDocumentoCommandName(),
    description: getDocumentoCommandDescription(),
    helpText: getDocumentoCommandHelp(),
  },
  {
    name: getPlanilhaCommandName(),
    description: getPlanilhaCommandDescription(),
    helpText: getPlanilhaCommandHelp(),
  },
  {
    name: getApresentacaoCommandName(),
    description: getApresentacaoCommandDescription(),
    helpText: getApresentacaoCommandHelp(),
  },
  {
    name: getFormularioCommandName(),
    description: getFormularioCommandDescription(),
    helpText: getFormularioCommandHelp(),
  },
];

/**
 * Constrói uma mensagem listando os comandos.
 * @param header Texto a ser exibido no início.
 * @param footer Texto exibido ao final.
 * @param hideFromFlag Se "hideFromStart" ou "hideFromHelp", determina quais comandos serão ocultados.
 */
export function buildCommandsMessage(
  header: string,
  footer: string,
  hideFromFlag: "hideFromStart" | "hideFromHelp" = "hideFromHelp"
): string {
  let message = header + "\n\n";
  commandsList.forEach((cmd) => {
    if (cmd[hideFromFlag]) {
      return;
    }
    if (hideFromFlag === "hideFromHelp") {
      message += `<b>${cmd.name}</b>:\n${cmd.helpText}\n\n`;
    } else {
      message += `<b>${cmd.name}</b> - ${cmd.description}\n`;
    }
  });
  message += "\n" + footer;
  return message;
}

export function getCommandByName(name: string): CommandEntry | undefined {
  return commandsList.find((cmd) => cmd.name === name);
}
