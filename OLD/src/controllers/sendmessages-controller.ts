


// function sendMessageFlowHandler(ctx, callback = undefined) {
//     if (callback) { 
//       switch (callback) {
//         case utils.getStartActionFor(constants.flow.SEND_MESSAGE):
//           return sendMessagesController.startMessage(ctx);
//         case "confirmMessage":
//           return sendMessagesController.confirmMessageAction(ctx);
//         default:
//           return showCallbackNotRecognizedError(ctx);
//       }
//     }
  
//     if (ctx.session.state === 0) {
//       let message = {}
//       message["from"] = ctx.from;
  
//       var confirmMessage = Markup.callbackButton('Sim', 'confirmMessage');
//       var editMessage = Markup.callbackButton('Editar', utils.getStartActionFor(constants.flow.SEND_MESSAGE));
  
//       let extras = Extra.markup(Markup.inlineKeyboard([confirmMessage, editMessage])).webPreview(false);
  
//       if (ctx.update.message.photo) {
//         console.log("PHOTO");
//         console.log(ctx.update.photo);
//         console.log(ctx.update);
//         message["content"] = sendMessagesController.entitiesToMarkdown(ctx.update.message.caption, ctx.update.message.caption_entities);
//         message["photo"] = ctx.update.message.photo;
//       } else {
//         message["content"] = sendMessagesController.entitiesToMarkdown(ctx.update.message.text, ctx.update.message.entities);
//       }
  
//       ctx.session.message = message;
//       ctx.session.state = 1;
  
//       let text = `Mensagem: \n\n${message.content}\n_\\- por [${message.from.first_name}](tg://user?id=${message.from.username})_ \n\nConfirma o envio?`;
  
//       if (message.photo) {
//         ctx.replyWithPhoto(message.photo[1].file_id);
//       }
  
//       return ctx.replyWithMarkdownV2(text, extras);
//     }
  
//   }



// function showCallbackNotRecognizedError(ctx) {
//     return ctx.reply(constants.errors.notRecognizedCallback);
//   }



// const functions = require('firebase-functions');

// const Extra = require('telegraf/extra');
// const Markup = require('telegraf/markup');
// const session = require('telegraf/session');
// const googleApi = require('../aux/google-api');
// const menu = require('../menu');
// const firebase = require('../aux/firebase');
// const constants = require('../aux/constants');
// const utils = require('../aux/utils');
// const admin = require('firebase-admin');

// // const Telegraf = require('telegraf')
// // const botToken = "938558702:AAEwcq1mt2VYglbBy_7yRfHS3PnkNyLROcQ";
// // const bot = new Telegraf(botToken);
// const bot = require('../credentials/bot-init.js').getBot();

// // const testGroup = -386173744// Grupo de teste
// // const uatGroup = -286943429
// const groupChatId = -246496623 // Grupo do financeiro
// // const groupChatId = uatGroup // Grupo do financeiro

//  function recipientToReadableLine(recipient) {
//     return `Empresa: ${recipient.company} \n ` +
//       `Nome: ${recipient.name} \n ` +
//       `Banco: ${recipient.bank_code} \n ` +
//       `Agência: ${recipient.agency} \n ` +
//       `Conta: ${recipient.account} \n ` +
//       `CPF: ${recipient.id}`
//   }
// const excerptFromRequest = function(request) {
//   return `💰💰💰 PAGAMENTO 💰💰💰\n` +
//     `👉 ${request.from.first_name} solicitou um pagamento.\n\n` +
//     `🗂 Projeto: ${request.project.name}\n` +
//     `📂 Item Orçamentário: ${request.budgetItem}\n` +
//     `🗒 Descrição: ${request.description}\n\n` +
//     `📈 Conta saída: ${request.project.account}\n\n` +
//     `📉 DADOS BANCÁRIOS\n` +
//     `${recipientToReadableLine(request.recipientInformation)}\n\n` +
//     `💵 Valor: ${request.value}`
// }

