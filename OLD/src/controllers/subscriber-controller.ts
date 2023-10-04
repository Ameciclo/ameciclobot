///////////////////////////////////////////////////////
import { Step } from "../flow-manager/step";
import { Flow } from "../flow-manager/flow";
import { Variable } from "../flow-manager/variable";
import { Markup, ContextMessageUpdate } from "telegraf";
import database = require('../aux/database');

export type Subscriber = {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    frequence: string;
    //cpf: string;
  }

  export class Controller extends Flow {

  ////////////////////////////
  // SALVA EVENTO NA AGENDA //
  ////////////////////////////

  static saveSubscriber(preferences: Subscriber): Promise<any> {

    let daily = false
    let weekly = false
    if (preferences.frequence === "1") {
        weekly = true
    }
    if (preferences.frequence === "7") {
        daily = true
        console.log(`daily`);
    }


    const  json = <any> {}
    //json[`${preferences.id}`] = preferences

    json[`${preferences.id}.id`] = preferences.id
    json[`${preferences.id}.first_name`] = preferences.first_name
    json[`${preferences.id}.last_name`] = preferences.last_name
    json[`${preferences.id}.username`] = preferences.username
    //json[`${ctx.from.id}.cpf`] = preferences.cpf
    json[`${preferences.id}.frequence.daily`] = daily
    json[`${preferences.id}.frequence.weekly`] = weekly
    
    return database.updateSubscriber(preferences)

 }

    getFlow(): Flow {
        const subscriptionVariable = new Variable("frequence", "");
        const subscriptionStep = new Step("⏰ Inscreva-se para notificações", subscriptionVariable, [], true, "frequence");

        subscriptionStep.answerRegex = /^[frequence]+(#[a-z+0-9+A-Z+_+-]+)?$/

        subscriptionStep.loadButtons = async function () {
            const answerCallback = "frequence"

            const menu = [
                Markup.callbackButton("Diária", `${answerCallback}#7`),
                Markup.callbackButton("Semanal", `${answerCallback}#1`),
                Markup.callbackButton("Nenhuma", `${answerCallback}#0`),
            ]
  
        return Promise.resolve(menu);
      }

      subscriptionStep.answerWithCallback = function (input: string) {
        const selectedOption = input.split("#")[1];
  
        if (selectedOption === "next_step") {
          return true;
        }
  
        this.variable.updateValueText(selectedOption);
        return false;
      }

        const steps = [subscriptionStep]

        let flowTitle = "⏰ Inscreva-se para notificações";
        const userId = this.userId;
        const  alreadyDaily = database.isUserSubscribed(userId);
        const  alreadyWeekly = false
        if (alreadyDaily) {
            flowTitle = "⏰ Notificações diárias. Mudar?";
        }
        if (alreadyWeekly) {
            flowTitle = "⏰ Notificações semanais. Mudar?";
        }

        const subscriberFlow = new Flow("Se inscreva e receba de mim as informações dos eventos da Ameciclo e aumente sua participação.", steps, flowTitle, "/assinar");
     
        const succesStep = new Step("Opções de notificações atualizadas com successo!");
        subscriberFlow.successStep = succesStep;

        subscriberFlow.finish = async function (ctx: ContextMessageUpdate): Promise<boolean> {

            const subscriberObject = subscriberFlow.getObject();
            subscriberObject.id = ctx.from?.id
            subscriberObject.first_name = ctx.from?.first_name
            subscriberObject.last_name = ctx.from?.first_name
            subscriberObject.username = ctx.from?.username

            try {
              await Controller.saveSubscriber(subscriberObject as Subscriber);
              this.pretext = "Opções de notificações dadas atualizadas!"
              return true;
            } catch (error) {
              console.log(error);
              return false;
            }
          }

        return subscriberFlow
  }
}