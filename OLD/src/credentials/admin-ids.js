// IDS DAS PESSOAS COM PODERES DE ADMIN

import { database } from "firebase-admin";

const idsAllowed = [156302356,157783985,439637366,817347024] // Igor, Daniel, Gaia, Uana
// vanessa 511809899
const testGroup = -386173744// Grupo de teste
const groupChatId = -246496623 // Grupo do financeiro

export function getAdminsIds() {
    return idsAllowed;
}

export function getPaymentGroupId() {
    return groupChatId;
}

export function getTestGroupId() {
    return testGroup;
}
