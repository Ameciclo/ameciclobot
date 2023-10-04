import { ValueValidation } from "./valuevalidation";

export type VariableValue = {
    text: string;
    data?: any;
}

export class Variable {
    value?: VariableValue;
    key: string;
    description: string;
    defaultValue: string = "";
    valueValidation: ValueValidation;

    constructor(key: string, description: string, defaultValue: string = "", valueValidation: ValueValidation = function () { return { isSuccess: true }; }) {
        this.key = key;
        this.description = description;
        this.defaultValue = defaultValue;
        this.valueValidation = valueValidation;
    }

    updateValueText(text: string) {
        if (this.value) {
            this.value.text = text;
        } else {
            this.value = { text: text };
        }
    }

    getValue(): string {
        return this.value ? this.value.text : this.defaultValue;
    }

}