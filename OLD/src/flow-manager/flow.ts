import { Step } from "./step";
import { Extra, Markup, CallbackButton, ContextMessageUpdate, UrlButton } from "telegraf";
import { ValidationResult } from "./valuevalidation";
import utils = require("../aux/utils");
import constants = require("../aux/constants");
import { Message, ExtraEditMessage } from "telegraf/typings/telegram-types";
import { FlowCallback } from "./types";
//import { StepConfig } from "./stepConfig";
//import { Variable } from "./variable";

export class Flow {
    private stepIndex: number = 0
    pretext: string
    steps: Step[]
    menuText: string;
    forcedButtons: (CallbackButton | UrlButton)[] = []
    forceConfirmButton?: boolean = false
    forceNextButton?: boolean = false
    forceBackButton?: boolean = false
    forceCancelButton?: boolean = false
    onlyForAdmin: boolean = false
    successStep: Step = new Step("Fluxo finalizado com successo")
    command: string
    errorStep?: Step
    isCancelled = false
    cancelStep?: Step = new Step("Fluxo cancelado")
    commandHint?: string
    userId?: number
    helpText?: string

    constructor(pretext: string, steps: Step[], menuText: string, command: string = "") {
        this.steps = steps;
        this.pretext = pretext;
        this.menuText = menuText;
        this.command = command;
    }

    // insertStep(config: StepConfig): Step {
    //     const variable = new Variable(config.variableKey, config.variableDefaultValue, config.variableDefaultValue)       
    //     const step = new Step(config.question, variable)

    //     step.stepAtention = config.stepAtention
    //     step.stepHint = config.stepHint
    //     step.hide = config.hide
    //     step.stepIncrement = config.stepIncrement
    //     step.forceCallbackAnswer = false
    //     step.argIndex = config.argIndex
    //     step.menuOptions = { columns: config.columns }
    //     // // ATIVAR MENU POR QUERY - TODO TERMINAR
    //     //     step.answerRegex = new RegExp(`^[select${config.variable.key}]+(#[a-z+0-9+A-Z+_+-]+)?$`)
    //     //     step.loadButtons = async function () {
    //     //         const menu: (CallbackButton | UrlButton)[] = [];
    //     //         const newData: VariableValue[] = []
    //     //         await firebase.getFromDB(config.firebase.endPoint).then((returnedData: any) => {
    //     //             returnedData.forEach((returnData: any, index: number) => {
    //     //                 const nameQuery = "".toUpperCase() // EX: recipientSearchVariable.value?.text.toUpperCase();
    //     //             if (!returnData.name?.toUpperCase().includes(nameQuery)) return;
    //     //                 newData.push({ text: returnData(config.firebase.queryline), data: returnData }) 
    //     //                 menu.push(Markup.callbackButton(returnData.name, `select${config.variable.key}#${index}`))
    //     //             })
    //     //             return newData;
    //     //         }).catch((err: any) => {
    //     //             console.log(`Err ${err}`)
    //     //         })
    //     //         this.data = newData;
    //     //         return Promise.resolve(menu);
    //     //     }

    //     return step
    // }

    getActualStep(): Step {
        if (this.stepIndex >= this.steps.length) {
            return this.successStep;
        } else if (this.isCancelled) {
            return this.cancelStep ? this.cancelStep : this.steps[this.stepIndex];
        } else {
            return this.steps[this.stepIndex];
        }
    }

