///////////////////////////
// COMANDO DA BIBLIOTECA //
///////////////////////////

///////////////////////////////////////////////////////
import { Flow } from "../flow-manager/flow";
import { Variable, VariableValue } from "../flow-manager/variable";
import { Step } from "../flow-manager/step";
import { CallbackButton, Markup, UrlButton } from "telegraf";
import constants = require('../aux/constants');

/////////////////////////
// DEFINIÇÕES INICIAIS //
/////////////////////////

// Importação de arquivos
import database = require('../aux/database');
//import { FlowCallback } from "../flow-manager/types";
//import { FlowCallback } from "../flow-manager/types";

function isDisponible (book: any) {
  if (book.return_date !== "" || book.return_date !== undefined) {
    console.log("Livro disponível")
    return true
  }
  console.log("Livro Indisponível")
  return false
}


export class LibraryController {

  getFlow(): Flow {

    // BUSCA DE LIVRO

    const bookSearchStepConfig = {
      stepHint: "Pesquise por uma palavra que esteja no código, título ou nome da(o) autor(a) e buscarei no banco de dados.",
      stepAtention: constants.defaultMessages.attention,
      question: "Qual o livro que procuras?", 
      variable : {
          //    defaultValue = "",
          //    valueValidation = "",
              key : "bookSearch",
              description : ""
          }
      }
  
    const bookSearchVariable = new Variable(bookSearchStepConfig.variable.key, bookSearchStepConfig.variable.description)//, defaultValue = bookSearchStepConfig.variable.defaultValue),//)
    bookSearchVariable.valueValidation = (input) => {
      const isEmpty = input !== undefined && input !== "" && input.length >= 3
      return { isSuccess: isEmpty, error: isEmpty ? "Se desejar uma busca mais rápida, coloque um nome que esteja no título, autor(a) ou código do livro.\n💭Pelo menos 3 letras.\n💭Ex: /biblioteca Ned" : "" };
    } 
    const bookSearchStep = new Step(bookSearchStepConfig.question, bookSearchVariable)
    bookSearchStep.hide = true
    bookSearchStep.argIndex = -1
    bookSearchStep.stepAtention = bookSearchStepConfig.stepAtention
    bookSearchStep.stepHint = bookSearchStepConfig.stepHint

    // SELEÇÃO DE LIVRO

     const bookInfoStepConfig = {
        //callback: "",
        //buttons: "",
        //required: false,
        firebase: {endPoint: "library", queryline: "queryline", id: ""},
        stepHint: "Cancele e recomece caso não tenha encontrado.",
        stepAtention: "Legenda:\n   ✅ - Disponível\n   ⚠️ - Indisponível (pode reservar)",
        question: "É algum desses livros?", 
        variable : {
          //    defaultValue = "",
          //    valueValidation = "",
              key : "bookInformation",
              description : "📕 Livro: "
          }
        }

    
    const bookInfoVariable = new Variable(bookInfoStepConfig.variable.key, bookInfoStepConfig.variable.description)//, defaultValue = bookInfoStepConfig.variable.defaultValue),//)
    const bookInfoStep = new Step(bookInfoStepConfig.question, bookInfoVariable)
    bookInfoStep.stepAtention = bookInfoStepConfig.stepAtention
    bookInfoStep.stepHint = bookInfoStepConfig.stepHint
    bookInfoStep.answerRegex = new RegExp(`^[select${bookInfoStepConfig.variable.key}]+(#[a-z+0-9+A-Z+_+-]+)?$`)

    bookInfoStep.loadButtons = async function () {
      const menu: (CallbackButton | UrlButton)[] = [];
      const newData: VariableValue[] = []

      let filter = `${bookInfoStepConfig.firebase.endPoint}`
      if (bookInfoStepConfig.firebase.id !== ""){
        filter = `${bookInfoStepConfig.firebase.endPoint}/${bookInfoStepConfig.firebase.id}`
      }


      await database.getFromDB(filter).then((db: any) => {
          let index = -1;
          let bookRecord: any

          db.forEach((data: any/*, index: number*/) => {
              const nameQuery = bookSearchVariable.value?.text.toUpperCase();
              if (!data[bookInfoStepConfig.firebase.queryline]?.toUpperCase().includes(nameQuery)) return;
              
              index += 1;

              bookRecord = database.getLastItemFromDB(`loan_records/books/${data.id}`)

              let disponible = "⚠️";
              if (isDisponible(bookRecord)) {
                disponible = "✅";
              }
              
              const buttonText = `${data.register} | ${data.title} - ${data.author}` 
              newData.push({ text:buttonText, data: data.id })
              menu.push(Markup.callbackButton(`${disponible} ${buttonText}`, `select${bookInfoStepConfig.variable.key}#${index}`))
          })

          return newData;
      }).catch(err => {
          console.log(`Err ${err}`)
      })

      this.data = newData;
      return Promise.resolve(menu);
    }

    // bookInfoStep.loadButtons = async function () {
    //   const menu: (CallbackButton | UrlButton)[] = [];
    //   const newData: VariableValue[] = []

    //   let filter = `${bookInfoStepConfig.firebase.endPoint}`
    //   if (bookInfoStepConfig.firebase.id !== ""){
    //     filter = `${bookInfoStepConfig.firebase.endPoint}/${bookInfoStepConfig.firebase.id}`
    //   }

    //   await firebase.getFromDB(filter).then((database: any) => {
    //       let index = -1;

    //       database.forEach((data: any/*, index: number*/) => {
    //           const nameQuery = bookSearchVariable.value?.text.toUpperCase();
    //           if (!data[bookInfoStepConfig.firebase.queryline]?.toUpperCase().includes(nameQuery)) return;

    //           index += 1;
    //           let disponible = "⚠️";
    //           if (isDisponible(data)) {
    //             disponible = "✅";
    //           }
    //           const buttonText = `${data.register} | ${data.title} - ${data.author}` 
    //           newData.push({ text:buttonText, data: data })
    //           menu.push(Markup.callbackButton(`${disponible} ${buttonText}`, `select${bookInfoStepConfig.variable.key}#${index}`))
    //       })

    //       return newData;
    //   }).catch(err => {
    //       console.log(`Err ${err}`)
    //   })

    //   this.data = newData;
    //   return Promise.resolve(menu);
    // }

    // BUSCA DE LOCATÁRIOS

    const rentalSearchStepConfig = {
      stepHint: "",
      stepAtention: constants.defaultMessages.attention,
      firebase: {endPoint: "", queryline: "", id: ""},
      question: "Qual o CPF da pessoa interessada?", 
      variable : {
          //    defaultValue = "",
          //    valueValidation = "",
              key : "rentalSearch",
              description : ""
          }
      }

    const rentalSearchVariable = new Variable(rentalSearchStepConfig.variable.key, rentalSearchStepConfig.variable.description)//, defaultValue = rentalSearchStepConfig.variable.defaultValue),//)
    const rentalSearchStep = new Step(rentalSearchStepConfig.question, rentalSearchVariable)
    rentalSearchStep.hide = true
    rentalSearchStep.stepAtention = rentalSearchStepConfig.stepAtention


    const rentalnfoStepConfig = {
      stepHint: "",
      stepAtention: "",
      firebase: {endPoint: "contacts_requests", queryline: "id", id: ""}, 
      question: "Selecione o telefone da pessoa.", 
      variable : {
          //    defaultValue = "",
          //    valueValidation = "",
              key : "rentalInformation",
              description : "👀 Locatária(o): "
          }
      }

    const rentalInfoVariable = new Variable(rentalnfoStepConfig.variable.key, rentalnfoStepConfig.variable.description)//, defaultValue = rentalnfoStepConfig.variable.defaultValue),//)
    const rentalStep = new Step(rentalnfoStepConfig.question, rentalInfoVariable)

    rentalStep.loadButtons = async function () {
      const menu: (CallbackButton | UrlButton)[] = [];
      const newData: VariableValue[] = []
      
      rentalnfoStepConfig.firebase.id = <string>  rentalSearchVariable.value?.text
      const filter = `${rentalnfoStepConfig.firebase.endPoint}/${rentalnfoStepConfig.firebase.id}`

      //let index = -1

      await database.getSingleItemFromDB(filter).then((db: any) => {

        //index += 1
        newData.push({ text: db.first_name, data: db })
        menu.push(Markup.callbackButton(`${db.first_name} (${db[rentalnfoStepConfig.firebase.queryline]})`, `${rentalnfoStepConfig.variable.key}#${db[rentalnfoStepConfig.firebase.queryline]}`)) //database[rentalnfoStepConfig.firebase.queryline]
        menu.push(Markup.callbackButton("Corrigir telefone", `next_step`))

        return newData;
        
      }).catch(err => {
          console.log(`Err ${err}`)
      })

      this.data = newData;
      return Promise.resolve(menu);
    }

    rentalStep.answerWithCallback = function (input: string) {
      const selectedIndex = parseInt(input.split("#")[1]);

      if (this.data.length > 0 && selectedIndex < this.data.length) {
          this.variable.value = this.data[selectedIndex]

          this.stepIncrement = 1;

          return true;
      }

      return false;
  }

    const phoneCorrectionVariable = new Variable("newPhone", "Telefone", rentalInfoVariable.getValue())
    const phoneCorrectionStep = new Step("Escreva o novo telefone.", phoneCorrectionVariable);
    phoneCorrectionStep.hide = true;


    const confirmationStepConfig = {
      stepHint: "",
      stepAtention: "",
      firebase: {endPoint: "", queryline: "", id: ""}, 
      question: "Confirma a operação.", 
      variable : {
          //    defaultValue = "",
          //    valueValidation = "",
              key : "bookConfirmation",
              description : ""
          }
      }

    const confirmationVariable = new Variable(confirmationStepConfig.variable.key, confirmationStepConfig.variable.description)//, defaultValue = confirmationStepConfig.variable.defaultValue),//)
    const confirmationStep = new Step(rentalnfoStepConfig.question, confirmationVariable)
    confirmationStep.hide = true

    confirmationStep.loadButtons = async function () {
      const menu = [];
      const  bookData = bookInfoVariable.value?.data;
      const  rentalData = rentalInfoVariable.value?.data
      //const  recordData = firebase.getLastItemFromDB("loan_record/books/"+ bookData.id) as any

      if (isDisponible(bookData)) {
        // se o livro estiver disponível - MENU RETIRAR
        menu.push(Markup.callbackButton("⬆️ Retirar", `${confirmationStepConfig.variable.key}#rent`))

      } else {

        if (bookData.CPF !== rentalData) {
        // se estiver indisponível - MENU RESERVAR
        menu.push(Markup.callbackButton("➡️ Reservar", `${confirmationStepConfig.variable.key}#reserve`))
        } else {
          // se o CPF bater com o do locatário - MENU RENOVAR OU DEVOLVER
          menu.push(Markup.callbackButton("⬇️ Devolver", `${confirmationStepConfig.variable.key}#return`))

          // se o CPF bater com o do locatário, e NÃO tiver gente na fila - MENU RENOVAR OU DEVOLVER
          menu.push(Markup.callbackButton("⬆️ Renovar", `${confirmationStepConfig.variable.key}#renew`))
        }

      }

      return Promise.resolve(menu);
    }

    const steps = [bookSearchStep, bookInfoStep, rentalSearchStep, rentalStep, phoneCorrectionStep, confirmationStep];

    const  flowConfig = {
        //helpText: "Texto para o menu de ajuda"
        //commandHint: "dica em caso de erro, para o comando",
        //confirmationStep: "texto de confirmação",
        //successStep: {message: "Texto de successo.", buttonText: ""},
        pretext: "Gerenciamento da biblioteca iniciado.",
        menuText: "📚 Biblioteca da Ameciclo",
        command: "/biblioteca"
    }
  
    const flow = new Flow(flowConfig.pretext, steps, flowConfig.menuText, flowConfig.command);
    //flow.forceConfirmButton = true
    flow.forceBackButton = true
    flow.forceCancelButton = true
    //flow.onlyForAdmin = true
    //flow.commandHint = flowConfig.commandHint
    //flow.helpText = flowConfig.helpText
    //flow.setDefaultConfirmationStep(flowConfig.confirmationStep);
    //flow.setDefaultSuccessStep(flowConfig.successStep.message, flowConfig.successStep.buttonText);
    //flow.setSuccessUrlValue("")
  
    return flow;

  }


}