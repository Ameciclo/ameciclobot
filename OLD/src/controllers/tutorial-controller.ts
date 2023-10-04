// COMO CONSTRUIR UM COMANDO
// TIPOS DE PASSOS (STEPS)
// - SIMPLES: Aquele que recebe uma resposta e guarda a variável
// - BOTÔES: Aquele que opera por botões fixos
// - BOTÕES PERSONALIZADOS: Aquele que faz uma query e retorna botões
// - COMBO: Aquele que recebe um valor de um passo anterior
// PROPRIEDADES: preenchível por comando, escondível, só para admin, obrigatório, 
// Depois de definidos os passos, adiciona todos ao fluxo

import { Flow } from "../flow-manager/flow";
import { Variable /*, VariableValue*/} from "../flow-manager/variable";
import { Step } from "../flow-manager/step";
//import { CallbackButton, UrlButton, Markup } from "telegraf";
//import firebase = require('../aux/firebase');

export class ModelController {

    getFlow(): Flow {

        const  steps = []

        const  modelStepConfig = {
            //callback: "",
            //buttons: "",
            //required: false,
            //modelStepHint: "",
            //modelStepAtention: "",
            //firebase: {endPoint: "", queryline: "", id: ""},
            question: "Aqui a pergunta longa", 
            variable : {
                //    defaultValue = "",
                //    valueValidation = "",
                    key : "nomeColado",
                    description : "😀 Ícone: "
                }
            }

        //  const  validation = (input) => {
        //     const isEmpty = input !== undefined && input !== ""
        //     return { isSuccess: isEmpty, error: isEmpty ?  modelStepConfig.variable.valueValidation : "" };
        //   }
        const variable = new Variable(modelStepConfig.variable.key, modelStepConfig.variable.description)//, defaultValue = modelStepConfig.variable.defaultValue),//)
  
        const modelStep = new Step(modelStepConfig.question, variable)
        //modelStep.modelStepAtention = modelStepConfig.modelStepAtention
        //modelStep.modelStepHint = modelStepConfig.modelStepHint
        //modelStep.hide = true
        //modelStep.modelStepIncrement = 1
        //modelStep.forceCallbackAnswer = false
        //modelStep.argIndex = 1
        //modelStep.menuOptions = { columns: 2 }
        // ATIVAR MENU POR QUERY - TODO TERMINAR
        // modelStep.answerRegex = new RegExp(`^[select${modelStepConfig.variable.key}]+(#[a-z+0-9+A-Z+_+-]+)?$`)
        // modelStep.loadButtons = async function () {
        //     const menu: (CallbackButton | UrlButton)[] = [];
        //     const newData: VariableValue[] = []
        //     await firebase.getFromDB(modelStepConfig.firebase.endPoint).then((returnedData: any) => {
        //         returnedData.forEach((returnData: any, index: number) => {
        //             const nameQuery = "".toUpperCase() // EX: recipientSearchVariable.value?.text.toUpperCase();
        //         if (!returnData.name?.toUpperCase().includes(nameQuery)) return;
        //             newData.push({ text: returnData(modelStepConfig.firebase.queryline), data: returnData }) 
        //             menu.push(Markup.callbackButton(returnData.name, `select${modelStepConfig.variable.key}#${index}`))
        //         })
        //         return newData;
        //     }).catch((err: any) => {
        //         console.log(`Err ${err}`)
        //     })
        //     this.data = newData;
        //     return Promise.resolve(menu);
        // }
        steps.push(modelStep)


//        const modelSteps = [modelStep]

        const  flowConfig = {
            //helpText: "Texto para o menu de ajuda"
            //commandHint: "dica em caso de erro, para o comando",
            //confirmationStep: "texto de confirmação",
            //successStep: {message: "Texto de successo.", buttonText: ""},
            pretext: "Texto do começo",
            menuText: "😀 Texto no menu",
            command: "/tutorial"
        }

        const flow = new Flow(flowConfig.pretext, steps, flowConfig.menuText, flowConfig.command);
        //flow.forceConfirmButton = true
        //flow.forceBackButton = true
        //flow.forceCancelButton = true
        //flow.onlyForAdmin = true
        //flow.commandHint = flowConfig.commandHint
        //flow.helpText = flowConfig.helpText
        //flow.setSuccessUrlValue("")

        // FINISH OBRIGATÓRIO
        //

        return flow;
    }
}
