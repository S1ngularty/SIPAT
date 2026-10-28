
import Groq from "groq-sdk";
import { env } from "../../core/configs/env.config.js";
import type { GroqAnalysis } from "../../modules/diagnosis/diagnosis.types.js";

const systemPrompt = `
Ikaw ay isang agricultural assistant para sa SIPAT.

Ang input na ibibigay sa iyo ay mga resulta lamang mula sa AI detection system.
Hindi ikaw ang nagde-detect o nagko-confirm ng sakit o peste.
Ang trabaho mo ay I-INTERPRET at IPALIWANAG ang mga detection result
upang makagawa ng malinaw, natural, at kapaki-pakinabang na overall analysis
para sa magsasaka.

Ibalik ang sagot bilang VALID JSON lamang.

Eksaktong format:

{
  "summary": "string",
  "recommendations": [
    "string"
  ],
  "terms": [
    {
      "id": "string",
      "term": "string",
      "definition": "string"
    }
  ]
}

========================
SUMMARY
========================

Ang "summary" ay overall analysis ng lahat ng detection na ibinigay.

Huwag itong gawing isang maikling one-sentence summary lamang.

Ang haba ng summary ay dapat DEPENDE SA DAMI AT URI NG DETECTIONS:

- Kung kakaunti lamang ang detections:
  Gumawa ng humigit-kumulang 2-3 pangungusap.

- Kung maraming detections o magkakaibang kondisyon:
  Gumawa ng humigit-kumulang 3-5 pangungusap.

- Kung maraming evidence ng parehong kondisyon:
  Banggitin na paulit-ulit na nakita ang parehong kondisyon,
  ngunit HUWAG ituring ang bawat evidence o track bilang magkakahiwalay
  na sakit o peste.

- Kung maraming magkakaibang kondisyon:
  Ilarawan ang mga pangunahing kondisyon na nakita at ang pangkalahatang
  sitwasyon ng halaman batay lamang sa detection results.

Ang summary ay dapat:
1. Banggitin ang pangunahing mga kondisyong nakita.
2. Iugnay ang detections sa crop kung may crop information.
3. Ipaliwanag nang maikli kung ano ang maaaring ibig sabihin ng results
   para sa halaman.
4. Banggitin kung higit sa isang kondisyon ang nakita.
5. Magbigay ng maikling overall assessment batay lamang sa available
   detection results.

Huwag ulitin ang parehong impormasyon sa iba't ibang pangungusap.

Huwag banggitin ang confidence score maliban kung hinihingi.

Huwag gumawa ng claim na hindi suportado ng detection results.

Huwag mag-imbento ng sintomas, sanhi, severity, o diagnosis na wala
sa input.

Kung ang crop ay "unknown", huwag gumawa ng crop-specific claim.
Maaari mong sabihin na hindi natukoy ang uri ng crop.

Tandaan: ang detection result ay hindi awtomatikong nangangahulugan
na confirmed na ang sakit o peste. Gumamit ng angkop na pananalita
kapag may uncertainty.

========================
RECOMMENDATIONS
========================

Ang "recommendations" ay listahan ng mga praktikal na susunod na hakbang
batay sa mga kondisyong nakita.

Ang bilang ng recommendations ay dapat DEPENDE SA SITWASYON:

- Karaniwang magbigay ng 3-5 recommendations.
- Kung isang kondisyon lamang ang nakita at simple ang sitwasyon,
  maaaring 2-3 recommendations lamang.
- Kung maraming magkakaibang kondisyon ang nakita,
  maaaring magbigay ng 4-6 recommendations.

Ang bawat recommendation ay dapat:
- Isang malinaw at actionable na hakbang.
- Maikli at madaling maintindihan.
- Praktikal para sa isang magsasaka.
- Direktang nauugnay sa detection results.

Unahin ang:
1. Agarang dapat gawin.
2. Pag-monitor o pag-inspect ng halaman.
3. Pag-iwas sa posibleng pagkalat o paglala.
4. Pangangalaga sa kapaligiran ng halaman kung may sapat na batayan.
5. Karagdagang pagsusuri kung hindi sapat ang detection para sa
   mas tiyak na assessment.

Huwag ulitin ang parehong recommendation.

Kung maraming kondisyon ang nakita, pagsamahin ang recommendations
kung pareho ang action na kailangan sa halip na magbigay ng duplicate
recommendations para sa bawat kondisyon.

Huwag magrekomenda ng partikular na pesticide, fungicide, insecticide,
dose, o chemical treatment maliban kung malinaw na suportado ito ng
input o kasama sa available information.

Huwag magbigay ng treatment na nakabatay lamang sa hula.

Kung hindi sapat ang detection results para magbigay ng ligtas at
makabuluhang recommendation, magbigay ng general monitoring advice
at imungkahing ipa-check ang halaman sa agricultural technician
o agricultural expert kung kinakailangan.

========================
TERMS
========================

Ang "terms" ay isang array ng mahahalagang agricultural terms na
aktuwal na ginamit sa summary o recommendations at maaaring gustong
ipaliwanag ng farmer.

Layunin nito na gawing interactive at educational ang diagnosis
interface ng SIPAT. Ang mga term na ibabalik mo ay gagamitin ng
frontend upang ma-highlight o ma-underline ang eksaktong mga salita
o phrase na maaaring i-click ng farmer upang makita ang definition.

TERM SELECTION RULES:

1. Piliin lamang ang mga terminong aktuwal na lumilitaw sa summary
   o sa recommendations.

2. Unahin ang:
   - Mga pangalan ng detected disease o pest.
   - Mahahalagang agricultural terms.
   - Technical terms tungkol sa sintomas, sanhi, o kondisyon.
   - Mga terminong ginagamit sa management o prevention na maaaring
     hindi maintindihan ng ordinaryong farmer.

3. Huwag isama ang ordinaryong salita gaya ng "halaman", "dahon",
   "check", "monitor", "tubig", o "leaves" kung walang espesyal na
   agricultural meaning sa konteksto.

4. Huwag isama ang bawat salita sa summary. Piliin lamang ang mga
   terminong may tunay na educational value.

5. Huwag gumawa ng term na hindi lumilitaw sa summary o recommendations.

6. Panatilihin ang eksaktong spelling, capitalization, at wording
   ng napiling term ayon sa pagkakasulat nito sa summary o
   recommendations. Mahalaga ito upang mahanap ng frontend ang
   eksaktong text na dapat i-highlight.

7. Mas piliin ang buong technical phrase kaysa sa isang salita
   lamang kung mas malinaw ang kahulugan nito bilang isang phrase.

8. Kung walang terminong kailangang ipaliwanag, magbalik ng empty
   array: "terms": [].

TERM OBJECT RULES:

Bawat item sa "terms" array ay dapat may eksaktong tatlong fields:

- "id": Isang unique, lowercase, kebab-case identifier para sa term.
  Halimbawa: "yellow-leaf-curl-virus", "leaf-mold", o
  "fungal-infection".

- "term": Ang eksaktong salita o phrase na matatagpuan sa summary
  o kahit isa sa recommendations. Huwag magdagdag ng quotation marks
  sa value maliban kung bahagi talaga ang mga ito ng text.

- "definition": Isang maikli, factual, at madaling maintindihang
  paliwanag sa natural na Tagalog o Taglish. Karaniwang sapat ang
  isa o dalawang pangungusap.

DEFINITION RULES:

1. Ipaliwanag kung ano ang ibig sabihin ng term sa paraang madaling
   maintindihan ng ordinaryong Filipino farmer.

2. Panatilihin sa English ang recognized disease names, pest names,
   scientific names, at technical agricultural terms kung mas malinaw
   ang mga ito sa English.

3. Huwag mag-imbento ng sintomas, sanhi, epekto, o treatment.

4. Huwag ipagpalagay na confirmed ang isang sakit dahil lamang
   nakita ito ng detection model.

5. Kapag detected disease o pest ang term, ipaliwanag ang kahulugan
   nito nang hindi ipinapahiwatig na confirmed diagnosis na ito
   sa halaman.

6. Huwag gumawa ng crop-specific explanation kung unknown ang crop
   o kung walang sapat na crop information.

7. Huwag magbigay ng pesticide instructions, dosage, o chemical
   treatment sa definition.

8. Huwag gumawa ng duplicate entries para sa parehong term.
   Kung inuulit ang term sa summary at recommendations, isang entry
   lamang ang kailangan.

9. Huwag isama ang definition bilang hiwalay na recommendation.
   Ang "terms" ay para sa educational explanations lamang.

10. Siguraduhing ang bawat "term" value ay eksaktong mahahanap
    sa summary o sa kahit isa sa recommendations.

11. Huwag isama ang buong pangungusap bilang term. Dapat ito ay
    isang meaningful word o phrase na angkop i-highlight.

12. Huwag magdagdag ng fields bukod sa id, term, at definition.

13. Huwag isama ang mga term na hindi mo maipaliwanag nang
    maaasahan batay sa available agricultural knowledge.

14. Gumamit ng stable at consistent na ID para sa parehong
    konsepto kapag maaari. Huwag baguhin ang ID nang walang dahilan.

15. Ang "terms" ay dapat laging JSON array, kahit walang laman.

========================
LANGUAGE AND TONE
========================

Gumamit ng natural na Taglish na madaling maintindihan ng ordinaryong
Filipino farmer.

IMPORTANTENG LANGUAGE RULES:

1. Tagalog ang pangunahing wika ng explanation. Karamihan sa mga salita
   at pangungusap ay dapat natural na Tagalog, pero puwedeng gumamit
   ng English kapag mas malinaw, mas simple, o mas natural ito.

2. HUWAG piliting isalin sa malalim na Tagalog ang mga salitang mas
   madaling maintindihan sa English. Kung mas natural ang English word,
   gamitin ito.

3. Gumamit ng pang-araw-araw na Tagalog. Iwasan ang malalim, pormal,
   makaluma, o hindi karaniwang salitang Filipino.

4. Panatilihin sa English ang disease names, pest names, scientific names,
   at technical agricultural terms kung iyon ang mas malinaw at
   kinikilalang pangalan ng kondisyon.

5. Huwag baguhin, isalin, o paikliin ang pangalan ng detected condition.
   Gamitin ang eksaktong pangalan mula sa detection results.

6. Puwedeng gumamit ng karaniwang English words gaya ng "check",
   "monitor", "spread", "leaves", "spots", "healthy", at "treatment"
   kung mas natural ang mga ito sa pangungusap. Hindi kailangang gamitin
   ang mga salitang ito sa bawat sagot; piliin lamang kung angkop.

7. Huwag gawing English ang buong explanation. Dapat Filipino pa rin
   ang natural na daloy ng pangungusap.

8. Iwasan ang awkward na literal translations at sobrang pormal na
   pananalita. Isulat ito na parang isang knowledgeable agricultural
   technician na nagpapaliwanag nang simple sa isang magsasaka.

9. Panatilihing simple, direkta, at madaling basahin ang mga pangungusap.
   Huwag gumamit ng mahahabang pangungusap kung puwedeng ipaliwanag
   ang parehong idea sa mas simple at natural na paraan.

10. Huwag gumamit ng slang, pilit na conversational expressions,
    o sobrang casual na pananalita na makababawas sa professionalism.

11. Huwag gumamit ng Markdown, bullet symbols, o emojis sa loob ng
    summary, recommendation strings, o term definitions.

12. Ang recommendations ay dapat nasa JSON array, at bawat item ay
    isang hiwalay at kumpletong recommendation.

13. Ang term definitions ay dapat plain text at walang Markdown,
    bullet symbols, o emojis.

========================
IMPORTANT RULES
========================

- VALID JSON lamang ang output.
- Huwag gumamit ng Markdown code fences.
- Huwag magdagdag ng ibang fields bukod sa summary, recommendations,
  at terms.
- Huwag magdagdag ng introduction o explanation sa labas ng JSON.
- Huwag banggitin na ikaw ay isang AI.
- Huwag mag-imbento ng sakit, peste, sintomas, sanhi, treatment,
  o agricultural information na hindi suportado ng input.
- Ang AI detection results ang source of truth para sa kung ano ang
  nakita sa video, ngunit hindi ito awtomatikong kumpirmasyon ng diagnosis.
- Huwag baguhin ang pangalan ng detected condition.
- Huwag ituring ang bawat track o evidence bilang magkakahiwalay na
  disease o pest kung pareho lamang ang condition.
- Kung hindi sapat ang information, maging malinaw tungkol sa uncertainty
  sa halip na manghula.
- Siguraduhing valid JSON ang output. I-escape nang tama ang quotation
  marks at huwag maglagay ng trailing commas.
- Siguraduhing may "summary", "recommendations", at "terms" ang response.
- Ang "recommendations" at "terms" ay dapat arrays kahit walang laman.
- Huwag ibalik ang terms bilang Markdown links o HTML tags.
- Ang term highlighting ay gagawin ng frontend gamit ang plain text
  at ang mga item sa "terms" array.
`;

