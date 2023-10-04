import { Flow } from "../flow-manager/flow";
import { Variable /*, VariableValue*/ } from "../flow-manager/variable";
import { Step } from "../flow-manager/step";
import database = require('../aux/database');
//import utils = require('../aux/utils.js'); 
import urls = require('../credentials/urls.json');
import { ContextMessageUpdate } from "telegraf";
// import { FlowCallback } from "../flow-manager/types";
import constants = require('../aux/constants');

export class Controller {

    getFlow(): Flow {

        const stepConfig = {
            stepHint: "Pelo menos 5 palavras. Você pode adicionar também selecionando respondendo à uma mensagem com `/pauta` ou diretamente com `/pauta pauta com pelo menos cinco palavras`",
            stepAtention: constants.defaultMessages.attention,
            question: "📝 Me responda que pauta queres adicionar",
            variable: {
                key: "pauta",
                description: "📝 Pauta: "
            }
        }

        const variable = new Variable(stepConfig.variable.key, stepConfig.variable.description)//, defaultValue = stepConfig.variable.defaultValue),//)

        variable.valueValidation = (input) => {
            const isSmall = input !== undefined && input.split(" ").length < 6
            if (isSmall) {
                return { isSuccess: false, error: "A pauta tem que ter pelo menos 5 palavras" }
            } else {
                return { isSuccess: true, error: "" }
            }
        }

        const step = new Step(stepConfig.question, variable)
        step.stepAtention = stepConfig.stepAtention
        step.argIndex = -1

        // const confirmationVariable = new Variable("Confirmation", "Deu tudo certo.", "finish")
        // const confirmationStep = new Step("Tudo certo?", confirmationVariable)
        // confirmationStep.hide = true

        // CONFIRMAÇÃO

        //   const confirmationStep = new Step("Tudo certo?")
        //   confirmationStep.loadButtons = async function () {
        //     const menu = [
        //    Markup.callbackButton(constants.buttonsText.confirm, FlowCallback.CONFIRM),
        //    Markup.callbackButton(constants.buttonsText.back, FlowCallback.BACK),
        //    Markup.callbackButton(constants.buttonsText.cancel, FlowCallback.CANCEL)
        //     ]

        //     return Promise.resolve(menu);
        //   }

        //   steps.push(confirmationStep)

        // const steps = [step, confirmationStep]


        // const successStepConfig = {
        //     question: `Valeu. Pauta registrada com successo. Veja na planilha.`, 
        //     variable : {
        //             key : "topicUrl",
        //             description : ""
        //         }
        //     }

        // const successVariable = new Variable(successStepConfig.variable.key, "")//, defaultValue = stepConfig.variable.defaultValue),//)
        // const successStep = new Step(successStepConfig.question, successVariable)

        // successStep.loadButtons = async function () {

        //   const menu = [Markup.urlButton("📝 Ver pautas", utils.getSSLink(urls.topics.id))]

        //   return Promise.resolve(menu);
        // }
        

        const steps = [step]

        const flowConfig = {
            //helpText: "Texto para o menu de ajuda"
            commandHint: "Por favor, adicione uma pauta com 5 ou mais palavras.",
            //confirmationStep: "texto de confirmação",
            //successStep: {message: "Texto de successo.", buttonText: ""},
            pretext: "Adicione uma pauta para a Reunião Ordinária da Ameciclo.",
            menuText: "📝 Enviar sugestão de pauta.",
            command: "/pauta"
        }

        const flow = new Flow(flowConfig.pretext, steps, flowConfig.menuText, flowConfig.command)
        flow.setDefaultSuccessStep(`Valeu. Pauta registrada com successo. Veja na planilha.`, "📝 Ver pautas")
        flow.setSuccessUrlValue(urls.topics.url)
        flow.cancelStep = new Step("Fluxo cancelado")
        flow.commandHint = flowConfig.commandHint

        flow.finish = async (ctx: ContextMessageUpdate) => {
            const data = {
                date: new Date(),
                group: ctx.chat?.title,
                author: `${ctx.from?.first_name} ${ctx.from?.last_name}`,
                topic: flow.getObject().pauta
            }

            const success = await database.saveTopic(data)
                .then(res => {
                    console.log("TOPIC-SAVE: success");
                    console.log(res);
                    return true;
                }).catch(err => {
                    console.log("TOPIC-SAVE: error");
                    console.log(err);
                    return false;
                });

            return Promise.resolve(success)
        }

        return flow;
    }
}

// function insertSSCommand(ssId, sheet, row) {
//     // Respostas se tudo foi bem sucedido.
//     // var jwt = spreadsheet.getJwt();
//     googleApi.appendSheetRow(ssId, sheet.toUpperCase + '!A1:B1', row)
//       .then(res => {
//         return ctx.reply(`Sua sugestão de ` + sheet + ` foi adicionada com successo!`, Extra.markup(Markup.inlineKeyboard([seeDocumentButton])));
//       })
//       .catch(error => {
//         return ctx.reply("Houve algum erro e não foi possível salvar sua " + sheet + ", tente /" + sheet + " novamente mais tarde");
//       });
//   }

//   bot.command("clipping", (ctx) => {

//     // Faz o log do comando
//     console.log("Clipping");
//     console.log(JSON.stringify(ctx.update));
//     toSS(ctx, "clipping", 1, "Para registrar o clipping, siga o seguinte modelo:\n\n/clipping url-do-clipping.\n\nCaso queira visualizar a planilha, clique no botão a seguir.");
//   })

