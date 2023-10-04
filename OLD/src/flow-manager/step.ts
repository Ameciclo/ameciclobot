
import { Variable, VariableValue } from "./variable";
import { Markup, CallbackButton, UrlButton } from "telegraf";
import { ValidationResult } from "./valuevalidation";

// const utils = require("./utils");
import utils = require("../aux/utils");
import constants = require("../aux/constants");

export class Step {
    private buttons: (CallbackButton | UrlButton)[] = []
    // TODO: filtro ser uma opção padrão
    // private filterEnabled: boolean = false
    // private filterQuery: string = ""

    question: string;
    variable: Variable = new Variable("", "");
    required: boolean;
    data: VariableValue[] = []
    menuOptions: any = { columns: 1 }
    hide: boolean = false
    stepIncrement: number = 0;
    forceCallbackAnswer: boolean = true
    callback: string;
    answerRegex?: RegExp;
    argIndex?: number
    stepHint?: string;
    stepAtention?: string;


    constructor(question: string, variable: Variable = new Variable("", ""), buttons: (CallbackButton | UrlButton)[] = [], required: boolean = true, callback: string = "") {
        this.question = question;
        this.buttons = buttons;
        this.variable = variable;
        this.required = required;

        if (!callback) {
            this.callback = utils.getHashCode(question).toString();
        } else {
            this.callback = callback;
        }

    }

    async loadButtons(): Promise<(CallbackButton | UrlButton)[]> {
        return this.buttons ? this.buttons : []
    }

    async getButtons(): Promise<(CallbackButton | UrlButton)[]> {
        this.buttons = await this.loadButtons();

        if (!this.required) {
            const passStep = Markup.callbackButton(constants.buttonsText.next, "next_step");
            this.buttons.push(passStep);
        }

        return this.buttons;
    }

    answer(input: string): Promise<ValidationResult> {
        if (!this.acceptMessage()) return Promise.resolve({ isSuccess: false, error: "Só é possível responder essa pergunta clicando em um dos botões." });

        const validation = this.variable.valueValidation(input);

        if (validation.isSuccess) {
            const variableValue = { text: input }
            this.variable.value = variableValue;
        }

        return Promise.resolve(validation);
    }

    answerWithCallback(input: string): boolean {
        const selectedIndex = parseInt(input.split("#")[1]);

        if (this.data.length > 0 && selectedIndex < this.data.length) {
            this.variable.value = this.data[selectedIndex]
            return true;
        }

        return false;
    }

    getItemDescription(itemData: VariableValue): string {
        return itemData.text;
    }

    getValue(): string {
        return this.variable.getValue();
    }

    isAnswered(): boolean {
        return this.variable.value !== undefined;
    }

    acceptMessage(): boolean {
        return (this.answerRegex === undefined) && (this.forceCallbackAnswer);
    }

}