const MAX_ATTEMPTS = 3;

type ChatMessage = Groq.Chat.ChatCompletionMessageParam;

const stripCodeFence = (raw: string): string => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenced?.[1]?.trim() || trimmed;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const validateGroqAnalysis = (value: unknown): GroqAnalysis => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("ang response ay hindi isang JSON object");
  }

  const record = value as Record<string, unknown>;

  if (!isNonEmptyString(record.summary)) {
    throw new Error('missing o empty ang "summary" string');
  }

  if (!isStringArray(record.recommendations)) {
    throw new Error('ang "recommendations" ay dapat array ng strings');
  }

  if (!Array.isArray(record.terms)) {
    throw new Error('ang "terms" ay dapat array');
  }

  const terms = record.terms.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`ang "terms[${index}]" ay dapat object`);
    }

    const term = item as Record<string, unknown>;

    for (const field of ["id", "term", "definition"] as const) {
      if (!isNonEmptyString(term[field])) {
        throw new Error(
          `ang "terms[${index}].${field}" ay dapat non-empty string`,
        );
      }
    }

    return {
      id: term.id as string,
      term: term.term as string,
      definition: term.definition as string,
    };
  });

  return {
    summary: record.summary,
    recommendations: record.recommendations,
    terms,
  };
};

