import { Context, Telegraf } from "telegraf";
import { saveProtocolRecord } from "../services/firebase";

// Helper functions for command metadata
export function getName() {
  return "/pedido_de_informacao";
}

export function getHelp() {
  return "Use o comando `/pedido_de_informacao` seguido do protocolo e senha, ou responda a uma mensagem contendo esses dados.\n\nFormato:\n`/pedido_de_informacao [protocolo] [senha]`\nOu responda a uma mensagem com o texto padrão de solicitação.";
}

export function getDescription() {
  return "🔐 Registrar protocolo e senha de solicitação de informação";
}

// Main command handler
export function register(bot: Telegraf) {
  bot.command("pedido_de_informacao", async (ctx: Context) => {
    try {
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;
      const message = ctx.message;

      let protocol = "";
      let password = "";

      // Check if message is a text message
      if (message && "text" in message) {
        const args = message.text
          .replace("/pedido_de_informacao", "")
          .trim()
          .split(/\s+/);

        // Try direct arguments first
        if (args.length >= 2) {
          [protocol, password] = args;
        }
        // Try to extract from replied message
        else if (
          message.reply_to_message &&
          "text" in message.reply_to_message
        ) {
          const extraction = extractProtocolAndPassword(
            message.reply_to_message.text
          );
          protocol = extraction.protocol;
          password = extraction.password;
        }
        // Try to extract from current message text
        else {
          const extraction = extractProtocolAndPassword(message.text);
          protocol = extraction.protocol;
          password = extraction.password;
        }
      }

      // Validation
      if (!from || !chat) {
        return ctx.reply("Não foi possível identificar o usuário ou chat.");
      }

      if (!protocol || !password) {
        return ctx.reply(getHelp());
      }
      // Save to Firebase
      const firebaseSuccess = await saveProtocolRecord(
        protocol,
        password,
        ctx.message.from,
        ctx.message.chat.id
      );

      if (firebaseSuccess) {
        return ctx.reply(
          `✅ Registrado com sucesso!\nProtocolo: ${protocol}\nSenha: ${password}`
        );
      } else {
        return ctx.reply(
          "✅ Dados registrados localmente, mas houve um erro no armazenamento em nuvem."
        );
      }
    } catch (error) {
      console.error("Erro no comando /pedido_de_informacao:", error);
      return ctx.reply("❌ Ocorreu um erro ao processar sua solicitação.");
    }
  });
}

// Helper function to extract protocol and password from text
function extractProtocolAndPassword(text: string): {
  protocol: string;
  password: string;
} {
  const protocolRegex = /protocolo é (\d+)/;
  const passwordRegex = /Senha da solicitação: (\w+)/;

  const protocolMatch = text.match(protocolRegex);
  const passwordMatch = text.match(passwordRegex);

  return {
    protocol: protocolMatch ? protocolMatch[1] : "",
    password: passwordMatch ? passwordMatch[1] : "",
  };
}

export const pedidoDeInformacaoCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
