
import { CallbackButton, UrlButton } from "telegraf";

export class StepConfig {
    variableKey : string = ""
    variableDescription : string = ""
    variableDefaultValue: string = ""

    question: string = "Colocar pergunta"
    buttons: (CallbackButton | UrlButton)[] = []
    callback?: string = ""

    required: boolean = false
    hide: boolean = false

    stepHint?: string
    stepAtention?: string

    stepIncrement: number = 0
    argIndex?: number

    fbEndpoint?: string
    fbId?: string
    fbQueryline?: string

    columns: number = 1

}