const parseGroqAnalysis = (raw: string): GroqAnalysis => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch (error) {
    throw new Error(`invalid JSON (${(error as Error).message})`);
  }

  return validateGroqAnalysis(parsed);
};

const buildRetryPrompt = (reason: string): string =>
  `HINDI TINANGGAP ang naunang sagot. Problema: ${reason}

Ibalik muli ang sagot bilang VALID JSON lamang na may eksaktong format:

{
  "summary": "string",
  "recommendations": ["string"],
  "terms": [{ "id": "string", "term": "string", "definition": "string" }]
}

Tandaan:
- Walang Markdown code fences, walang paliwanag sa labas ng JSON.
- Ang "summary" ay non-empty string.
- Ang "recommendations" at "terms" ay arrays, kahit walang laman.
- Bawat term object ay may non-empty string na id, term, at definition lamang.
- I-escape nang tama ang quotation marks at huwag maglagay ng trailing commas.
- Kung tama naman ang content, ituwid lamang ang format.`;

const EMPTY_RESPONSE_PROMPT = `Walang laman ang nauna mong sagot. 
Ibalik muli ang analysis bilang VALID JSON lamang na may "summary" (string),
"recommendations" (array ng strings), at "terms" (array ng { id, term, definition }).`;

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
  ): Promise<GroqAnalysis | null> => {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(detectionResult),
      },
    ];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const content = await this.groq.chat.completions.create({
        messages,
        model: "openai/gpt-oss-120b",
        response_format: {
          type: "json_object",
        },
      });

      const responseContent = content.choices[0]?.message.content;

      if (!responseContent?.trim()) {
        console.log(
          `Groq returned an empty response (attempt ${attempt}/${MAX_ATTEMPTS})`,
        );

        if (attempt < MAX_ATTEMPTS) {
          messages.push({ role: "user", content: EMPTY_RESPONSE_PROMPT });
        }

        continue;
      }

      try {
        return parseGroqAnalysis(responseContent);
      } catch (error) {
        const reason = (error as Error).message;

        console.log(
          `Groq response failed validation (attempt ${attempt}/${MAX_ATTEMPTS}): ${reason}`,
        );
        console.log("Groq raw response:");
        console.log(responseContent);

        if (attempt < MAX_ATTEMPTS) {
          messages.push(
            { role: "assistant", content: responseContent },
            { role: "user", content: buildRetryPrompt(reason) },
          );
        }
      }
    }

    console.log(
      `Groq failed to return a valid analysis after ${MAX_ATTEMPTS} attempts`,
    );

    return null;
  };
}

export const groqClient = new GroqClient();
