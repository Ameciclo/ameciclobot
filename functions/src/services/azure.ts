// src/services/azure.ts
import axios from "axios";
import FormData from "form-data";
import whisperConfig from "../credentials/whisper.json";
import azureConfig from "../credentials/gpt35.json";

/**
 * Faz o download do áudio do URL fornecido e envia-o para a API de transcrição (Whisper) do Azure.
 * Retorna a transcrição como string.
 */
export async function transcribeAudio(fileUrl: string): Promise<string> {
  console.log("Baixando áudio do URL:", fileUrl);

  // Baixa o áudio usando axios (como arraybuffer para obter dados binários)
  const audioResponse = await axios.get(fileUrl, {
    responseType: "arraybuffer",
  });
  if (audioResponse.status !== 200) {
    throw new Error(`Erro ao baixar áudio: ${audioResponse.statusText}`);
  }
  // Converte os dados para Buffer
  const audioBuffer = Buffer.from(audioResponse.data);
  //console.log("Áudio baixado, tamanho (bytes):", audioBuffer.length);

  // Cria um FormData e anexa o arquivo de áudio
  const formData = new FormData();
  formData.append("file", audioBuffer, {
    filename: "audio.ogg",
    contentType: "audio/ogg",
  });
  console.log("FormData preparado com o arquivo.");

  // Monta o endpoint final para a transcrição (Whisper) usando as configurações do whisper.json
  const endpoint = `${whisperConfig.endpoint}${whisperConfig.deployment}/audio/transcriptions?api-version=${whisperConfig.apiVersion}`;
  console.log("Endpoint do Whisper:", endpoint);

  // Faz a requisição POST com axios
  const response = await axios.post(endpoint, formData, {
    headers: {
      "api-key": whisperConfig.apiKey,
      ...formData.getHeaders(),
    },
  });
  console.log("Resposta da transcrição:", response.data);
  return response.data || "";
}

/**
 * Envia uma requisição para a API do Chat GPT (ou similar) do Azure.
 * Recebe um array de mensagens (no formato adequado à API) e retorna a resposta.
 */
export async function sendChatCompletion(messages: any[]): Promise<any> {
  // Monta o endpoint para o chat utilizando as configurações do azureConfig.json
  const endpoint = `${azureConfig.endpoint}${azureConfig.deployment}/chat/completions?api-version=${azureConfig.apiVersion}`;
  console.log("Endpoint do Chat GPT:", endpoint);

  // Faz a requisição POST com axios (enviando o corpo em JSON)
  const response = await axios.post(
    endpoint,
    {
      messages,
      max_tokens: 500,
      temperature: 0.7,
      top_p: 1,
      model: azureConfig.deployment,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "api-key": azureConfig.apiKey,
      },
    }
  );
  console.log("Resposta do Chat GPT:", response.data);
  return response.data;
}
