export type ValidationResult = {
    isSuccess: boolean;
    error?: string
}

export interface ValueValidation {
    (value: string): ValidationResult;
}