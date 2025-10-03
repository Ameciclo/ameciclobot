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
import { processarExtratoCommand } from "./commands/processar_extrato";
import { registrarPlanilhaCommand } from "./commands/registrar_planilha";
import { transcreverCommand } from "./commands/transcrever";
import { quem_sou_euCommand } from "./commands/quem_sou_eu";
import { arquivarComprovanteCommand } from "./commands/arquivar_comprovante";
import { arquivarExtratoPdfCommand } from "./commands/arquivar_extrato_pdf";
import { versaoCommand } from "./commands/versao";
import { unirPdfsCommand } from "./commands/unir_pdfs";
import { qrcodeCommand } from "./commands/qrcode";
import { enqueteCommand } from "./commands/enquete";
import { resumoCommand } from "./commands/resumo";
import { complementarEventoCommand } from "./commands/complementar_evento";
// import { atribuirEventoCommand } from "./commands/atribuirEvento";
import { reciboDeRessarcimentoCommand } from "./commands/recibo_de_ressarcimento";

export const commandsList = [
  arquivarComprovanteCommand,
  arquivarExtratoPdfCommand,
  apresentacaoCommand,
  // atribuirEventoCommand,
  atualizarPendenciasCommand,
  atualizarProjetosCommand,
  clippingCommand,
  comunicacaoCommand,
  complementarEventoCommand,
  demandaCommand,
  documentoCommand,
  encaminhamentoCommand,
  enqueteCommand,
  eventoCommand,
  formularioCommand,
  informeCommand,
  modeloCommand,
  pautaCommand,
  pedidoDeInformacaoCommand,
  planilhaCommand,
  processarExtratoCommand,
  qrcodeCommand,
  reciboDeRessarcimentoCommand,
  registrarPlanilhaCommand,
  resumoCommand,
  transcreverCommand,
  quem_sou_euCommand,
  unirPdfsCommand,
  versaoCommand,
];
