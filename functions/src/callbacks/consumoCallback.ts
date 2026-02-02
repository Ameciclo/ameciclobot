import { Context, Telegraf } from "telegraf";
import { admin } from "../config/firebaseInit";

async function setSelectedProduct(productId: string): Promise<void> {
  await admin.database().ref('consumo_config/selected_product').set(productId);
}

async function getProduct(productId: string): Promise<any> {
  const snapshot = await admin.database().ref(`resources/products/${productId}`).once('value');
  return snapshot.val();
}

export function registerConsumoCallback(bot: Telegraf) {
  bot.action(/^select_product:(.+)$/, async (ctx: Context) => {
    try {
      const productId = (ctx as any).match![1];
      
      // Get product details
      const product = await getProduct(productId);
      if (!product) {
        await ctx.answerCbQuery("❌ Produto não encontrado");
        return;
      }

      // Set selected product
      await setSelectedProduct(productId);

      // Update message
      await ctx.editMessageText(
        `✅ **Produto configurado com sucesso!**

🛒 **Produto:** ${product.name}
💰 **Preço:** R$ ${product.price.toFixed(2)}
📦 **Estoque:** ${product.stock} unidades

Agora você pode usar \`/consumo\` para registrar consumo deste produto.`,
        { parse_mode: "Markdown" }
      );

      await ctx.answerCbQuery("Produto configurado!");

    } catch (error) {
      console.error("[consumo-callback] Erro:", error);
      await ctx.answerCbQuery("❌ Erro ao configurar produto");
    }
  });
}