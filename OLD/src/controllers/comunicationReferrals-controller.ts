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
            stepHint: "O formato é /comunicacao DATA-LIMITE DEMANDA, ex: /comunicacao 22/9 FAzer cartaz para Dia Mundial Sem Carro",
            stepAtention: constants.defaultMessages.attention,
            question: "🔊 Me responda que demanda para comunicação queres adicionar",
            variable: {
                key: "comunicationReferrals",
                description: "🔊 Demanda: "
            }
        }

        const variable = new Variable(stepConfig.variable.key, stepConfig.variable.description)//, defaultValue = stepConfig.variable.defaultValue),//)

        variable.valueValidation = (input) => {
            const isSmall = input !== undefined && input.split(" ").length < 6
            if (isSmall) {
                return { isSuccess: false, error: "A demanda precisa ter pelo menos 2 categorias: data e a demanda em si com pelo menos 5 palavras." }
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
            commandHint: "A demanda precisa ser bem específica, quanto mais detalhamento melhor.",
            //confirmationStep: "texto de confirmação",
            //successStep: {message: "Texto de successo.", buttonText: ""},
            pretext: "Adicione uma demanda para a Comunicação da Ameciclo.",
            menuText: "🔊 Enviar demanda para comunicação.",
            command: "/comunicacao"
        }

        const flow = new Flow(flowConfig.pretext, steps, flowConfig.menuText, flowConfig.command)
        flow.setDefaultSuccessStep(`Valeu. Demanda registrada com successo. Veja na planilha.`, "🔊 Ver demandas")
        flow.setSuccessUrlValue(urls.comunicationReferrals.url)
        flow.cancelStep = new Step("Fluxo cancelado")
        flow.commandHint = flowConfig.commandHint

        flow.finish = async (ctx: ContextMessageUpdate) => {
            const data = {
                date: new Date(),
                group: ctx.chat?.title,
                author: `${ctx.from?.first_name} ${ctx.from?.last_name}`,
                comunicationReferrals: flow.getObject().comunicationReferrals
            }

            const success = await database.saveComunicationReferrals(data)
                .then(res => {
                    console.log("COM-REFERRALS-SAVE: success");
                    console.log(res);
                    return true;
                }).catch(err => {
                    console.log("COM-REFERRALS-SAVE: error");
                    console.log(err);
                    return false;
                });

            return Promise.resolve(success)
        }

        return flow;
    }
}