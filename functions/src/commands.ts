import { apresentacaoCommand } from "./commands/apresentacao";
import { atualizarProjetosCommand } from "./commands/atualizar_projetos";
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
import { atualizarPendenciasCommand } from "./commands/atualizar_pendencias";

export const commandsList = [
  apresentacaoCommand,
  atualizarPendenciasCommand,
  atualizarProjetosCommand,
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
