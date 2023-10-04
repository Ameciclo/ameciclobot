///////////////////////////////////////////////
// @AMECICLOBOT
// Esse é um bot de gerenciamento de atividades administrativas da Ameciclo
// e de integração das pessoas nas atividades e no dia a dia da associação
// 
// Local de funcionamento: Telegram
//
///////////////////////////////////////////////

// IMPORTA ARQUIVOS
console.log("RUN: Iniciando o bot...");

// Telegraf
const session = require('telegraf/session');
//const Telegraf = require('telegraf')
//const Extra = require('telegraf/extra');
//const Markup = require('telegraf/markup');
// , LocalSession = require('telegraf-session-local')

// Firebase
const functions = require('firebase-functions');
const admin = require('firebase-admin');
let serviceAccount = require("./credentials/firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

/////////////////////////////////
// IMPORTACAÇÃO DE CONTROLLERS //
/////////////////////////////////

const manager = require("./flow-manager/flowManager");

const subscriber = require("./controllers/subscriber-controller");
const projects = require("./controllers/projects-controller");
const shortcuts = require("./controllers/shortcuts-controller");
const event = require("./controllers/event-controller");
const payment = require("./controllers/payment-controller");
const topic = require('./controllers/topic-controller');
const referrals = require('./controllers/referrals-controller');
const comunicationReferrals = require('./controllers/comunicationReferrals-controller');
const clipping = require('./controllers/clipping-controller');
const information = require('./controllers/information-controller');
// const sendmessagesController = require('./controllers/sendmessages-controller');
// const documentController = require("./controllers/documents-controller");
// const libraryController = require("./controllers/library-controller");

const controllers = [new subscriber.Controller().getFlow(),
                    new projects.Controller().getFlow(),
                    new shortcuts.Controller().getFlow(),
                    new event.Controller().getFlow(),
                    new payment.Controller().getFlow(),
                    new topic.Controller().getFlow(),
                    new comunicationReferrals.Controller().getFlow(),
                    new clipping.Controller().getFlow(),
                    new information.Controller().getFlow(),
                    // new referrals.Controller().getFlow()
                    // new documentController.DocumentController().getFlow(),
                    // new libraryController.LibraryController().getFlow()
                  ]


const commands = controllers.map(c => ({command: c.command.substring(1), description: c.menuText}))
console.log("RUN: ... controllers inseridos...");

// DESCOMENTAR - COMANDOS OK!
// const telegram = require('./aux/bot-init.js').setCommands(commands)
// console.log("RUN: ... comandos atualizados...");


// Custom
const database = require('./aux/database.js');
const constants = require('./aux/constants.js');
const bot = require('./aux/bot-init.js').getBot();


// TROCAR POR UM FIREBASE REQUEST
//const idsAllowed = await database.getAdminsIds()
//const ids = require('./credentials/admin-ids.js')
//const idsAllowed = ids.getAdminsIds();
// const groupChatId = ids.getPaymentGroupId(); // Grupo do financeiro
//const testGroup = ids.getTestGroupId();// Grupo de teste

//console.log("RUN: Importação de arquivos finalizada com successo!");


// Google
//const googleApi = require('./aux/google-api');

// Criador de fluxos
//const menu = require('./menu.js');

////////////////////////////////
//// FUNÇÕES BÁSICAS DO BOT ////
////////////////////////////////

bot.use(session({
  getSessionKey: (ctx) => {
    if (ctx.from && ctx.chat) {
      return `${ctx.from.id}:${ctx.chat.id}`
    } else if (ctx.from && ctx.inlineQuery) {
      return `${ctx.from.id}:${ctx.from.id}`
    } else {
      return null
    }
  },
  ttl: 600
}));

bot.telegram.getMe().then((bot_informations) => {
  bot.options.username = bot_informations.username;
  console.log("Server has initialized bot: " + bot_informations.username);
  return bot.options.username
}).catch((err) => {
  console.log(`GETME ERROR: ${err}`);
});

bot.catch(function (err) { console.log(`BOTCATCH ERROR | ${err}`); });

/////////////////////////////////
//// COMANDOS DO AMECICLOBOT ////
/////////////////////////////////

// Quando o bot recebe mensagem nos canais
bot.on('channel_post', (ctx) => {
  console.log(`CHANNEL POST | ${ctx.chat}`);
})

//Entrada de novas pessoas em grupos
bot.on('new_chat_members', async (ctx) => {
  let chat = await bot.telegram.getChat(ctx.update.message.chat.id);
  let description = chat.description;
  let title = chat.title;

  let username = ctx.update.message.new_chat_member.username;
  if (username === undefined) {
    username = ctx.update.message.new_chat_member.first_name;
  } else {
    username = "@" + username;
  }

  const groupMember = {
    //id: ctx.update.message.new_chat_member.id,
    first_name: ctx.update.message.new_chat_member.first_name,
    username: ctx.update.message.new_chat_member.username
  }

  if (username === "@undefined") {
    username = first_name
  }
  //database.addGroupMember(chat, groupMember)

  // TODO: registrar pessoas que entram no GT no banco de dados
  // TODO: verificar se ela já está conectada com a Ameciclo e, caso não, chamar
  // pra conversar na xinxa e fazer a validação
  // TODO: remover a pessoa do GT ao saírem: left_chat_member
  return ctx.reply(`Olá ${username}, nossas boas vindas ao "${title}"\n\n${description}`)
})

// Quando o bot recebe qualquer mensagem
bot.on('message', (ctx) => {
  if (!ctx.update.message.text) { // Quando alguém é adicionado ou removido do grupo, text vem vazio
    return;
  }

  // console.log(`onMessage() ${ctx.update.message.text}`);
  ctx.session.flow = ctx.session.flow ? ctx.session.flow : -1;
  console.log(`MESSAGE | SessionFlow: ${ctx.session.flow} | Message: ${ctx.update.message.text}`);

  ctx.session.flowManager = new manager.FlowManager(controllers);

  return ctx.session.flowManager.handle(ctx);

});

// Quando o bot recebe callbacks
bot.on("callback_query", (ctx) => {
  // console.log(`CALLBACK_QUERY: Flow = ${ctx.session.flow}`);
  ctx.session.flow = ctx.session.flow ? ctx.session.flow : -1
  const callback = ctx.update.callback_query.data;
  const isStartingFlow = callback.startsWith(constants.startFlowPrefix);
  ctx.session.flow = isStartingFlow ? parseInt(callback.split("-")[1]) : ctx.session.flow

  console.log(`CALLBACK_QUERY | SessionFlow = ${ctx.session.flow} | Callback = ${callback}`);

  ctx.session.flowManager = new manager.FlowManager(controllers);

  return ctx.session.flowManager.handle(ctx);
});

////////////////
// EXPORTAÇÂO //
////////////////

//console.log("RUN: Exportando bot para firebase");

// INICIALIZAR O BOT
exports.bot = functions.https.onRequest(async (req, res) => {
  try {
    let updates = req.body;

    if (!Array.isArray(updates)) {
      updates = [updates];
      console.log("FIREBASE FUNCTIONS | isArray()");
    }

    console.log(JSON.stringify(updates))
    await bot.handleUpdates(updates, res);

    if (!res.finished) {
      console.log("FIREBASE FUNCTIONS | res Finished()")
      return res.end();
    }
    return Promise.resolve(res);
  } catch (err) {
    console.error('FIREBASE FUNCTIONS | Webhook error', err);
    res.writeHead(500);
    return res.end();
  }

})

console.log("RUN: ... bot iniciado com sucesso!");

  // REMOVIDO DE BOT.ON CALLBACK

// switch (ctx.session.flow) {
  //   case constants.flow.SEND_MESSAGE:
  //     sendMessageFlowHandler(ctx);
  //     break;
  //   default:
  //     if (ctx.session.flowManager === undefined) {
  //       ctx.session.flowManager = new manager.FlowManager(controllers);
  //     }

  //     return ctx.session.flowManager.handle(ctx);
  // }

  // REMOVIDO DE BOT.ON MESSAGE
  // switch (ctx.session.flow) {
//     case constants.flow.SEND_MESSAGE:
//       sendMessageFlowHandler(ctx, callback);
//       break;
//     default:
//       if (ctx.session.flowManager === undefined) {
//         ctx.session.flowManager = new manager.FlowManager(controllers);
//       }

//       return ctx.session.flowManager.handle(ctx);
  // }

// const paymentsController = require('./controllers/payments-controller.js')
// const sendMessagesController = require('./controllers/sendmessages-controller.js')

// exports.paymentRequestConfirmed = functions.database.ref('/requests/{requestId}').onUpdate(paymentsController.requestConfirmedHandler)
export const paymentRequestConfirmed = payment.requestConfirmedHandler
// exports.sendPaymentRequest = functions.database.ref('/requests/{requestId}').onCreate(sendMessagesController.sendPaymentRequestHandler)
// exports.sendMessageToGts = functions.database.ref('/messages/{messageId}').onCreate(sendMessagesController.sendMessageToGtsHandler)

// TODO: JOGAR ESSAS AÇÕES PARA O FLOWMANAGER
bot.action(/^[request]+(#-[a-z+0-9+A-Z+_+-]+)?$/, payment.confirmPaymentRequest);
bot.action(/^[cancel]+(#-[a-z+0-9+A-Z+_+-]+)?$/, payment.cancelPaymentRequest);
