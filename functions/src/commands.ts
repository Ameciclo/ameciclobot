import { apresentacaoCommand } from "./commands/apresentacao";
import { pautaCommand } from "./commands/pauta";
import { clippingCommand } from "./commands/clipping";
import { demandaCommand } from "./commands/demanda";
import { documentoCommand } from "./commands/documento";
import { encaminhamentoCommand } from "./commands/encaminhamento";
import { formularioCommand } from "./commands/formulario";
import { informeCommand } from "./commands/informe";
import { modeloCommand } from "./commands/modelo";
import { pedidoDeInformacaoCommand } from "./commands/pedido_de_informacao";
import { planilhaCommand } from "./commands/planilha";
import { registrarPlanilhaCommand } from "./commands/registrar_planilha";
import { transcreverCommand } from "./commands/transcrever";
import { quem_sou_euCommand } from "./commands/quem_sou_eu";
import { eventoCommand } from "./commands/evento";

export const commandsList = [
  apresentacaoCommand,
  clippingCommand,
  demandaCommand,
  documentoCommand,
  encaminhamentoCommand,
  eventoCommand,
  formularioCommand,
  informeCommand,
  modeloCommand,
  pautaCommand,
  pedidoDeInformacaoCommand,
  planilhaCommand,
  registrarPlanilhaCommand,
  transcreverCommand,
  quem_sou_euCommand,
];