// function sendPaymentRequestHandler(snapshot, context) {
//   const request = snapshot.val();
//   let messageToGroup = excerptFromRequest(request)

//   bot.context.session = {
//     requestId: context.params.requestId
//   }

//   const requestId = bot.context.session.requestId;
//   const confirmationMenu = menu.getConfirmationExtra(requestId, "Assinaturas 0/2", request.project.id);
//   const sendMessage = bot.telegram.sendMessage(groupChatId, messageToGroup, confirmationMenu);

//   return sendMessage.then((result) => {
//     console.log(`Payment-request sent: ${JSON.stringify(result)}`);

//     var json = {
//       group_message_id: result.message_id
//     };
   
//     admin.database().ref(`requests/${requestId}/`).update(json);

//     return result;
//   }).catch((err) => {
//     console.log("Erro ao enviar mensagem para o grupo");
//     console.log(err);
//     return err;
//   })

// }

// // INICIALIZAR FLUXO DE ENVIAR MENSAGENS PARA GTS
// function startMessage(ctx) {
//   ctx.session.flow = constants.flow.SEND_MESSAGE;
//   ctx.session.state = 0
//   return ctx.reply("Qual mensagem você gostaria de enviar?");
// }

// // send message to gt
// async function confirmMessageAction(ctx) {
//   let message = ctx.session.message;

//   const snapshot = await firebase.saveMessage(message);
//   console.log("CALLBACK");
//   console.log(snapshot);
//   console.log("STRINGFY");
//   console.log(JSON.stringify(snapshot));
//   return ctx.replyWithMarkdown(`Mensagem enviada!\n\n"${message.content} por ${message.from.first_name}"`);
// }

// // function that send the message to gts
// function sendMessageToGtsHandler(snapshot) {
//   let msg = snapshot.val();
//   console.log("MSG>>>" + JSON.stringify(msg));
//   sendMessageToAllGTs(msg);
// }

// function sendMessageToAllGTs(message) {
//   let msg = `${message.content}\n\n_\\- por [${message.from.first_name}](tg://user?id=${message.from.username})_`;
//   let extras = new Extra({ parse_mode: "MarkdownV2" })

//   return firebase.getGTs().then(gts => {
//     gts.forEach(item => {
//       let groupId = item.GTTelegramID;

//       if (groupId !== "preencher") {
//         return false;
//       }

//       if (message.photo) {
//         return bot.telegram.sendPhoto(groupId, message.photo[1].file_id, extras.caption(msg));
//       } else {
//         return bot.telegram.sendMessage(groupId, msg, extras);
//       }

//     });

//     return;
//   });
// }



// // Coloca as entidades em Markdown
// function entitiesToMarkdown(text, entities) {
//   var result = [];
//   var aux = text;
//   var increment = 0;

//   if (entities === undefined) {
//     return text;
//   }

//   entities.forEach(entity => {
//     var modifier = ""

//     if (entity.type === "bold") {
//       modifier = "*"
//     } else if (entity.type === "italic") {
//       modifier = "_"
//     }

//     let processed = `${modifier}${text.substring(entity.offset, entity.offset + entity.length)}${modifier}`;
//     aux = aux.replaceAt(entity.offset + increment, entity.offset + entity.length + increment, processed);
//     increment = increment + 2;
//     // result[0] = `${modifier}${text.substring(entity.offset, entity.offset+entity.length)}${modifier}`;
//   });

//   return aux;
// }

// module.exports = {
//   entitiesToMarkdown: entitiesToMarkdown,
//   startMessage: startMessage,
//   sendMessageToGtsHandler: sendMessageToGtsHandler,
//   sendPaymentRequestHandler:sendPaymentRequestHandler,
//   confirmMessageAction:confirmMessageAction,
//   excerptFromRequest:excerptFromRequest,
//   groupChatId:groupChatId
// }