    getMessageText(): string {
        let message =  `${this.pretext}\n`

        /*
        this.steps.forEach(step => {
            if (!step.hide) {
                message += `\n${step.variable.description} ${step.getValue()}`
            }
        });*/

        for (let s = 0; s < this.steps.length; s++) {
            const step = this.steps[s]
            let indicator = " "

            if (s === this.stepIndex){
                indicator += constants.symbols.indicator
            } else if (s < this.stepIndex) {
                indicator += constants.symbols.before_indicator
            } else {
                indicator += constants.symbols.next_indicator
            }

            if (s === this.steps.length - 1) {
                indicator = " "
            }

            if (!step.hide) {
                message += `\n${indicator}${step.variable.description} ${utils.removeCharToMarkdownExtras(step.getValue())}`
            }
        }

        message += `\n\n*${utils.getNumberIntoSymbol(this.stepIndex)} ${utils.removeCharToMarkdownExtras(this.getActualStep().question)}*`

        // Adds hint and attention to message, if exists
        const hasStepHint = this.getActualStep().stepHint !== "" && this.getActualStep().stepHint !== undefined
        const hasStepAttention = this.getActualStep().stepAtention !== "" && this.getActualStep().stepAtention !== undefined

        if (hasStepHint || hasStepAttention) message += `\n`
        if (hasStepHint) message += `\n${constants.symbols.text.info} ${this.getActualStep().stepHint}`
        if (hasStepAttention) message += `\n${constants.symbols.text.alert} ${this.getActualStep().stepAtention}`

        message = utils.removeCharToMarkdown(message)

        ///  '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!

       /* let escapedMessage = message
            .replace(/\./g, "\\.")
            .replace(/\-/g, "\\-")
            .replace(/\!/g, "\\!")
            .split(")").join("\\)")
            .split("(").join("\\(");

        let escapedMessageAlt = utils.removeCharToMarkdown(message)
        console.log(escapedMessageAlt)

        return escapedMessage;*/
        return message
    }

    async getMessageExtra(): Promise<ExtraEditMessage> {
        const buttons = [...await this.getActualStep().getButtons()];

        if (this.stepIndex !== 0 && (this.steps.length - 1 > this.stepIndex)) {
            this.forcedButtons.forEach(button => {
                buttons.push(button);
            })
            if (this.forceNextButton) buttons.push(Markup.callbackButton(constants.buttonsText.next, FlowCallback.NEXT))
            if (this.forceBackButton) buttons.push(Markup.callbackButton(constants.buttonsText.back, FlowCallback.BACK))
            if (this.forceCancelButton) buttons.push(Markup.callbackButton(constants.buttonsText.cancel, FlowCallback.CANCEL))
        }

        const inlineKeyboard = Markup.inlineKeyboard(buttons, this.getActualStep().menuOptions)
        return Extra.markup(inlineKeyboard);
    }

    // setForceBackButton() {
    //     this.forcedButtons.push(Markup.callbackButton(constants.buttonsText.back, FlowCallback.BACK))
    //     }

    // setForceNextButton() {
    //     this.forcedButtons.push(Markup.callbackButton(constants.buttonsText.next, FlowCallback.NEXT))
    //     }

    // setForceCancelButton() {
    //     this.forcedButtons.push(Markup.callbackButton(constants.buttonsText.cancel, FlowCallback.CANCEL))
    //     }

    getObject(): MutableObject {
        const result: MutableObject = {}

        this.steps.forEach(step => {
            const value = step.variable.value?.data ? step.variable.value?.data : step.variable.value?.text;
            result[step.variable.key] = value ? value : step.variable.defaultValue;
        });

        return result;
    }

    async insertAnswer(answer: string): Promise<ValidationResult> {
        const validationResult = await this.getActualStep().answer(answer)

        if (validationResult.isSuccess) {
            this.nextStep()
        }

        return validationResult;
    }

    insertCallbackAnswer(answer: string): boolean {
        if (this.getActualStep().answerWithCallback(answer)) {
            this.nextStep()
            return true;
        }
        return false;
    }

