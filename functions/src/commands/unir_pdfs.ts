import { Context, Markup, Telegraf } from "telegraf";
import { PDFDocument } from "pdf-lib";

interface PdfSession {
  userId: number;
  pdfs: Buffer[];
  step: "waiting_first" | "waiting_next";
}

const sessions = new Map<number, PdfSession>();

export async function registerUnirPdfsCommand(bot: Telegraf) {
  bot.command("unir_pdfs", async (ctx: Context) => {
    console.log("[unir_pdfs] Comando /unir_pdfs executado");
    console.log("[unir_pdfs] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
    console.log("[unir_pdfs] Usuário:", ctx.from ? `${ctx.from.first_name} (ID: ${ctx.from.id})` : "N/A");
    
    const userId = ctx.from?.id;
    if (!userId) return;

    sessions.set(userId, {
      userId,
      pdfs: [],
      step: "waiting_first",
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("❌ CANCELAR", `cancel_pdf_${userId}`)],
    ]);

    console.log(`[unir_pdfs] Sessão iniciada para usuário ${userId}`);
    
    await ctx.reply(
      "📄 Envie o primeiro arquivo PDF que deseja unir:",
      keyboard
    );
  });

  // Handler para cancelar
  bot.action(/^cancel_pdf_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    console.log(`[unir_pdfs] Sessão cancelada para usuário ${userId}`);
    sessions.delete(userId);
    await ctx.editMessageText("❌ Operação cancelada.");
    await ctx.answerCbQuery();
  });

  // Handler para finalizar
  bot.action(/^finish_pdf_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    const session = sessions.get(userId);

    if (!session || session.pdfs.length < 2) {
      await ctx.answerCbQuery("Erro: sessão inválida ou poucos PDFs.");
      return;
    }

    await ctx.editMessageText("🔄 Unindo PDFs...");

    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfBuffer of session.pdfs) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const fileName = `PDFs_Unidos_${Date.now()}.pdf`;

      console.log(`[unir_pdfs] ${session.pdfs.length} PDFs unidos com sucesso para usuário ${userId}`);
      
      await ctx.replyWithDocument(
        {
          source: Buffer.from(pdfBytes),
          filename: fileName,
        },
        {
          caption: `✅ ${session.pdfs.length} PDFs unidos com sucesso!`,
        }
      );
    } catch (error) {
      console.error(`[unir_pdfs] Erro ao unir PDFs para usuário ${userId}:`, error);
      await ctx.reply("❌ Erro ao unir os PDFs. Tente novamente.");
    }

    sessions.delete(userId);
    await ctx.answerCbQuery();
  });

  // Handler para documentos
  bot.on("document", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = sessions.get(userId);
    if (!session) return;

    const document = ctx.message.document;
    if (!document.mime_type?.includes("pdf")) {
      await ctx.reply("❌ Por favor, envie apenas arquivos PDF.");
      return;
    }

    try {
      const file = await ctx.telegram.getFile(document.file_id);
      if (!file.file_path) {
        await ctx.reply("❌ Erro ao obter o arquivo.");
        return;
      }

      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const pdfBuffer = Buffer.from(await response.arrayBuffer());

      session.pdfs.push(pdfBuffer);
      session.step = "waiting_next";
      
      console.log(`[unir_pdfs] PDF ${session.pdfs.length} adicionado para usuário ${userId}`);

      const buttons = [
        [Markup.button.callback("❌ CANCELAR", `cancel_pdf_${userId}`)],
      ];

      if (session.pdfs.length >= 2) {
        buttons.unshift([
          Markup.button.callback("✅ FINALIZAR", `finish_pdf_${userId}`),
        ]);
      }

      const keyboard = Markup.inlineKeyboard(buttons);

      await ctx.reply(
        `✅ PDF ${session.pdfs.length} adicionado!\n\n📄 Envie o próximo PDF ou finalize:`,
        keyboard
      );
    } catch (error) {
      console.error(`[unir_pdfs] Erro ao processar PDF para usuário ${userId}:`, error);
      await ctx.reply("❌ Erro ao processar o PDF. Tente novamente.");
    }
  });
}

export const unirPdfsCommand = {
  register: registerUnirPdfsCommand,
  name: () => "/unir_pdfs",
  help: () => "Une múltiplos arquivos PDF em um único documento.",
  description: () => "📄 Une múltiplos PDFs em um arquivo único.",
};
