// MENU DO GT
// - Pasta
// - Projetos rolando
// - Coordenadoras(es)
// - Definição
// - Eventos

// COMO CONSTRUIR UM COMANDO
// TIPOS DE PASSOS (STEPS)
// - SIMPLES: Aquele que recebe uma resposta e guarda a variável
// - BOTÔES: Aquele que opera por botões fixos
// - BOTÕES PERSONALIZADOS: Aquele que faz uma query e retorna botões
// - COMBO: Aquele que recebe um valor de um passo anterior
// PROPRIEDADES: preenchível por comando, escondível, só para admin, obrigatório, 
// Depois de definidos os passos, adiciona todos ao fluxo

import { Flow } from "../flow-manager/flow";
import {  VariableValue } from "../flow-manager/variable";
import { Step } from "../flow-manager/step";
import { CallbackButton, UrlButton, Markup } from "telegraf";
import database = require('../aux/database');

export class ModelController {

    getFlow(): Flow {

        const steps = []

        const menuStepConfig = {
            //callback: "",
            //buttons: "",
            //required: false,
            //menuStepHint: "",
            //menuStepAtention: "",
            firebase: {endPoint: "groupsInfos", queryline: "", id: ""},
            question: "Aqui a pergunta longa", 
            variable : {
                //    defaultValue = "",
                //    valueValidation = "",
                    key : "nomeColado",
                    description : "😀 Menu do Grupo de Trabalho: "
                }
            }

        //  let validation = (input) => {
        //     const isEmpty = input !== undefined && input !== ""
        //     return { isSuccess: isEmpty, error: isEmpty ?  menuStepConfig.variable.valueValidation : "" };
        //   }
        //const variable = new Variable(menuStepConfig.variable.key, menuStepConfig.variable.description)//, defaultValue = menuStepConfig.variable.defaultValue),//)
  
        const menuStep = new Step(menuStepConfig.question)
        //menuStep.menuStepAtention = menuStepConfig.menuStepAtention
        //menuStep.menuStepHint = menuStepConfig.menuStepHint
        //menuStep.hide = true
        //menuStep.menuStepIncrement = 1
        //menuStep.forceCallbackAnswer = false
        //menuStep.argIndex = 1
        //menuStep.menuOptions = { columns: 2 }
        // ATIVAR MENU POR QUERY - TODO TERMINAR
        // menuStep.answerRegex = new RegExp(`^[select${menuStepConfig.variable.key}]+(#[a-z+0-9+A-Z+_+-]+)?$`)
        menuStep.loadButtons = async function () {
            const menu: (CallbackButton | UrlButton)[] = [];
            const newData: VariableValue[] = []
            await database.getFromDB(menuStepConfig.firebase.endPoint).then((returnedData: any) => {
                returnedData.forEach((returnData: any, index: number) => {
                    const nameQuery = "".toUpperCase() // EX: recipientSearchVariable.value?.text.toUpperCase();
                if (!returnData.name?.toUpperCase().includes(nameQuery)) return;
                    newData.push({ text: returnData(menuStepConfig.firebase.queryline), data: returnData }) 
                    menu.push(Markup.callbackButton(returnData.name, `select${menuStepConfig.variable.key}#${index}`))
                })
                return newData;
            }).catch((err: any) => {
                console.log(`Err ${err}`)
            })
            this.data = newData;
            return Promise.resolve(menu);
        }


        steps.push(menuStep)


//        const menuSteps = [menuStep]

        const flowConfig = {
            //helpText: "Texto para o menu de ajuda"
            //commandHint: "dica em caso de erro, para o comando",
            //confirmationStep: "texto de confirmação",
            //successStep: {message: "Texto de successo.", buttonText: ""},
            pretext: "Olá, veja as principais informações desse grupo de trabalho.",
            menuText: "😀 Menu do grupo de trabalho",
            command: "/menu"
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
