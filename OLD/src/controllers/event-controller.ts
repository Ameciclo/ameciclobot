//////////////////////////////////////////////////////
// ESTE ARQUIVO FAZ A INSERÇÃO DE EVENTOS NA AGENDA //
//////////////////////////////////////////////////////
//
// ORGANIZAÇÃO
// 1. Definições iniciais
// 2. Funções principais
//
// ORDEM DAS FUNÇÕES
// 1. Define os parâmetros do evento
// 2. Botões que surgem e suas funções
// 3. Inseção do evento na agenda
//
///////////////////////////////////////////////////////
import { Flow } from "../flow-manager/flow";
import { Variable, VariableValue } from "../flow-manager/variable";
import { Step } from "../flow-manager/step";
import { Markup, CallbackButton, ContextMessageUpdate } from "telegraf";

/////////////////////////
// DEFINIÇÕES INICIAIS //
/////////////////////////

// Importação de arquivos
import constants = require('../aux/constants');
import google_ids = require('../credentials/google_ids');
import database = require('../aux/database');
import utils = require("../aux/utils");
import { FlowCallback } from "../flow-manager/types";

export type Event = {
  date: string;
  startTime: string;
  duration: any;
  calendar: { id: any; };
  name: any;
  location: any;
  description: any;
  tag: string;
}

export class Controller {

  test?: string

  // constructor() { 
  //   this.test = "";
  // }

  ////////////////////////////
  // SALVA EVENTO NA AGENDA //
  ////////////////////////////

  static saveEvent(event: Event): Promise<any> {
    const dateArray = event.date.split("/");

    const day = dateArray[0];
    const month = dateArray[1];
    const year = new Date().getFullYear();
    const timeArray = event.startTime.split(":");
    const startHour = parseInt(timeArray[0]);
    const startMins = parseInt(timeArray[1]);

    // SUBSTITUIRIA ESSA PARTE DA FUNÇÃO PARA UMA OUTRA getEndTime(startTime, minDuration)

    // let endHour = startHour + utils.minsToIncrement(event.duration).hour;
    // let endMins = startMins + utils.minsToIncrement(event.duration).mins;

    // if (endMins === 60) {
    //   endHour += 1;
    // } else if (endMins >= 60) {
    //   endHour += 1;
    //   endMins = endMins % 60;
    // }

    // let finishesTomorrow = 0
    // let endday = day
    // if (endHour > 23) {
    //   finishesTomorrow = 1
    //   endHour = endHour - 24
    //   endday = day + 1
    // } 

    const startDateTime = (new Date(year, parseInt(month)-1, parseInt(day), startHour, startMins))
    const startTimeISOString = startDateTime.toISOString()
    const endDateTime = utils.addMinutes(startTimeISOString, parseInt(event.duration))
    const endTimeISOString = endDateTime.toISOString()


    const calendarId = event.calendar.id;

    //const locationName = google_ids.locations[event.location].name
    const random = Math.floor(Math.random() * 1000)
    const tag = `a${year}m${month}d${day}h${startHour}m${startMins}r${random}groupid${event.tag}ameciclo`

    return database.createEvent(event.name, startDateTime, endTimeISOString, calendarId, event.location, event.description, tag);
  }

  ////////////////////////
  // FLUXO DOS EVENTOS  //
  ////////////////////////

  // NOME DO EVENTO
  // DATA
  // HORA
  // DURAÇÃO
  // LOCAL
  // AGENDA
  // DESCRIÇÃO


  getFlow(): Flow {
    
      // NOME DO EVENTO

    const nameVariable = new Variable("name", "🅰️ Evento:");
    nameVariable.valueValidation = (input) => {
      const isEmpty = input !== undefined && input !== ""
      return { isSuccess: isEmpty, error: isEmpty ? "Nome está vazio, digite um nome para o evento" : "" };
    }

    const nameStep = new Step("🅰️ Qual é o nome do evento?", nameVariable, [], true);
    nameStep.argIndex = -1;
    nameStep.stepHint = "Pode pegar um atalho dando o comando: `/evento dia hora nome do evento`"
    nameStep.stepAtention = constants.defaultMessages.attention


      // DATA

    const dateVariable = new Variable("date", "🗓 Data:", "");
    dateVariable.valueValidation = (input) => {
      const timeRegex = /^(([1-2][0-9])|([1-9])|(3[0-1]))\/((1[0-2])|([1-9]))\/[0-9]{4}$/;
      const isSuccess = timeRegex.test(input);
      return { isSuccess: isSuccess, error: !isSuccess ? "❗️ Data no formato inválido. Ex: 17/8/2021 ou 17/8" : "" };
    }

    const dateStep = new Step("🗓 Quando é o evento?", dateVariable);
    dateStep.argIndex = 0;
    dateStep.stepHint = "Ex: 17/8/21 ou 10/5."
    dateStep.stepAtention = constants.defaultMessages.attention


      // HORA

    const startTimeVariable = new Variable("startTime", "⏰ Hora:");
    startTimeVariable.valueValidation = function (input: string) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      const isSuccess = timeRegex.test(input);
      return { isSuccess: isSuccess }
    }
    const startTimeStep = new Step("⏰ Que horas começa o evento?", startTimeVariable);
    startTimeStep.argIndex = 1;
    startTimeStep.stepHint = "Ex: 13h ou 16h20"
    startTimeStep.stepAtention = constants.defaultMessages.attention

