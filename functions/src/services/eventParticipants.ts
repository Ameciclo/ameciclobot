import { admin } from "../config/firebaseInit";
import {
  CalendarEventData,
  ExtraParticipant,
  TelegramUserInfo,
} from "../config/types";
import { getCalendarEventData, updateCalendarEventData } from "./firebase";

type IdentifierType = "username" | "email" | "cpf" | "name";

interface SubscriberMatch {
  id: number;
  name: string;
  username?: string;
  email?: string;
  cpf?: string;
}

interface ParsedParticipant {
  raw: string;
  normalized: string;
  identifierType: IdentifierType;
}

export interface RegisterExtraParticipantsResult {
  eventData: CalendarEventData;
  added: ExtraParticipant[];
  duplicates: string[];
}

function splitParticipants(rawInput: string): string[] {
  return rawInput
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

function detectIdentifierType(value: string): IdentifierType {
  if (value.startsWith("@") && value.length > 1) {
    return "username";
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "email";
  }

  if (normalizeCpf(value).length === 11) {
    return "cpf";
  }

  return "name";
}

function parseParticipants(rawInput: string): ParsedParticipant[] {
  return splitParticipants(rawInput).map((raw) => ({
    raw,
    normalized: normalizeText(raw),
    identifierType: detectIdentifierType(raw),
  }));
}

function buildResolvedName(match: SubscriberMatch): string {
  return (
    match.name ||
    match.username ||
    match.email ||
    match.cpf ||
    "Participante sem nome"
  );
}

function getParticipantSignature(participant: ExtraParticipant): string {
  if (participant.matchedUserId) {
    return `user:${participant.matchedUserId}`;
  }

  return `name:${normalizeText(participant.name)}`;
}

async function getSubscribersSnapshot(): Promise<Record<string, any>> {
  const snapshot = await admin.database().ref("subscribers").once("value");
  return snapshot.val() || {};
}

async function findSubscriberMatch(
  parsed: ParsedParticipant,
  subscribers: Record<string, any>
): Promise<SubscriberMatch | null> {
  if (parsed.identifierType === "name") {
    return null;
  }
  const normalizedInput =
    parsed.identifierType === "cpf"
      ? normalizeCpf(parsed.raw)
      : normalizeText(parsed.raw.replace(/^@/, ""));

  for (const [subscriberKey, subscriber] of Object.entries(subscribers)) {
    const telegramUsername = subscriber?.telegram_user?.username;
    const email =
      subscriber?.ameciclo_register?.email || subscriber?.email || undefined;
    const cpf =
      subscriber?.ameciclo_register?.cpf ||
      subscriber?.cpf ||
      subscriber?.ameciclo_register?.document ||
      undefined;

    const normalizedUsername = telegramUsername
      ? normalizeText(telegramUsername)
      : "";
    const normalizedEmail = email ? normalizeText(email) : "";
    const normalizedCpf = cpf ? normalizeCpf(cpf) : "";

    const isMatch =
      (parsed.identifierType === "username" &&
        normalizedUsername === normalizedInput) ||
      (parsed.identifierType === "email" &&
        normalizedEmail === normalizedInput) ||
      (parsed.identifierType === "cpf" && normalizedCpf === normalizedInput);

    if (!isMatch) {
      continue;
    }

    return {
      id: Number(subscriber.id || subscriberKey),
      name: subscriber.name || "",
      username: telegramUsername,
      email,
      cpf: normalizedCpf || undefined,
    };
  }

  return null;
}

function buildExtraParticipant(
  parsed: ParsedParticipant,
  addedBy: TelegramUserInfo,
  match: SubscriberMatch | null
): ExtraParticipant {
  const addedAt = new Date().toISOString();

  if (!match) {
    return {
      input: parsed.raw,
      name: parsed.raw,
      identifierType: parsed.identifierType,
      addedBy,
      addedAt,
    };
  }

  const matchType = parsed.identifierType as "username" | "email" | "cpf";

  return {
    input: parsed.raw,
    name: buildResolvedName(match),
    identifierType: parsed.identifierType,
    matchedUserId: match.id,
    matchType,
    username: match.username,
    email: match.email,
    cpf: match.cpf,
    addedBy,
    addedAt,
  };
}

function createParticipantKey(participant: ExtraParticipant): string {
  const base = normalizeText(participant.name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || "participante";

  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function registerExtraParticipants(
  eventId: string,
  rawInput: string,
  addedBy: TelegramUserInfo
): Promise<RegisterExtraParticipantsResult> {
  const eventData = await getCalendarEventData(eventId);
  if (!eventData) {
    throw new Error("EVENT_NOT_FOUND");
  }

  const parsedParticipants = parseParticipants(rawInput);
  if (parsedParticipants.length === 0) {
    throw new Error("NO_PARTICIPANTS");
  }

  const subscribers = await getSubscribersSnapshot();
  const extraParticipants = eventData.extraParticipants || {};
  const existingSignatures = new Set(
    Object.values(extraParticipants).map((participant: ExtraParticipant) =>
      getParticipantSignature(participant)
    )
  );

  const added: ExtraParticipant[] = [];
  const duplicates: string[] = [];

  for (const parsed of parsedParticipants) {
    const match = await findSubscriberMatch(parsed, subscribers);
    const participant = buildExtraParticipant(parsed, addedBy, match);
    const signature = getParticipantSignature(participant);

    if (existingSignatures.has(signature)) {
      duplicates.push(parsed.raw);
      continue;
    }

    existingSignatures.add(signature);
    extraParticipants[createParticipantKey(participant)] = participant;
    added.push(participant);
  }

  await updateCalendarEventData(eventId, { extraParticipants });

  return {
    eventData: {
      ...eventData,
      extraParticipants,
    },
    added,
    duplicates,
  };
}

export function extractEventIdFromText(text: string | undefined): string | null {
  if (!text) {
    return null;
  }

  const match = text.match(/ID do Evento:\s*`?([^\n`]+)`?/i);
  return match?.[1]?.trim() || null;
}

export function formatExtraParticipantsSummary(
  added: ExtraParticipant[],
  duplicates: string[]
): string {
  const lines: string[] = [];

  if (added.length > 0) {
    lines.push(
      `✅ Participantes adicionados (${added.length}):`,
      ...added.map((participant) => {
        if (participant.matchedUserId) {
          const details =
            participant.matchType === "username" && participant.username
              ? ` (@${participant.username})`
              : participant.matchType === "email" && participant.email
                ? ` (${participant.email})`
                : participant.matchType === "cpf" && participant.cpf
                  ? ` (CPF ${participant.cpf})`
                  : "";

          return `• ${participant.name}${details}`;
        }

        return `• ${participant.name}`;
      })
    );
  }

  if (duplicates.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push(
      `⚠️ Já estavam registrados (${duplicates.length}):`,
      ...duplicates.map((participant) => `• ${participant}`)
    );
  }

  return lines.join("\n");
}
