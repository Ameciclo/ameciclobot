import axios from 'axios';
import gladiaCredentials from '../credentials/gladia.json';

const GLADIA_API_KEY = gladiaCredentials.apiKey;
const GLADIA_BASE_URL = 'https://api.gladia.io/v2';

interface GladiaTranscriptionResult {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  result?: {
    transcription: {
      full_transcript: string;
    };
  };
}

export async function transcribeAudioWithGladia(audioUrl: string): Promise<string> {
  try {
    console.log('[gladia] Iniciando transcrição para URL:', audioUrl);

    // Solicita transcrição
    const transcribeResponse = await axios.post(`${GLADIA_BASE_URL}/pre-recorded`, {
      audio_url: audioUrl,
      language_config: {
        languages: ['pt'],
        code_switching: false
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-gladia-key': GLADIA_API_KEY
      }
    });

    const transcriptionId = transcribeResponse.data.id;
    console.log('[gladia] ID da transcrição:', transcriptionId);

    // Polling para resultado (timeout de 8 minutos)
    const maxAttempts = 240; // 8 minutos com polling a cada 2s
    let attempts = 0;

    while (attempts < maxAttempts) {
      const resultResponse = await axios.get(`${GLADIA_BASE_URL}/pre-recorded/${transcriptionId}`, {
        headers: {
          'x-gladia-key': GLADIA_API_KEY
        }
      });

      const result: GladiaTranscriptionResult = resultResponse.data;
      console.log('[gladia] Status:', result.status);

      if (result.status === 'done') {
        const transcript = result.result?.transcription?.full_transcript;
        if (!transcript) {
          throw new Error('Transcrição vazia retornada pela API');
        }
        console.log('[gladia] Transcrição concluída com sucesso');
        return transcript;
      } else if (result.status === 'error') {
        throw new Error('Erro na transcrição pela API Gladia');
      }

      // Aguarda 2 segundos antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Timeout: transcrição demorou mais que 8 minutos');

  } catch (error) {
    console.error('[gladia] Erro na transcrição:', error);
    throw new Error('Falha na transcrição do áudio');
  }
}