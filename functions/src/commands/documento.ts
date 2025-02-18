import { Context, Telegraf } from "telegraf";
import { createDocument, moveDocumentToFolder } from "../services/google";
// Importa a lista de grupos a partir do arquivo de configuração
import workgroups from "../config/workgroupsfolders.json";

export function registerDocumentoCommand(bot: Telegraf) {
  bot.command("documento", async (ctx: Context) => {
    try {
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;

      if (!from || !chat) {
        return ctx.reply(
          "Não foi possível identificar as informações da mensagem."
        );
      }

      // O comando deve ser usado em grupos de trabalho (group ou supergroup)
      if (chat.type !== "group" && chat.type !== "supergroup") {
        return ctx.reply(
          "O comando /documento deve ser usado em um grupo de trabalho."
        );
      }

      // Extrai o título original do documento (tudo o que vem após o comando)
      if (!ctx.message || !("text" in ctx.message)) {
        return ctx.reply(
          "Este comando só pode ser utilizado com mensagens de texto."
        );
      }

      const messageText = ctx.message.text || "";
      const originalTitle = messageText.replace("/documento", "").trim();
      if (!originalTitle) {
        return ctx.reply(
          "Por favor, forneça um título para o documento.\nExemplo: `/documento Nome do Documento`"
        );
      }

      // Formata a data atual no padrão AAAA.MM.DD
      const now = new Date();
      const formattedDate = `${now.getFullYear()}.${(
        "0" +
        (now.getMonth() + 1)
      ).slice(-2)}.${("0" + now.getDate()).slice(-2)}`;
      const fullTitle = `Documento - ${formattedDate} - ${originalTitle}`;

      // Procura a configuração do grupo a partir do chat.id comparando com o campo "value"
      const groupConfig = workgroups.find(
        (group: any) => group.value === String(chat.id)
      );
      if (!groupConfig) {
        return ctx.reply(
          "Este grupo não possui uma pasta configurada para documentos."
        );
      }

      // Cria o Google Docs com o título formatado
      const doc = await createDocument(fullTitle);
      const documentId = doc.documentId || doc.document_id || doc.id;
      if (!documentId) {
        return ctx.reply("Não foi possível obter o ID do documento criado.");
      }

      // Move o documento para a pasta configurada do grupo
      await moveDocumentToFolder(documentId, groupConfig.folderId);

      // Monta a URL para acessar o documento
      const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

      // Envia mensagem de sucesso com botões inline para abrir o documento e a pasta do grupo
      return ctx.reply(
        `Documento criado com sucesso na pasta "${groupConfig.label}" do Grupo de Trabalho.\nTítulo: ${fullTitle}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Abrir Documento",
                  url: documentUrl,
                },
              ],
              [
                {
                  text: "Abrir Pasta do Grupo",
                  url: groupConfig.folderUrl,
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      console.error("Erro ao processar comando /documento:", error);
      return ctx.reply(
        "Ocorreu um erro ao criar o documento. Tente novamente mais tarde."
      );
    }
  });
}
