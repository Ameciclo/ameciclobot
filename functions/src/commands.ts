import { atualizarPendenciasCommand } from "./commands/atualizar_pendencias";
import { atualizarProjetosCommand } from "./commands/atualizar_projetos";
import { pautaCommand } from "./commands/pauta";
import { clippingCommand } from "./commands/clipping";
import { demandaCommand } from "./commands/demanda";
import { comunicacaoCommand } from "./commands/comunicacao";
import { eventoCommand } from "./commands/evento";
import { informeCommand } from "./commands/informe";
import { pedidoDeInformacaoCommand } from "./commands/pedido_de_informacao";
import { novoArquivoCommand } from "./commands/novo_arquivo";
import { arquivarComprovanteCommand } from "./commands/arquivar_comprovante";
import { arquivarExtratoPdfCommand } from "./commands/arquivar_extrato_pdf";
import { processarExtratoCommand } from "./commands/processar_extrato";
import { qrcodeCommand } from "./commands/qrcode";
import { enqueteCommand } from "./commands/enquete";
import { complementarEventoCommand } from "./commands/complementar_evento";
import { atribuirEventoCommand } from "./commands/atribuir_evento";
import { reciboDeRessarcimentoCommand } from "./commands/recibo_de_ressarcimento";
import { registrarPlanilhaCommand } from "./commands/registrar_planilha";
import { transcreverCommand } from "./commands/transcrever";
import { unirPdfsCommand } from "./commands/unir_pdfs";
import { resumoCommand } from "./commands/resumo";
import { relatorioSemanalCommand } from "./commands/relatorio-semanal";

export const commandsList = [
  arquivarComprovanteCommand,
  arquivarExtratoPdfCommand,
  atribuirEventoCommand,
  atualizarPendenciasCommand,
  atualizarProjetosCommand,
  clippingCommand,
  comunicacaoCommand,
  complementarEventoCommand,
  demandaCommand,
  enqueteCommand,
  eventoCommand,
  informeCommand,
  novoArquivoCommand,
  pautaCommand,
  pedidoDeInformacaoCommand,
  processarExtratoCommand,
  qrcodeCommand,
  reciboDeRessarcimentoCommand,
  registrarPlanilhaCommand, 
  relatorioSemanalCommand, 
  resumoCommand,
  transcreverCommand,
  unirPdfsCommand,
];
