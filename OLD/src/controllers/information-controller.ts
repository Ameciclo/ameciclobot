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
            stepHint: "Pelo menos 5 palavras. Você pode adicionar também selecionando respondendo à uma mensagem com `/informe` ou diretamente com `/informe informe com pelo menos cinco palavras`",
            stepAtention: constants.defaultMessages.attention,
            question: "📢 Me responda que informe queres adicionar",
            variable: {
                key: "information",
                description: "📢 Informe: "
            }
        }

        const variable = new Variable(stepConfig.variable.key, stepConfig.variable.description)//, defaultValue = stepConfig.variable.defaultValue),//)

        variable.valueValidation = (input) => {
            const isSmall = input !== undefined && input.split(" ").length < 6
            if (isSmall) {
                return { isSuccess: false, error: "O informe tem que ter pelo menos 5 palavras" }
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
            commandHint: "Por favor, adicione um informe com 5 ou mais palavras.",
            //confirmationStep: "texto de confirmação",
            //successStep: {message: "Texto de successo.", buttonText: ""},
            pretext: "Adicione um informe para a Reunião Ordinária da Ameciclo.",
            menuText: "📢 Enviar um informe.",
            command: "/informe"
        }

        const flow = new Flow(flowConfig.pretext, steps, flowConfig.menuText, flowConfig.command)
        flow.setDefaultSuccessStep(`Valeu. Informe registrado com successo. Veja na planilha.`, "📢 Ver informes")
        flow.setSuccessUrlValue(urls.topics.url)
        flow.cancelStep = new Step("Fluxo cancelado")
        flow.commandHint = flowConfig.commandHint

        flow.finish = async (ctx: ContextMessageUpdate) => {
            const data = {
                date: new Date(),
                group: ctx.chat?.title,
                author: `${ctx.from?.first_name} ${ctx.from?.last_name}`,
                information: flow.getObject().information
            }

            const success = await database.saveInformation(data)
                .then(res => {
                    console.log("INFORMATION-SAVE: success");
                    console.log(res);
                    return true;
                }).catch(err => {
                    console.log("INFORMATION-SAVE: error");
                    console.log(err);
                    return false;
                });

            return Promise.resolve(success)
        }

        return flow;
    }
}
