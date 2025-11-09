import { pautaCommand } from "./commands/pauta";
import { clippingCommand } from "./commands/clipping";
import { demandaCommand } from "./commands/demanda";
import { eventoCommand } from "./commands/evento";
import { informeCommand } from "./commands/informe";
import { pedidoDeInformacaoCommand } from "./commands/pedido_de_informacao";
import { novoArquivoCommand } from "./commands/novo_arquivo";
import { qrcodeCommand } from "./commands/qrcode";
import { enqueteCommand } from "./commands/enquete";
import { registrarPlanilhaCommand } from "./commands/registrar_planilha";
import { transcreverCommand } from "./commands/transcrever";
import { unirPdfsCommand } from "./commands/unir_pdfs";
import { resumoCommand } from "./commands/resumo";
import { testarRotinasCommand } from "./commands/testar_rotinas";
import { ajudanteFinanceiroCommand } from "./commands/ajudante_financeiro";
import { denunciaCommand } from "./commands/denuncia";

export const commandsList = [
  ajudanteFinanceiroCommand,
  clippingCommand,
  demandaCommand,
  denunciaCommand,
  enqueteCommand,
  eventoCommand,
  informeCommand,
  novoArquivoCommand,
  pautaCommand,
  pedidoDeInformacaoCommand,
  qrcodeCommand,
  registrarPlanilhaCommand, 
  resumoCommand,
  transcreverCommand,
  testarRotinasCommand, 
  unirPdfsCommand,
];