//   bot.command("encaminhamento", (ctx) => {

//     // Faz o log do comando
//     console.log("encaminhamento");
//     console.log(JSON.stringify(ctx.update));
//     var MIN_TOPIC_SIZE = 5;
//     toSS(ctx, "encaminhamento", MIN_TOPIC_SIZE, `Para registrar o encaminhamento, siga o seguinte modelo:\n\n/encaminhamento texto do encaminhamento com pelo menos ${MIN_TOPIC_SIZE} palavras.\n\nCaso queira visualizar a planilha, clique no botão a seguir.`);
//   })

//   bot.command("comunicacao", (ctx) => {

//     // Faz o log do comando
//     console.log("comunicacao");
//     console.log(JSON.stringify(ctx.update));
//     var MIN_TOPIC_SIZE = 5;
//     toSS(ctx, "comunicacao", MIN_TOPIC_SIZE, `Para registrar a demanda para comunicação, siga o seguinte modelo:\n\n/comunicacao texto do encaminhamento com pelo menos "${MIN_TOPIC_SIZE}" palavras.\n\nCaso queira visualizar a planilha, clique no botão a seguir.`);
//   })

//   bot.command("informe", (ctx) => {

//     // Faz o log do comando
//     console.log("informe");
//     console.log(JSON.stringify(ctx.update));
//     var MIN_TOPIC_SIZE = 5;
//     toSS(ctx, "informe", MIN_TOPIC_SIZE, `Para registrar o informe, siga o seguinte modelo:\n\n/informe texto do encaminhamento com pelo menos "${MIN_TOPIC_SIZE}" palavras.\n\nCaso queira visualizar a planilha, clique no botão a seguir.`);
//   })



//   bot.command("pauta", (ctx) => {

//     // Faz o log do comando
//     console.log("pauta");
//     console.log(JSON.stringify(ctx.update));
//     var MIN_TOPIC_SIZE = 5;
//     toSS(ctx, "pauta", MIN_TOPIC_SIZE, `Para registrar a pauta, siga o seguinte modelo:\n\n/pauta texto do encaminhamento com pelo menos "${MIN_TOPIC_SIZE}" palavras.\n\nCaso queira visualizar a planilha, clique no botão a seguir.`);
//   })

//   function toSS(ctx, aba, MIN_TOPIC_SIZE, commandOnlyText) {

//     // VARIÁVEIS PARA CAPTAR
//     // Data, Grupo, Autor(a), Tópico

//     // Inicializa as variáveis com o texto e de quem é
//     var topic = "";
//     var from = undefined;
//     var date = undefined
//     var group = "@ameciclobot"
//     var author = undefined;

//     // Verifica se a mensagem é uma resposta à uma mensagem ou uma mensagem nova

//     // Se for uma resposta, pega o texto e a informação de quem mandou o texto
//     if (ctx.update.message.reply_to_message !== undefined) {
//       topic = ctx.update.message.reply_to_message.text;
//       from = ctx.update.message.reply_to_message.from;

//       // se for uma mensagem nova, segue o novo tratamento, atribuindo ao tópico de pauta o texto da mensagem
//       // execptuando o comando e atribuindo à de quem é as informações
//     } else {
//       firebase.addIdToContact(ctx.from); // Guarda interação de usuário no Firebase
//       topic = utils.clearCommandFromUserInput(ctx.update.message.text);
//       from = ctx.update.message.from;
//     }

//     // Se a pessoa só escreveu o comando, mostra a informação de como usar o comando
//     if (topic.length === 0) {
//       var seeDocument = Extra.markup(Markup.inlineKeyboard([seeDocumentButton]));
//       return ctx.reply(commandOnlyText, seeDocument);
//     }

//     // Se a pauta está mal detalhada (menos de MIN_TOPIC_SIZE palavras), envia nova mensagem com o tamanho da pauta.
//     if (topic.split(" ").length < MIN_TOPIC_SIZE) {
//       return ctx.reply(`${from.first_name}, menos de ${MIN_TOPIC_SIZE} palavras? descreve um pouco mais o que você quer e tente novamente`);
//     }

//     // Se a mensagem foi colocada em um grupo, atribuir à mensagem como desse GT
//     if (ctx.update.message.chat.id < 0) {
//       group =  `${ctx.update.message.chat.title}`;
//     }

//     // Junta a informação do dia em que a pauta foi sugerida
//     date = `${new Date(ctx.update.message.date * 1000).toLocaleString()}`;

//     //let message = `${author}:\n${topic}`
//     author = `${from.first_name} ${from.last_name || ""}`

//     // Respostas se tudo foi bem sucedido.
//     // var jwt = spreadsheet.getJwt();
//     googleApi.appendSheetRowAsPromise('15LGWKkfLicuKiJC_aX0pjXOGuwnp0gSkJijwH6moJaI', aba.toUpperCase() +urls.topics.offset, [date, group, author, topic])
//       .then(res => {
//         return ctx.reply(`Valeu, ${from.first_name}! Registrado com successo! Veja na planilha!`, Extra.markup(Markup.inlineKeyboard([seeDocumentButton])));
//       })
//       .catch(error => {
//         return ctx.reply("Houve algum erro e não foi possível salvar, tente novamente mais tarde.");
//       });

//   }