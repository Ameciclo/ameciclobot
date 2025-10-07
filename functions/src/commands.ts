import { pautaCommand } from "./commands/pauta";
import { clippingCommand } from "./commands/clipping";
import { demandaCommand } from "./commands/demanda";
import { eventoCommand } from "./commands/evento";
import { informeCommand } from "./commands/informe";
import { pedidoDeInformacaoCommand } from "./commands/pedido_de_informacao";
import { novoArquivoCommand } from "./commands/novo_arquivo";
import { qrcodeCommand } from "./commands/qrcode";
import { enqueteCommand } from "./commands/enquete";
import { atribuirEventoCommand } from "./commands/atribuir_evento";
import { registrarPlanilhaCommand } from "./commands/registrar_planilha";
import { transcreverCommand } from "./commands/transcrever";
import { unirPdfsCommand } from "./commands/unir_pdfs";
import { resumoCommand } from "./commands/resumo";
import { executarSchedulerCommand } from "./commands/executar-scheduler";
import { ajudanteFinanceiroCommand } from "./commands/ajudante_financeiro";

export const commandsList = [
  ajudanteFinanceiroCommand,
  atribuirEventoCommand,
  clippingCommand,
  demandaCommand,
  enqueteCommand,
  eventoCommand,
  informeCommand,
  novoArquivoCommand,
  pautaCommand,
  pedidoDeInformacaoCommand,
  qrcodeCommand,
  registrarPlanilhaCommand, 
  executarSchedulerCommand, 
  resumoCommand,
  transcreverCommand,
  unirPdfsCommand,
];
