import { Context, Telegraf } from "telegraf";
import { saveProtocolRecord } from "../services/firebase";
import { checkPedidosInformacao } from "../scheduler/checkPedidosInformacao";

// Controle de execução simultânea
let verificacaoEmAndamento = false;

// Helper functions for command metadata
export function getName() {
  return "/pedido_de_informacao";
}

export function getHelp() {
  return "Use o comando `/pedido\\_de\\_informacao` seguido do protocolo e senha, ou responda a uma mensagem contendo esses dados\\.\nFormato:\n`/pedido_de_informacao \\[protocolo\\] \\[senha\\]`\nOu responda a uma mensagem com o texto padrão de solicitação\\.\n\n🔍 **Verificação:**\n`/pedido_de_informacao verificar` - Verifica todos os pedidos\n`/pedido_de_informacao verificar \\[protocolo\\]` - Verifica protocolo específico";
}

export function getDescription() {
  return "🔐 Registrar protocolo e senha de solicitação de informação";
}

// Main command handler
export function register(bot: Telegraf) {
  bot.command("pedido_de_informacao", async (ctx: Context) => {
    try {
      console.log("[pedido_de_informacao] Comando /pedido_de_informacao executado");
      console.log("[pedido_de_informacao] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
      
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

        // Check if user wants to verify
        if (args[0] === "verificar") {
          if (args[1]) {
            // Verificar protocolo específico
            await ctx.reply(`🔍 Verificando protocolo ${args[1]}...`);
            try {
              const { verificarProtocoloEspecifico } = require("../scheduler/checkPedidosInformacao");
              const resultado = await verificarProtocoloEspecifico(args[1], bot);
              if (resultado.error) {
                return ctx.reply(`❌ Erro: ${resultado.error}`);
              }
              
              let message = `✅ Protocolo ${args[1]} verificado e atualizado!`;
              
              if (resultado.ultimaAtualizacao) {
                message += `\n\n📅 **Última atualização:** ${resultado.ultimaAtualizacao.situacao}\n`;
                message += `📆 **Data:** ${resultado.ultimaAtualizacao.data}\n`;
                if (resultado.ultimaAtualizacao.resposta) {
                  const resposta = resultado.ultimaAtualizacao.resposta.substring(0, 200);
                  message += `💬 **Resposta:** ${resposta}${resultado.ultimaAtualizacao.resposta.length > 200 ? '...' : ''}`;
                }
              }
              
              return ctx.reply(message);
            } catch (error) {
              console.error("Erro ao verificar protocolo:", error);
              return ctx.reply("❌ Erro ao verificar protocolo.");
            }
          } else {
            // Verificar todos
            if (verificacaoEmAndamento) {
              return ctx.reply("⏳ Já existe uma verificação em andamento. Aguarde...");
            }
            
            verificacaoEmAndamento = true;
            await ctx.reply("🔍 Verificando todos os pedidos...");
            
            try {
              await checkPedidosInformacao(bot);
              return ctx.reply("✅ Verificação concluída!");
            } catch (error) {
              console.error("Erro ao verificar pedidos:", error);
              return ctx.reply("❌ Erro ao verificar pedidos de informação.");
            } finally {
              verificacaoEmAndamento = false;
            }
          }
        }

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
        console.log(`[pedido_de_informacao] Protocolo registrado com sucesso: ${protocol}`);
        return ctx.reply(
          `✅ Registrado com sucesso!\nProtocolo: ${protocol}\nSenha: ${password}`
        );
      } else {
        return ctx.reply(
          "✅ Dados registrados localmente, mas houve um erro no armazenamento em nuvem."
        );
      }
    } catch (error) {
      console.error("[pedido_de_informacao] Erro no comando /pedido_de_informacao:", error);
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
