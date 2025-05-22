import { quem_sou_euCommand } from "../commands/quem_sou_eu";
import { pautaCommand } from "../commands/pauta";
import { informeCommand } from "../commands/informe";
import { demandaCommand } from "../commands/demanda";
import { encaminhamentoCommand } from "../commands/encaminhamento";
import { pedidoDeInformacaoCommand } from "../commands/pedido_de_informacao";
import { documentoCommand } from "../commands/documento";
import { planilhaCommand } from "../commands/planilha";
import { formularioCommand } from "../commands/formulario";
import { apresentacaoCommand } from "../commands/apresentacao";
import { registrarPlanilhaCommand } from "../commands/registrar_planilha";
import { clippingCommand } from "../commands/clipping";
import { modeloCommand } from "../commands/modelo";
import { arquivarComprovanteCommand } from "../commands/arquivarComprovante";

export const commandsList = [
  arquivarComprovanteCommand,
  apresentacaoCommand,
  demandaCommand,
  documentoCommand,
  encaminhamentoCommand,
  formularioCommand,
  informeCommand,
  modeloCommand,
  pautaCommand,
  pedidoDeInformacaoCommand,
  planilhaCommand,
  quem_sou_euCommand,
  registrarPlanilhaCommand,
  clippingCommand,
];
