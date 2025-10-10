import { Context, Telegraf } from "telegraf";
import * as QRCode from "qrcode";

function registerQrcodeCommand(bot: Telegraf) {
  bot.command("qrcode", async (ctx: Context) => {
    try {
      console.log("[qrcode] Comando /qrcode executado");
      console.log("[qrcode] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
      
      let link = "";

      // Verifica se é resposta a uma mensagem
      if (ctx.message && "reply_to_message" in ctx.message && ctx.message.reply_to_message) {
        const replyMessage = ctx.message.reply_to_message;
        if ("text" in replyMessage) {
          link = replyMessage.text || "";
        }
      } else {
        // Pega o link do comando
        const args = ctx.message && "text" in ctx.message ? ctx.message.text.split(" ").slice(1) : [];
        link = args.join(" ");
      }

      if (!link.trim()) {
        await ctx.reply("❌ Por favor, forneça um link.\n\nUso: `/qrcode https://exemplo.com` ou responda a uma mensagem com link.", { parse_mode: "Markdown" });
        return;
      }

      await ctx.reply("🔄 Gerando QR Code...");

      // Gera o QR Code como buffer
      const qrBuffer = await QRCode.toBuffer(link, {
        type: "png",
        width: 512,
        margin: 2,
      });

      // Envia a imagem
      await ctx.replyWithPhoto(
        { source: qrBuffer },
        { caption: `📱 QR Code para: ${link}` }
      );
      
      console.log("[qrcode] QR Code gerado com sucesso para:", link);
    } catch (error) {
      console.error("[qrcode] Erro ao gerar QR Code:", error);
      await ctx.reply("❌ Erro ao gerar QR Code. Tente novamente.");
    }
  });
}

export const qrcodeCommand = {
  name: () => "/qrcode",
  help: () => "Use o comando `/qrcode <link>` ou responda a uma mensagem com link para gerar um QR Code\\.",
  description: () => "📱 Gerar QR Code de um link.",
  register: registerQrcodeCommand,
};