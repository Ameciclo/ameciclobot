// /// REGISTRO PEDIDOS DE INFORMAÇÃO

// function informationRequestFlowHandler(ctx, callback = undefined) {
//     var messageReceived = ctx.update.message.text;
//     var protocolArray = messageReceived.split(".")[0].split(" ")
//     let protocol = protocolArray[protocolArray.length - 1]
//     var passwordArray = messageReceived.split(".")[1].split(" ")
//     let password = passwordArray[passwordArray.length - 1]
  
//     firebase.savePinfRequest(ctx.from, protocol, password);
//     return ctx.reply(`Pedido de informação salvo com successo. Obrigado, ${ctx.from.first_name}`);
//   }
  
//   function defaultFlowHandler(ctx) {
//     var messageReceived = ctx.update.message.text;
//     if (messageReceived !== undefined && messageReceived.startsWith("Seu número")) { // pedido de informação
//       informationRequestFlowHandler();
//     } else {
//       return ctx.reply(`Oi, ${ctx.from.first_name}, não entendi sua mensagem. Favor, tente /ajuda para melhorar sua interação.`);
//     }
  
//   }