// commands/atualizarExtratosCommand.ts
import { Context, Telegraf } from 'telegraf';
import { processExtratoFile } from '../services/extratosService';

export function getName() {
  return '/atualizar_extratos';
}

export function getHelp() {
  return 'Atualiza extratos. Use este comando respondendo a uma mensagem que contenha um arquivo CSV ou TXT.';
}

export function getDescription() {
  return 'Processa o arquivo de extrato (CSV/TXT), identifica a conta, mês e ano, atualiza a planilha correta e faz upload do arquivo para o Google Drive.';
}

export function register(bot: Telegraf) {
  bot.command('atualizar_extratos', async (ctx: Context) => {
    try {
      // Verifica se a mensagem é uma resposta e contém um documento
      if (!ctx.message || !ctx.message.reply_to_message || !ctx.message.reply_to_message.document) {
        return ctx.reply("Por favor, responda a uma mensagem que contenha o arquivo CSV ou TXT.");
      }
      
      const document = ctx.message.reply_to_message.document;
      if (
        !document.mime_type ||
        (!document.mime_type.includes('csv') && !document.mime_type.includes('plain'))
      ) {
        return ctx.reply("O arquivo deve ser CSV ou TXT.");
      }
      
      // Obtém a URL do arquivo do Telegram
      const fileId = document.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);
      
      // processExtratoFile deve:
      // - Baixar e ler o conteúdo do arquivo
      // - Identificar a conta, mês e ano
      // - Atualizar os dados na planilha correta
      // - Fazer upload do arquivo para a pasta correta no Google Drive
      await processExtratoFile(fileLink.href);
      
      ctx.reply("Extrato atualizado com sucesso.");
    } catch (error) {
      console.error("Erro ao atualizar extratos:", error);
      ctx.reply("Erro ao atualizar extratos.");
    }
  });
}

export const atualizarExtratosCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
