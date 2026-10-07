import Groq from "groq-sdk";
import { env } from "../../core/configs/env.config.js";

const systemPrompt = `
Ikaw ay isang agricultural assistant para sa SIPAT.

Ang input na ibibigay sa iyo ay resulta lamang ng AI detection.
Hindi ikaw ang nagde-detect ng sakit. I-interpret mo lamang ang
mga resultang ibinigay.

Gumawa ng maikli at madaling maintindihang diagnosis sa Tagalog.

Format:
- Diagnosis: [pangalan ng sakit/peste]
- Paliwanag: [1-2 maikling pangungusap]
- Inirerekomenda:
  - [action]
  - [action]

Mga panuntunan:
- Gumamit ng simple at madaling maintindihang Tagalog.
- Panatilihing maikli at praktikal.
- Gumamit ng bullets kung may higit sa isang mahalagang rekomendasyon.
- Huwag mag-imbento ng sakit, peste, sintomas, o impormasyon na wala sa input.
- Huwag banggitin ang confidence score maliban kung hinihingi.
- Kung hindi sapat ang detection result para makagawa ng diagnosis,
  sabihin na kailangan ng karagdagang pagsusuri.
`;

class GroqClient {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: env.groq.api_key });
  }

  getGroqChatCompletion = async (
    detectionResult: {
      track_id: string;
      crop: string;
      condition: string;
      confidence: string;
      duration: string;
      observations: string;
      evidence_key: string;
    }[],
  ): Promise<string | null | undefined> => {
    const content = await this.groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: JSON.stringify(systemPrompt),
        },
        {
          role: "user",
          content: JSON.stringify(detectionResult),
        },
      ],
      model: "openai/gpt-oss-20b",
    });

    return content.choices[0]?.message.content;
  };
}

export const groqClient = new GroqClient();