    async insertAnswersFromCommand(input: string): Promise<ValidationResult> {
        const args = input.split(" ");
        const steps = this.getArgumentsSteps();

        const results: ValidationResult[] = []

        steps.forEach(async step => {
            const argFound = args.find((_, index) => { return index === step.argIndex });

            if (argFound !== undefined) {
                const result = await step.answer(argFound)
                results.push(result);
                return result;
            }
            else if (step.argIndex !== undefined && step.argIndex === -1) {
                const argsSumLength = args.slice(0, steps.length - 1).reduce((accumulator, current) => { return accumulator + current.length }, 0);
                const rest = input.slice(argsSumLength + steps.length - 1, input.length);
                const result = await step.answer(rest);
                results.push(result)
                return result;
            } else {
                return false;
            }
        })

        this.goToFirstEmptyStep();
        const firstError = results.find(validation => validation.isSuccess === false);
        return firstError ? firstError : Promise.resolve({ isSuccess: true });
    }

    private goToFirstEmptyStep(): number {
        let firstErrorIndex = -1;

        this.steps.find((step, index) => {
            if (!step.isAnswered()) {
                firstErrorIndex = index
                return true;
            }

            return false;
        });

        if (firstErrorIndex >= 0) {
            this.goToStep(firstErrorIndex);
        } else {
            this.nextStep();
        }

        return firstErrorIndex;
    }

    // Função que retorna todos os passos que podem ser
    // respondidos via argumentos em um comando.
    private getArgumentsSteps(): Step[] {
        const steps: Step[] = []

        this.steps.forEach(step => {
            if (step.argIndex !== undefined) {
                steps.push(step);
            }
        })

        return steps.sort();
    }

    private async handleCallback(ctx: ContextMessageUpdate, callback: string): Promise<boolean> {
        const step = this.getActualStep();
        let found = true;
        this.userId = ctx.from?.id;

        switch (true) {
            case (callback === step.callback):
                break;
            case (callback === FlowCallback.BACK):
                this.backStep();
                break;
            case (callback === FlowCallback.NEXT):
                this.nextStep();
                break;
            case (callback === FlowCallback.CANCEL):
                this.isCancelled = false;
                break;
            case (callback === FlowCallback.CONFIRM):
                await this.finishFlow(ctx);
                break;
            case step.answerRegex?.test(callback):
                this.insertCallbackAnswer(callback);
                break;
            default:
                found = false;
                break;
        }

        return Promise.resolve(found);
    }

    isLastStep() : Boolean {
        return this.stepIndex >= this.steps.length
    }

    async flowHandler(ctx: ContextMessageUpdate) {
        const callback = ctx.update.callback_query ? ctx.update.callback_query.data : "";
        const messageText = ctx.update.message ? ctx.update.message?.text : "";
        const answer = callback ? callback : messageText
        const command = utils.extractCommand(messageText);

        console.log(`FLOW HANDLER| messageText: ${messageText} & Callback: ${callback} & Answer ${answer}`);

        let needUpdateMessage = true;
        let inserted: ValidationResult = { isSuccess: false }

        // direciona de acordo com a interação com o usuário (comando, clique ou mensagem)
        if (this.command && this.command === command) {
            this.clearFlow()
            const cleanInput = utils.clearCommandFromUserInput(messageText);
            inserted = await this.insertAnswersFromCommand(cleanInput);
        } else if (callback) {
            needUpdateMessage = await this.handleCallback(ctx, callback);
            inserted = { isSuccess: needUpdateMessage }
        } else if (answer !== undefined) {
            inserted = await this.insertAnswer(answer);
            needUpdateMessage = inserted.isSuccess         
        }

        if (inserted && this.isLastStep()) {
            needUpdateMessage = await this.finishFlow(ctx)
        }

        if (!inserted.isSuccess && inserted.error) {
            return ctx.reply(inserted.error).then(msg => {
                if (this.command === command && this.commandHint !== undefined) {
                    return ctx.replyWithMarkdown(this.commandHint)
                }

                return msg;
            });

        }

        if (needUpdateMessage) {
            const isReply = command !== undefined && command[0] === "/"

            return this.updateMessage(ctx, isReply).then(msg => {
                if (callback === FlowCallback.CONFIRM) { this.clearFlow() }
                return msg
            });
        } else {
            return Promise.resolve(true);
        }

    }