    // o usuário responde por texto e aí a entrada é o input função trata o erro
    startTimeStep.answer = async function (input: string) {
      let newInput = input.replace("h", ":");
      if (!newInput.includes(":")) {
        newInput.concat(":")
      }

      switch (newInput.length) {
        case 2:
          newInput = `0${newInput}00`
          break;
        case 3:
          newInput = `${newInput}00`
          break;
        case 4:
          newInput = `0${newInput}`
          break;
      }

      if (this.variable.valueValidation(newInput).isSuccess) {
        this.variable.updateValueText(newInput);
        return { isSuccess: true }
      }

      return { isSuccess: false, error: "❗️ Horário no formato inválido: Ex: 8h, 13h, 2h43 ou 12h43." };
    }


      // DURAÇÃO

    const variable4 = new Variable("duration", "⏰ Duração:", "60");
    const durationStep = new Step(`Adicione ou remova horas ao evento.`, variable4, [], true, "duration");

    durationStep.stepHint = `Estimamos o evento em ${utils.minsToHour(parseInt(durationStep.getValue()))}.`

    durationStep.answerRegex = /^[durationIncrement]+(#[a-z+0-9+A-Z+_+-]+)?$/
    durationStep.hide = true;


      // LOCAL

    const locationVariable = new Variable("location", "📍Local:");
    const locationStep = new Step("📍 Qual o local do evento?", locationVariable);
    const customLocationStep = new Step("📍 Qual o local do evento?", locationVariable);
    customLocationStep.hide = true;

    locationStep.answerRegex = /^[selectLocation]+(#[a-z+0-9+A-Z+_+-]+)?$/;
    locationStep.loadButtons = async function () {
      const answerCallback = "selectLocation"
      
      const menu: CallbackButton[] = [];

      //const newData: VariableValue[] = []

      google_ids.locations.forEach((location, index) => {
        //newData.push({ text: location.name, data: location });
        menu.push(Markup.callbackButton(location.name, `${answerCallback}#${index}`))
      })
      menu.push(Markup.callbackButton("Outro", "next_step"))
     
      //this.data = newData;

      return menu;
    }


      // AGENDA

    const calendarVariable = new Variable("calendar", "📫 Tipo:");
    const calendarStep = new Step("📫 Em qual agenda que desejas adicionar?", calendarVariable);

    calendarStep.answerRegex = /^[selectCalendar]+(#[a-z+0-9+A-Z+_+-]+)?$/;
    calendarStep.loadButtons = async function () {
      const newData: VariableValue[] = []
      const menu: CallbackButton[] = [];

      google_ids.calendars.forEach((calendar, index) => {
        newData.push({ text: calendar.name, data: calendar });
        menu.push(Markup.callbackButton(calendar.name, `selectCalendar#${index}`))
      })

      this.data = newData;
      return Promise.resolve(menu);
    }


      // DESCRIÇÃO

    const descriptionVariable = new Variable("description", "🖌 Descrição:");
    const descriptionStep = new Step("🖌 Insira uma descrição.", descriptionVariable);
    descriptionStep.required = false;

    descriptionStep.stepHint = "É bom, mas opcional."
    descriptionStep.stepAtention = constants.defaultMessages.attention
    
    descriptionStep.answer = async function (input: string) {
      if (this.variable.value) {
        this.variable.value.text += `\n${input}`;
      } else {
        this.variable.updateValueText(input);
      }

      return { isSuccess: true };
    }


      // LOCAL - FINALIZANDO


    locationStep.answerWithCallback = function (input: string) {
      const locationId = input.split('#')[1].replace("+", " ");
      const location = google_ids.locations[parseInt(locationId)].name

      if (location !== "other") {
        this.variable.updateValueText(location);

        //if (location === "Virtual") {
        //  descriptionVariable.updateValueText(constants.hangoutUrl);
        //}

        this.stepIncrement = 1;
      }

      return true;
    }

      // HORA - FINALIZANDO


    startTimeStep.getValue = function () {
      const startTime = this.variable.value ? this.variable.value.text : "";
      const startDate = utils.initDateFrom(startTime, dateVariable.getValue());
      const durationValue = durationStep.getValue();
      const endDate = utils.getEndTime(startDate, durationValue);
      const endTime = endDate.toJSON() ? `${endDate.toISOString().substr(11,5)}` : ""

      return `${startTime} - ${endTime} (${utils.minsToHour(durationValue)})`
    }

      // DURAÇÃO - FINALIZANDO


    durationStep.loadButtons = async function () {
      const answerCallback = "durationIncrement"

      const menu = [
        Markup.callbackButton("-30", `${answerCallback}#-30`),
        Markup.callbackButton("+30", `${answerCallback}#30`),
        Markup.callbackButton("+1h", `${answerCallback}#60`),
        Markup.callbackButton("+2h", `${answerCallback}#120`),
        Markup.callbackButton(constants.buttonsText.confirm,  "next_step")
      ]

      return Promise.resolve(menu);
    }

    durationStep.menuOptions = { columns: 4 }

    // quando você clica no botão
    durationStep.answerWithCallback = function (input: string) {
      const selectedOption = input.split("#")[1];

      if (selectedOption === "next_step") {
        return true;
      }

      const minsToBeAdded = parseInt(selectedOption);
      const actualMins = parseInt(this.getValue());
      const result = actualMins + minsToBeAdded;

      this.variable.updateValueText(result.toString());

      return false;
    }


      // CONFIRMAÇÃO

    const confirmationStep = new Step("Tudo certo?")
    confirmationStep.loadButtons = async function () {
      const menu = [
        Markup.callbackButton(constants.buttonsText.confirm, FlowCallback.CONFIRM),
        Markup.callbackButton(constants.buttonsText.back, FlowCallback.BACK),
        Markup.callbackButton(constants.buttonsText.cancel, FlowCallback.CANCEL)
      ]

      return Promise.resolve(menu);
    }

    const successVariable = new Variable("eventUrl", "")
    //const hangoutVariable = new Variable("hangoutUrl", "");
    
    const succesStep = new Step("Para modificar os eventos, como adicionar a descrição, clique em Abrir evento", successVariable);
    succesStep.loadButtons = async function () {

      //BOTAO "EU VOU" VAI AQUI
      const menu = [Markup.urlButton("🗓 Abrir evento", this.getValue())]

      //if (hangoutVariable.getValue() !== undefined && hangoutVariable.getValue() !== "") {
      //  menu.push(Markup.urlButton("Google Meet", hangoutVariable.getValue()))
      //}
      
      return Promise.resolve(menu);
    }

    const steps = [nameStep, dateStep, startTimeStep, durationStep, locationStep, customLocationStep, calendarStep, descriptionStep, confirmationStep];

    const eventFlow = new Flow("Desejas adicionar um evento na nossa agenda?\nAtenção em que passo está para responder.", steps, "🗓 Adicionar evento", "/evento");
    //eventFlow.forcedButtons = [Markup.callbackButton(constants.buttonsText.back, "return_step")]
    eventFlow.forceBackButton = true
    eventFlow.cancelStep = new Step("Fluxo cancelado")
    eventFlow.successStep = succesStep
    eventFlow.commandHint = "⚠️ Atente-se a ordem dos parâmetros, o correto é `/evento dia hora nome do evento`, por exemplo:\n\n/evento 1/5 16h20 Aniversário da Ameciclo"

    eventFlow.finish = async function (ctx: ContextMessageUpdate): Promise<boolean> {
      const eventObject = eventFlow.getObject()
      //const emailTag = await utils.getTagFromGroupId(ctx.chat?.id)
      //eventObject.tag = emailTag;
      
      const tag = ctx.chat?.id
      eventObject.tag = tag

      try {
        const data = await Controller.saveEvent(eventObject as Event);
        this.pretext = "Evento adicionado na agenda!"
        successVariable.updateValueText(data.htmlLink);
        //hangoutVariable.updateValueText(data.hangoutLink);
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }

    return eventFlow;
  }


}