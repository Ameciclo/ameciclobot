import { Context, Telegraf } from "telegraf";
import { admin } from "../config/firebaseInit";
import { getUserData, getSubscribers } from "../services/firebase";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  userId: number;
  userName: string;
  registeredBy?: number;
  registeredByName?: string;
  status: string;
}

async function getProducts(): Promise<{ [key: string]: Product }> {
  const snapshot = await admin.database().ref('resources/products').once('value');
  return snapshot.val() || {};
}

async function getSelectedProduct(): Promise<string | null> {
  const snapshot = await admin.database().ref('consumo_config/selected_product').once('value');
  return snapshot.val();
}

async function createSale(sale: Omit<Sale, 'id'>): Promise<string> {
  const newSaleRef = admin.database().ref('resources/sales').push();
  const saleId = newSaleRef.key!;
  
  const saleData = {
    ...sale,
    id: saleId,
    createdAt: new Date().toISOString()
  };
  
  await newSaleRef.set(saleData);
  return saleId;
}

async function updateProductStock(productId: string, quantity: number): Promise<void> {
  const productRef = admin.database().ref(`resources/products/${productId}/stock`);
  const snapshot = await productRef.once('value');
  const currentStock = snapshot.val() || 0;
  await productRef.set(Math.max(0, currentStock - quantity));
}

async function findUserByName(name: string): Promise<{ id: number; name: string } | null> {
  const subscribers = await getSubscribers();
  
  for (const [userId, user] of Object.entries(subscribers)) {
    const userData = user as any;
    if (userData.name && userData.name.toLowerCase().includes(name.toLowerCase())) {
      return { id: parseInt(userId), name: userData.name };
    }
  }
  
  return null;
}

function parseConsumoCommand(text: string): { quantity: number; userName?: string } {
  const parts = text.split(' ').slice(1); // Remove /consumo
  
  if (parts.length === 0) {
    return { quantity: 1 };
  }
  
  // Check if first part is a number
  const firstNumber = parseInt(parts[0]);
  if (!isNaN(firstNumber)) {
    // /consumo 2 or /consumo 2 Name
    return {
      quantity: firstNumber,
      userName: parts.slice(1).join(' ') || undefined
    };
  }
  
  // Check if last part is a number
  const lastNumber = parseInt(parts[parts.length - 1]);
  if (!isNaN(lastNumber)) {
    // /consumo Name 2
    return {
      quantity: lastNumber,
      userName: parts.slice(0, -1).join(' ')
    };
  }
  
  // No number found, assume quantity 1
  return {
    quantity: 1,
    userName: parts.join(' ')
  };
}

function registerConsumoCommand(bot: Telegraf) {
  bot.command("consumo", async (ctx: Context) => {
    try {
      // Check if it's private chat
      if (ctx.chat?.type !== 'private') {
        await ctx.reply("❌ Este comando só pode ser usado no chat privado.");
        return;
      }

      // Check user permissions
      const userData = await getUserData(ctx.from!.id);
      if (!userData || userData.role === 'ANY_USER') {
        await ctx.reply("❌ Você não tem permissão para usar este comando.");
        return;
      }

      const messageText = ctx.message && "text" in ctx.message ? ctx.message.text : "";
      const args = messageText.split(' ').slice(1);

      // Configuration mode
      if (args[0] === 'config') {
        const products = await getProducts();
        const productEntries = Object.entries(products);
        
        if (productEntries.length === 0) {
          await ctx.reply("❌ Nenhum produto encontrado.");
          return;
        }

        const keyboard = [];
        for (let i = 0; i < productEntries.length; i += 2) {
          const row = [];
          row.push({
            text: productEntries[i][1].name,
            callback_data: `select_product:${productEntries[i][0]}`
          });
          
          if (i + 1 < productEntries.length) {
            row.push({
              text: productEntries[i + 1][1].name,
              callback_data: `select_product:${productEntries[i + 1][0]}`
            });
          }
          
          keyboard.push(row);
        }

        await ctx.reply(
          "🛒 Selecione o produto para registrar consumo:",
          { reply_markup: { inline_keyboard: keyboard } }
        );
        return;
      }

      // Check if product is configured
      const selectedProductId = await getSelectedProduct();
      if (!selectedProductId) {
        await ctx.reply("⚙️ Primeiro configure o produto com `/consumo config`", { parse_mode: "Markdown" });
        return;
      }

      // Get product details
      const products = await getProducts();
      const selectedProduct = products[selectedProductId];
      if (!selectedProduct) {
        await ctx.reply("❌ Produto configurado não encontrado. Use `/consumo config` para reconfigurar.", { parse_mode: "Markdown" });
        return;
      }

      // Parse command
      const { quantity, userName } = parseConsumoCommand(messageText);
      
      // Check stock
      if (selectedProduct.stock < quantity) {
        await ctx.reply(`❌ Estoque insuficiente. Disponível: ${selectedProduct.stock}`);
        return;
      }

      let targetUserId = ctx.from!.id;
      let targetUserName = userData.name;
      let registeredBy: number | undefined;
      let registeredByName: string | undefined;

      // If userName is provided, find the user
      if (userName) {
        const foundUser = await findUserByName(userName);
        if (foundUser) {
          targetUserId = foundUser.id;
          targetUserName = foundUser.name;
          registeredBy = ctx.from!.id;
          registeredByName = userData.name;
        } else {
          // User not found in subscribers, use provided name with userId 0
          targetUserId = 0;
          targetUserName = userName;
          registeredBy = ctx.from!.id;
          registeredByName = userData.name;
        }
      }

      // Create sale
      const saleData: Omit<Sale, 'id'> = {
        productId: selectedProductId,
        productName: selectedProduct.name,
        quantity,
        unitPrice: selectedProduct.price,
        totalValue: selectedProduct.price * quantity,
        userId: targetUserId,
        userName: targetUserName,
        status: 'PENDING'
      };

      if (registeredBy) {
        saleData.registeredBy = registeredBy;
        saleData.registeredByName = registeredByName;
      }

      await createSale(saleData);
      await updateProductStock(selectedProductId, quantity);

      // Get updated stock
      const updatedProducts = await getProducts();
      const updatedProduct = updatedProducts[selectedProductId];
      const newStock = updatedProduct?.stock || 0;

      // Format response message
      const isForOther = targetUserId !== ctx.from!.id;
      const registeredByText = isForOther ? ` (registrado por ${registeredByName})` : '';
      
      const message = `✅ **Consumo registrado!**

🛒 **Produto:** ${selectedProduct.name}
💰 **Valor:** R$ ${saleData.totalValue.toFixed(2)}
👤 **Para:** ${targetUserName}${registeredByText}
📦 **Estoque atual:** ${newStock} unidades`;

      await ctx.reply(message, { parse_mode: "Markdown" });

    } catch (error) {
      console.error("[consumo] Erro:", error);
      await ctx.reply("❌ Erro ao processar comando. Tente novamente.");
    }
  });
}

export const consumoCommand = {
  name: () => "/consumo",
  help: () => "Use `/consumo` para registrar consumo do produto configurado\\. Use `/consumo config` para configurar o produto\\.",
  description: () => "🛒 Registrar consumo de produtos.",
  register: registerConsumoCommand,
};