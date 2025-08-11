import axiosInstance from "../config/httpService";
import FormData from "form-data";
import whisperConfig from "../credentials/whisper.json";
import azureConfig from "../credentials/gpt35.json";

export async function transcribeAudio(fileUrl: string): Promise<string> {
  try {
    console.log("[azure.transcribeAudio] Iniciando transcrição do áudio.");

    const audioResponse = await axiosInstance.get(fileUrl, {
      responseType: "arraybuffer",
    });
    console.log("[azure.transcribeAudio] Resposta de áudio recebida.");
    if (audioResponse.status !== 200) {
      throw new Error(`Erro ao baixar áudio: ${audioResponse.statusText}`);
    }
    const audioBuffer = Buffer.from(audioResponse.data);
    console.log("[azure.transcribeAudio] Áudio convertido para buffer.");

    const formData = new FormData();
    formData.append("file", audioBuffer, {
      filename: "audio.ogg",
      contentType: "audio/ogg",
    });
    console.log("[azure.transcribeAudio] FormData preparado.");

    const endpoint = `${whisperConfig.endpoint}${whisperConfig.deployment}/audio/transcriptions?api-version=${whisperConfig.apiVersion}`;
    console.log("[azure.transcribeAudio] Endpoint do Whisper:", endpoint);

    const response = await axiosInstance.post(endpoint, formData, {
      headers: {
        "api-key": whisperConfig.apiKey,
        ...formData.getHeaders(),
      },
    });
    //console.log("[azure.transcribeAudio] Resposta do Whisper:", response.data);
    return response.data.text || "";
  } catch (error) {
    console.error("[azure.transcribeAudio] Erro:", error);
    throw error;
  }
}

export async function sendChatCompletion(messages: any[]): Promise<any> {
  try {
    console.log("[azure.sendChatCompletion] Enviando mensagens para ChatGPT.");
    const endpoint = `${azureConfig.endpoint}${azureConfig.deployment}/chat/completions?api-version=${azureConfig.apiVersion}`;
    console.log("[azure.sendChatCompletion] Endpoint do Chat GPT:", endpoint);

    const response = await axiosInstance.post(
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
    return response.data;
  } catch (error) {
    console.error("[azure.sendChatCompletion] Erro:", error);
    throw error;
  }
}