    private async editMessage(context: ContextMessageUpdate, chatId: number, messageId: any, text: string, extras: ExtraEditMessage, autoUpdate: boolean = false) {
        // const inlineExtra: ExtraEditMessage = Object.assign({}, extras)

        // extras.reply_markup = { force_reply: true, selective: true}

        // autoUpdate ? extras : inlineExtra
        const editedMessage = await context.telegram.editMessageText(chatId, messageId, messageId, text, extras)

        // if (autoUpdate) {
        //     return context.telegram.editMessageText(chatId, messageId, messageId, text, inlineExtra)
        // }

        return editedMessage;
    }

    private async updateMessage(context: ContextMessageUpdate, isReply?: boolean, forceReply: boolean = true): Promise<Message | boolean> {
        const messageId = (<any>context).session?.messageId
        const chatId = (<any>context).session?.chatId

        const text = this.getMessageText();
        const extras = await this.getMessageExtra();
        // const extraBackup: ExtraEditMessage = Object.assign({}, extras)

        extras.parse_mode = "MarkdownV2";

        if (messageId && chatId && !isReply) {
            return this.editMessage(context, chatId, messageId, text, extras, true)
        }

        const anyCtx = (<any>context);
        extras.reply_to_message_id = anyCtx.message.message_id

        // if (forceReply) {
        //     extras.reply_markup = { force_reply: true, selective: true}
        // }

        const message = await context.reply(text, extras);

        anyCtx.session.messageId = message.message_id;
        anyCtx.session.chatId = message.chat.id;

        // if (forceReply) {
        //     return context.telegram.editMessageText(chatId, messageId, messageId, text, extraBackup)
        // }

        return message;
    }

    private nextStep(): number {
        if (this.stepIndex < this.steps.length) {
            this.stepIndex += 1 + this.getActualStep().stepIncrement;
        }

        return this.stepIndex;
    }

    private goToStep(index: number): number {
        if (index > 0 && index < this.steps.length) {
            this.stepIndex = index;
        }

        return this.stepIndex;
    }

    private backStep(): number {
        if (this.stepIndex - 1 >= 0) {
            return this.stepIndex -= 1;
        }

        return this.stepIndex;
    }

    setDefaultConfirmationStep(subtitle: string) {
        const step = new Step(subtitle);

        step.loadButtons = async function () {
            const menu = [
                Markup.callbackButton(constants.buttonsText.confirm, FlowCallback.CONFIRM),
                Markup.callbackButton(constants.buttonsText.cancel, FlowCallback.CANCEL)
            ]

            return Promise.resolve(menu);
        }

        this.steps.push(step);
    }

    setDefaultSuccessStep(successMessage: string, urlButtonText: string): Step {
        const successStep = new Step(successMessage)
        successStep.loadButtons = async function () {
            const menu = [Markup.urlButton(urlButtonText, this.getValue())]
            return Promise.resolve(menu)
        }

        this.successStep = successStep
        return this.successStep
    }

    setSuccessUrlValue(url: string): void {
        this.successStep.variable.updateValueText(url)
    }

    private async finishFlow(context: ContextMessageUpdate): Promise<boolean> {
        return this.finish(context).then(isSuccess => {

            if (!isSuccess) {
                return false
            }

            (<any>context).session.flow = -1
            this.nextStep();
            return true
        })
    }

    clearFlow() {
        this.isCancelled = false
        this.steps.forEach(step => {
            step.variable.value = undefined
        });

        this.stepIndex = 0
        // this.getActualStep = () => {
        //     if (this.stepIndex >= this.steps.length) {
        //         return this.successStep;
        //     } else {
        //         return this.steps[this.stepIndex];
        //     }
        // }
    }

    finish(ctx: ContextMessageUpdate): Promise<boolean> {
        return Promise.resolve(false)
    }

}