import { apresentacaoCommand } from "./commands/apresentacao";
import { atualizarPendenciasCommand } from "./commands/atualizar_pendencias";
import { atualizarProjetosCommand } from "./commands/atualizar_projetos";
import { pautaCommand } from "./commands/pauta";
import { clippingCommand } from "./commands/clipping";
import { demandaCommand } from "./commands/demanda";
import { comunicacaoCommand } from "./commands/comunicacao";
import { documentoCommand } from "./commands/documento";
import { encaminhamentoCommand } from "./commands/encaminhamento";
import { eventoCommand } from "./commands/evento";
import { formularioCommand } from "./commands/formulario";
import { informeCommand } from "./commands/informe";
import { modeloCommand } from "./commands/modelo";
import { pedidoDeInformacaoCommand } from "./commands/pedido_de_informacao";
import { planilhaCommand } from "./commands/planilha";
import { processarExtratosCcCommand } from "./commands/processar_extrato_cc";
import { processarExtratoFiCommand } from "./commands/processar_extrato_fi";
import { registrarPlanilhaCommand } from "./commands/registrar_planilha";
import { transcreverCommand } from "./commands/transcrever";
import { quem_sou_euCommand } from "./commands/quem_sou_eu";
import { arquivarComprovanteCommand } from "./commands/arquivar_comprovante";
import { arquivarExtratoPdfCommand } from "./commands/arquivar_extrato_pdf";

export const commandsList = [
  arquivarComprovanteCommand,
  arquivarExtratoPdfCommand,
  apresentacaoCommand,
  atualizarPendenciasCommand,
  atualizarProjetosCommand,
  clippingCommand,
  comunicacaoCommand,
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
  processarExtratosCcCommand,
  processarExtratoFiCommand,
  registrarPlanilhaCommand,
  transcreverCommand,
  quem_sou_euCommand,
];
