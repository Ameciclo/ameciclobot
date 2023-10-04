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
            stepHint: "O formato é /encaminhamento DATA-LIMITE APELIDO ENCAMINAMENTO, ex: /encaminhamento 22/9 @fulane Pegar material para Vaga Viva",
            stepAtention: constants.defaultMessages.attention,
            question: "🗣️ Me responda que encaminhamento queres adicionar",
            variable: {
                key: "referrals",
                description: "🗣️ Encaminhamento: "
            }
        }

        const variable = new Variable(stepConfig.variable.key, stepConfig.variable.description)//, defaultValue = stepConfig.variable.defaultValue),//)

        variable.valueValidation = (input) => {
            const isSmall = input !== undefined && input.split(" ").length < 6
            if (isSmall) {
                return { isSuccess: false, error: "O encaminhamento precisa ter pelo menos 3 categorias: data, @ e o encaminhamento em si com pelo menos 3 palavras." }
            } else {
                return { isSuccess: true, error: "" }
            }
        }

        const step = new Step(stepConfig.question, variable)
        step.stepAtention = stepConfig.stepAtention
        step.argIndex = -1       

        const steps = [step]

        const flowConfig = {
            //helpText: "Texto para o menu de ajuda"
            commandHint: "O encaminhamento precisa ter pelo menos 3 categorias: data, @ e o encaminhamento em si com pelo menos 3 palavras.",
            //confirmationStep: "texto de confirmação",
            //successStep: {message: "Texto de successo.", buttonText: ""},
            pretext: "Adicione um encaminhamento de reunião da Ameciclo.",
            menuText: "🗣️ Registra encaminhamentos para alguém.",
            command: "/encaminhamento"
        }

        const flow = new Flow(flowConfig.pretext, steps, flowConfig.menuText, flowConfig.command)
        flow.setDefaultSuccessStep(`Valeu. Encaminhamento registrado com successo. Veja na planilha.`, "🗣️ Ver encaminhamentos")
        flow.setSuccessUrlValue(urls.referrals.url)
        flow.cancelStep = new Step("Fluxo cancelado")
        flow.commandHint = flowConfig.commandHint

        flow.finish = async (ctx: ContextMessageUpdate) => {
            const data = {
                date: new Date(),
                group: ctx.chat?.title,
                author: `${ctx.from?.first_name} ${ctx.from?.last_name}`,
                referrals: flow.getObject().referrals
            }

            const success = await database.saveReferrals(data)
                .then(res => {
                    console.log("REFERRALS-SAVE: success");
                    console.log(res);
                    return true;
                }).catch(err => {
                    console.log("REFERRALS-SAVE: error");
                    console.log(err);
                    return false;
                });

            return Promise.resolve(success)
        }

        return flow;
    }
}