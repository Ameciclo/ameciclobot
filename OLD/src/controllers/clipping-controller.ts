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
            stepHint: "O formato é /clipping URL-DA-MATÉRIA",
            stepAtention: constants.defaultMessages.attention,
            question: "🖇️ Me responda que clipping queres adicionar",
            variable: {
                key: "clipping",
                description: "🖇️ Clipping: "
            }
        }

        const variable = new Variable(stepConfig.variable.key, stepConfig.variable.description)//, defaultValue = stepConfig.variable.defaultValue),//)

        variable.valueValidation = (input) => {
            const isURL = input !== undefined && !input.toUpperCase().startsWith("HTTP")
            if (isURL) {
                return { isSuccess: false, error: "Uma URL deve começar com HTTP ou HTTPS." }
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
            commandHint: "Por favor, lembre de colocar a URL começando com HTTP ou HTTPS.",
            //confirmationStep: "texto de confirmação",
            //successStep: {message: "Texto de successo.", buttonText: ""},
            pretext: "Adicione um link de matéria que a Ameciclo apareceu.",
            menuText: "🖇️ Enviar matéria da Ameciclo.",
            command: "/clipping"
        }

        const flow = new Flow(flowConfig.pretext, steps, flowConfig.menuText, flowConfig.command)
        flow.setDefaultSuccessStep(`Valeu. Clipping registrado com successo. Veja na planilha.`, "🖇️ Ver clippings")
        flow.setSuccessUrlValue(urls.clipping.url)
        flow.cancelStep = new Step("Fluxo cancelado")
        flow.commandHint = flowConfig.commandHint

        flow.finish = async (ctx: ContextMessageUpdate) => {
            const data = {
                date: new Date(),
                group: ctx.chat?.title,
                author: `${ctx.from?.first_name} ${ctx.from?.last_name}`,
                clipping: flow.getObject().clipping
            }

            const success = await database.saveClipping(data)
                .then(res => {
                    console.log("CLIPPING-SAVE: success");
                    console.log(res);
                    return true;
                }).catch(err => {
                    console.log("CLIPPING-SAVE: error");
                    console.log(err);
                    return false;
                });

            return Promise.resolve(success)
        }

        return flow;
    }
}