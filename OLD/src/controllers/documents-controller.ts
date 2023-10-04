/////////////////////////////////////////////////////////////
// ESTE ARQUIVO FAZ A CRIAÇÃO DE DOCUMENTOS NA PASTA DO GT //
/////////////////////////////////////////////////////////////

import { Flow } from "../flow-manager/flow";
import { Variable, VariableValue } from "../flow-manager/variable";
import { Step } from "../flow-manager/step";
import { Markup, CallbackButton, ContextMessageUpdate } from "telegraf";

/////////////////////////
// DEFINIÇÕES INICIAIS //
/////////////////////////

// Importação de arquivos
import constants = require('../aux/constants');
import database = require('../aux/database');
//import utils = require("../aux/utils");
import { FlowCallback } from "../flow-manager/types";

export type Document = {
  doctype: string;
  title: string;
  group: string;
  date: Date;
}

export class DocumentController {

  test?: string

  // constructor() { 
  //   this.test = "";
  // }

  //////////////////////////////
  // SALVA DOCUMENTO NO DRIVE //
  //////////////////////////////

  static saveDocument(document: Document): Promise<any> {

    console.log("\n\nSalvando documento\n");


    const day = document.date.getDate();
    const month = document.date.getMonth() + 1;
    const year = document.date.getFullYear();
   
    let title = document.doctype + " - " + year + "." + month + "." + day + " - " + document.group + " - " + document.title;
  
    console.log(title+ "\n");

    //let folder = getGroupFolder(document.group)
    title = "titulo teste"

    return database.createDocument(title);

  }


  getFlow(): Flow {

    /////////////////////////////////
    // SELECIONA TIPO DE DOCUMENTO //
    /////////////////////////////////

    const doctypeVariable = new Variable("doctype", "📁 Tipo:");
    const doctypeStep = new Step("📁 Qual tipo de documento?", doctypeVariable);

    doctypeStep.answerRegex = /^[selectDocType]+(#[a-z+0-9+A-Z+_+-]+)?$/;
    doctypeStep.loadButtons = async function () {
      const newData: VariableValue[] = []
      const menu: CallbackButton[] = [];

      constants.doctypes.forEach((doctype, index) => {
        newData.push({ text: doctype.name, data: doctype });
        menu.push(Markup.callbackButton(doctype.name, `selectDocType#${index}`))
        //menu.push(Markup.callbackButton(constants.buttonsText.back, FlowCallback.BACK))
      })
      menu.push(Markup.callbackButton("✖️ Cancelar", FlowCallback.CANCEL))
      this.data = newData;
      return Promise.resolve(menu);
    }

    //////////////////////////
    // DÁ NOME AO DOCUMENTO //
    //////////////////////////

    const nameVariable = new Variable("docName", "", "👉 Nome do documento");
    nameVariable.valueValidation = (input) => {
      const isEmpty = input !== undefined && input !== ""
      return { isSuccess: isEmpty, error: isEmpty ? "Nome está vazio, digite um nome para o documento" : "" };
    }

    const nameStep = new Step("👉 Qual é o nome do documento?\n\n💭 Automaticamente o nome já contém data e grupo de trabalho de criação.\n⚠️ Responda essa mensagem.", nameVariable, [], true);
    nameStep.argIndex = -1;

    nameStep.loadButtons = async function () {
      const menu: CallbackButton[] = [];
      menu.push(Markup.callbackButton(constants.buttonsText.back, FlowCallback.BACK))
      menu.push(Markup.callbackButton("✖️ Cancelar", FlowCallback.CANCEL))
      return Promise.resolve(menu);
    }

    //////////////////////////
    // PASSO DE CONFIRMAÇÂO //
    //////////////////////////


    const confirmationStep = new Step("Tudo certo?")
    confirmationStep.loadButtons = async function () {
      const menu = [
        Markup.callbackButton(constants.buttonsText.confirm, FlowCallback.CONFIRM),
        Markup.callbackButton(constants.buttonsText.back, FlowCallback.BACK),
        Markup.callbackButton(constants.buttonsText.cancel, FlowCallback.CANCEL)
      ]

      return Promise.resolve(menu);
    }

    const successVariable = new Variable("documentUrl", "")
  
    const succesStep = new Step("Documento criado. Você pode abrir ele nesse link.", successVariable);
    succesStep.loadButtons = async function () {

      const menu = [Markup.urlButton("📁 Abrir documento", this.getValue())]
      
      return Promise.resolve(menu);
    }

    const steps = [doctypeStep, nameStep, confirmationStep];

    const documentFlow = new Flow("Vamos criar esse documento na pasta deste Grupo de Trabalho?", steps, "📁  Adicionar documento", "/documento");
    //documentFlow.forcedButtons = [Markup.callbackButton(constants.buttonsText.back, "return_step")]
    documentFlow.forceBackButton = true
    documentFlow.cancelStep = new Step("Fluxo cancelado")
    documentFlow.successStep = succesStep
    documentFlow.commandHint = "⚠️ Tente adicionar no seguinte formato: `/documento nome do documento`"

    documentFlow.finish = async function (ctx: ContextMessageUpdate): Promise<boolean> {
      const documentObject = documentFlow.getObject();
      //const group = await utils.getTagFromGroupId(ctx.chat?.id)
      const group = ctx.chat?.id
      documentObject.group = group;
      documentObject.date = new Date();

      try {
        const data = await DocumentController.saveDocument(documentObject as Document);
        this.pretext = "Documento no drive da Ameciclo!"
        successVariable.updateValueText("https://docs.google.com/document/d/" + data.documentId);
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }

    return documentFlow;
  }


}