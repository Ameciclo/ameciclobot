import { Context, Telegraf } from "telegraf";
import { setTempData } from "../services/firebase";

function registerNovoArquivoCommand(bot: Telegraf) {
  bot.command("novo_arquivo", async (ctx: Context) => {
    console.log("[novo_arquivo] Comando /novo_arquivo executado");
    console.log("[novo_arquivo] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
    
    if (!ctx.message || !("text" in ctx.message)) {
      return ctx.reply("Este comando só pode ser utilizado com mensagens de texto.");
    }

    const messageText = ctx.message.text;
    const title = messageText.replace("/novo_arquivo@ameciclobot", "").replace("/novo_arquivo", "").trim();
    
    if (!title) {
      return ctx.reply(
        "Por favor, forneça um título para o arquivo.\nExemplo: `/novo_arquivo Nome do Arquivo`"
      );
    }

    const messageId = ctx.message.message_id;
    const chatId = ctx.message.chat.id;
    
    // Armazena o título temporariamente no Firebase
    await setTempData(`title_${chatId}_${messageId}`, { title }, 300);

    const buttons = [
      [{ text: "📄 Documento", callback_data: `new_file:documento:${messageId}` }],
      [{ text: "🎞️ Apresentação", callback_data: `new_file:apresentacao:${messageId}` }],
      [{ text: "📝 Formulário", callback_data: `new_file:formulario:${messageId}` }],
      [{ text: "📊 Planilha", callback_data: `new_file:planilha:${messageId}` }],
      [{ text: "📋 Modelo", callback_data: `new_file:modelo:${messageId}` }]
    ];

    console.log(`[novo_arquivo] Solicitação de criação de arquivo: "${title}"`);
    
    return ctx.reply(
      `Que tipo de arquivo você quer criar?\nTítulo: ${title}`,
      { reply_markup: { inline_keyboard: buttons } }
    );
  });
}

export const novoArquivoCommand = {
  register: registerNovoArquivoCommand,
  name: () => "/novo_arquivo",
  help: () => "Use o comando `/novo_arquivo` para criar diferentes tipos de arquivos\\. O formato esperado é:\\n`/novo_arquivo \\[título do arquivo\\]`",
  description: () => "📁 Criar novos arquivos (documento, apresentação, formulário, planilha ou modelo).",
};