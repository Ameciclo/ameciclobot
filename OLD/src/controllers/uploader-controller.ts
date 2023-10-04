// faz upload de arquivos para a pasta do GT

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

        const  titleStepConfig = {
            //callback: "",
            //buttons: "",
            //required: false,
            //titleStepHint: "",
            //titleStepAtention: "",
            //firebase: {endPoint: "", queryline: "", id: ""},
            question: "Deseja subir um arquivo pra pasta desse Grupo de Trabalho? Me diz então o melhor título descritivo pra esse arquivo.", 
            variable : {
                //    defaultValue = "",
                //    valueValidation = "",
                    key : "fileTitle",
                    description : "😀 Título do arquivo: "
                }
            }

        //  const  validation = (input) => {
        //     const isEmpty = input !== undefined && input !== ""
        //     return { isSuccess: isEmpty, error: isEmpty ?  titleStepConfig.variable.valueValidation : "" };
        //   }
        const titleVariable = new Variable(titleStepConfig.variable.key, titleStepConfig.variable.description)//, defaultValue = titleStepConfig.variable.defaultValue),//)
  
        const titleStep = new Step(titleStepConfig.question, titleVariable)
        //titleStep.titleStepAtention = titleStepConfig.titleStepAtention
        //titleStep.titleStepHint = titleStepConfig.titleStepHint
        //titleStep.hide = true
        //titleStep.titleStepIncrement = 1
        //titleStep.forceCallbackAnswer = false
        //titleStep.argIndex = 1
        //titleStep.menuOptions = { columns: 2 }
        // ATIVAR MENU POR QUERY - TODO TERMINAR
        // titleStep.answerRegex = new RegExp(`^[select${titleStepConfig.variable.key}]+(#[a-z+0-9+A-Z+_+-]+)?$`)
        // titleStep.loadButtons = async function () {
        //     const menu: (CallbackButton | UrlButton)[] = [];
        //     const newData: VariableValue[] = []
        //     await firebase.getFromDB(titleStepConfig.firebase.endPoint).then((returnedData: any) => {
        //         returnedData.forEach((returnData: any, index: number) => {
        //             const nameQuery = "".toUpperCase() // EX: recipientSearchVariable.value?.text.toUpperCase();
        //         if (!returnData.name?.toUpperCase().includes(nameQuery)) return;
        //             newData.push({ text: returnData(titleStepConfig.firebase.queryline), data: returnData }) 
        //             menu.push(Markup.callbackButton(returnData.name, `select${titleStepConfig.variable.key}#${index}`))
        //         })
        //         return newData;
        //     }).catch((err: any) => {
        //         console.log(`Err ${err}`)
        //     })
        //     this.data = newData;
        //     return Promise.resolve(menu);
        // }
        steps.push(titleStep)

        const  yearStepConfig = {
            //callback: "",
            //buttons: "",
            //required: false,
            //stepHint: "",
            //stepAtention: "",
            //firebase: {endPoint: "", queryline: "", id: ""},
            question: "Qual o ano de referência desse arquivo?", 
            variable : {
                //    defaultValue = "",
                //    valueValidation = "",
                    key : "year",
                    description : "😀 Título do arquivo: "
                }
            }

        //  const  validation = (input) => {
        //     const isEmpty = input !== undefined && input !== ""
        //     return { isSuccess: isEmpty, error: isEmpty ?  stepConfig.variable.valueValidation : "" };
        //   }
        const yearVariable = new Variable(yearStepConfig.variable.key, yearStepConfig.variable.description)//, defaultValue = stepConfig.variable.defaultValue),//)
  
        const yearStep = new Step(yearStepConfig.question, yearVariable)
        //step.stepAtention = stepConfig.stepAtention
        //step.stepHint = stepConfig.stepHint
        //step.hide = true
        //step.stepIncrement = 1
        //step.forceCallbackAnswer = false
        //step.argIndex = 1
        //step.menuOptions = { columns: 2 }
        // ATIVAR MENU POR QUERY - TODO TERMINAR
        // step.answerRegex = new RegExp(`^[select${stepConfig.variable.key}]+(#[a-z+0-9+A-Z+_+-]+)?$`)
        // step.loadButtons = async function () {
        //     const menu: (CallbackButton | UrlButton)[] = [];
        //     const newData: VariableValue[] = []
        //     await firebase.getFromDB(stepConfig.firebase.endPoint).then((returnedData: any) => {
        //         returnedData.forEach((returnData: any, index: number) => {
        //             const nameQuery = "".toUpperCase() // EX: recipientSearchVariable.value?.text.toUpperCase();
        //         if (!returnData.name?.toUpperCase().includes(nameQuery)) return;
        //             newData.push({ text: returnData(stepConfig.firebase.queryline), data: returnData }) 
        //             menu.push(Markup.callbackButton(returnData.name, `select${stepConfig.variable.key}#${index}`))
        //         })
        //         return newData;
        //     }).catch((err: any) => {
        //         console.log(`Err ${err}`)
        //     })
        //     this.data = newData;
        //     return Promise.resolve(menu);
        // }
        steps.push(yearStep)


        const  fileStepConfig = {
            //callback: "",
            //buttons: "",
            //required: false,
            //stepHint: "",
            //stepAtention: "",
            //firebase: {endPoint: "", queryline: "", id: ""},
            question: "Qual o arquivo que queres subir?", 
            variable : {
                //    defaultValue = "",
                //    valueValidation = "",
                    key : "file",
                    description : "😀 Arquivo à subir: "
                }
            }

        //  const  validation = (input) => {
        //     const isEmpty = input !== undefined && input !== ""
        //     return { isSuccess: isEmpty, error: isEmpty ?  stepConfig.variable.valueValidation : "" };
        //   }
        const fileVariable = new Variable(fileStepConfig.variable.key, fileStepConfig.variable.description)//, defaultValue = stepConfig.variable.defaultValue),//)
  
        const fileStep = new Step(fileStepConfig.question, fileVariable)
        //step.stepAtention = stepConfig.stepAtention
        //step.stepHint = stepConfig.stepHint
        //step.hide = true
        //step.stepIncrement = 1
        //step.forceCallbackAnswer = false
        //step.argIndex = 1
        //step.menuOptions = { columns: 2 }
        // ATIVAR MENU POR QUERY - TODO TERMINAR
        // step.answerRegex = new RegExp(`^[select${stepConfig.variable.key}]+(#[a-z+0-9+A-Z+_+-]+)?$`)
        // step.loadButtons = async function () {
        //     const menu: (CallbackButton | UrlButton)[] = [];
        //     const newData: VariableValue[] = []
        //     await firebase.getFromDB(stepConfig.firebase.endPoint).then((returnedData: any) => {
        //         returnedData.forEach((returnData: any, index: number) => {
        //             const nameQuery = "".toUpperCase() // EX: recipientSearchVariable.value?.text.toUpperCase();
        //         if (!returnData.name?.toUpperCase().includes(nameQuery)) return;
        //             newData.push({ text: returnData(stepConfig.firebase.queryline), data: returnData }) 
        //             menu.push(Markup.callbackButton(returnData.name, `select${stepConfig.variable.key}#${index}`))
        //         })
        //         return newData;
        //     }).catch((err: any) => {
        //         console.log(`Err ${err}`)
        //     })
        //     this.data = newData;
        //     return Promise.resolve(menu);
        // }
        steps.push(fileStep)

        const  flowConfig = {
            //helpText: "Texto para o menu de ajuda"
            //commandHint: "dica em caso de erro, para o comando",
            //confirmationStep: "texto de confirmação",
            //successStep: {message: "Texto de successo.", buttonText: ""},
            pretext: "Oi, vamos subir esse arquivo para a pasta geral do Grupo de Trabalho?",
            menuText: "😀 Upload de arquivo",
            command: "/upload"
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
