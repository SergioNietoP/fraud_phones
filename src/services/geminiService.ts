import { GoogleGenAI, Type } from "@google/genai";
import { PhoneLookup, HoneypotCall } from "./firebaseService";

let ai: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is missing');
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

export async function lookupPhoneNumber(phone: string): Promise<Omit<PhoneLookup, "createdAt" | "honeypot_call">> {
  const genAI = getGenAI();
  const prompt = `ROL DEL SISTEMA:
Eres un Experto Investigador en identificar a quién pertenecen los números de teléfono en España.
Tu fuente de verdad son los reportes online de usuarios. Tu comunicación debe ser clara, profesional, fácil de entender y no usar jerga técnica en exceso (ej. no uses OSINT, usa "Búsqueda" o "Investigación"). 
Objetivo: ¿A quién pertenece este número? ¿Es legítimo o fraude?

### SIMULACIÓN DE CONTACTO / DIÁLOGO INTERACTIVO
Genera un ejemplo de conversación basado en la forma en que este número actúa. Debe ser un diálogo corto de 4 a 6 mensajes, alternando entre 'Llamante' (el teléfono analizado) y 'Usuario'.
- 'categoria_general': Tipo de actividad muy concisa. DEBE CONTENER 1 o 2 PALABRAS MÁXIMO. REGLA ESTRICTA: 
  - Si es Fraude, un tipo muy conciso (ej. "Robo Datos", "Vishing", "Estafa Bancaria", "Criptomonedas").
  - Si es Otro, una o dos palabras (ej. "Particular", "Desconocido", "Encuesta", "ONG").
- 'nombre_empresa_corto': En caso de ser de tipo "Comercial" debes devolver la compañía exacta (ej. "Vodafone", "Iberdrola", "Naturgy"). Solo el nombre comercial sin SA, SL, etc.
- 'nivel_insistencia': 0 a 100. ¿Llaman constantemente o es puntual?
- 'dialogo_simulado': Lista de objetos evaluando el escenario real si el usuario responde. (Si es contestador, un monólogo).

### SCORES Y PUNTUACIÓN (0-100)
- ratio_reportes_fraude: reportes de estafa / total de quejas (0-100)
- ratio_reportes_legitimo: reportes seguros / total (0-100)
- ratio_seguridad_empresa_legitima: confianza en que es empresa verificada (0-100)
- nivel_sospecha_suplantacion: (0-100)

### REGLAS DE ORO Y PREVENCIÓN DE FALSOS POSITIVOS
1. Diferenciar estrictamente entre SPAM COMERCIAL y FRAUDE: Muchos usuarios reportan "fraude" simplemente porque los llaman mucho (telemarketing). Si el número pertenece a una empresa oficial verificada (ej. operadoras de telefonía como Vodafone, Lowi, Telefónica, o aseguradoras, bancos), DEBES poner 'es_comercial = true', 'fraude_detectado = false', y asume 'ratio_reportes_fraude = 0' y 'nivel_sospecha_suplantacion = 0'. Un "agente pesado" NO es fraude, es SPAM comercial.
2. Si confirmas que es un número oficial (web, listín oficial o número corto tipo 1456, 1004, etc.), 'fraude_detectado' SIEMPRE DEBE SER 'false'.
3. Si no hay datos, asume riesgo muy bajo y ratios 0.
4. INSTRUCCIÓN CRÍTICA DE FUENTES: En el campo 'fuentes_consultadas', devuelve ÚNICAMENTE URLs reales originales (ej: https://www.listaspam.com/telefono/1456). ESTÁ PROHIBIDO devolver URLs de buscadores (como duckduckgo o google). Abre el resultado y copia la URL final.

--- NÚMERO A INVESTIGAR: ${phone} ---
Realiza la búsqueda e identificación para generar el JSON con la estructura indicada.
OBLIGATORIO DEVOLVER SOLO UN OBJETO JSON VÁLIDO. NO USES BLOQUES MARKDOWN (\`\`\`json ... \`\`\`), SOLO EL TEXTO PLANO DEL JSON.
ESTRUCTURA ESPERADA:
{
  "empresa_pertenece_tlf": "string",
  "ratio_seguridad_empresa_legitima": 0,
  "ratio_reportes_fraude": 0,
  "ratio_reportes_legitimo": 0,
  "total_reportes_encontrados": 0,
  "nivel_sospecha_suplantacion": 0,
  "fraude_detectado": false,
  "resumen_uso": "string",
  "fuentes_consultadas": "string",
  "explicacion_tecnica": "string",
  "tipo_amenaza": "string",
  "script_ataque": "string",
  "categoria_general": "string",
  "nivel_insistencia": 0,
  "es_comercial": false,
  "empresa_color_hex": "string",
  "nombre_empresa_corto": "string",
  "dialogo_simulado": [
    { "emisor": "string", "mensaje": "string" }
  ]
}

- es_comercial: true si es una empresa conocida que realiza llamadas (telemarketing, envíos, atención al cliente), false si es fraude o particular.
- empresa_color_hex: Un código de color hexadecimal (ej. #FF9900 para Amazon, #001A70 para Samsung) que represente la identidad de marca de la empresa (busca el color principal en internet o deduce el más icónico). Si no aplica o es una estafa, devuelve "#1b61c9" o el color por defecto.
- nombre_empresa_corto: El nombre de la empresa en 1 o 2 palabras máximo (ej: "Amazon", "Iberdrola", "Vodafone", "Banco Santander").

`;

  const response = await genAI.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  let text = response.text || "{}";
  text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const data = JSON.parse(text);

  return {
    phone,
    ...data
  };
}

export async function executeHoneypotCallSimulated(phone: string, entityContext: string, currentCategory: string | undefined): Promise<Omit<HoneypotCall, "executedAt" | "audio_synthesized">> {
   const genAI = getGenAI();
   const prompt = `ROL DE SISTEMA:
Actúas como el cerebro backend de un sistema de "Asistente de Llamada Inteligente". Vas a SIMULAR una llamada automatizada y detallada al número objetivo para extraer cómo operan.
Objetivo: ${phone} (La Inteligencia previa detectó que podría ser: ${entityContext}).

Instrucciones:
1. Simula el inicio de la llamada donde nuestro Agente IA (Honeypot - Perfil de persona vulnerable) marca e interactúa.
2. Alguien al otro lado contesta. Describe de qué forma realística contesta este tipo de número en España (ej. Robot automatizado, comercial agresivo, scammer indio, operadora cortada...).
3. Crea la transcripción de la llamada real. El Agente IA hará preguntas para sonsacar información.
4. Concluye si la tipología inicial era correcta o si es otra (Por ejemplo, pensábamos que era 'Telemarketing' pero la transcripción revela que es un 'Intento phishing pidiendo tarjetas').

Devuelve un JSON con la estructura indicada.
`;

   const response = await genAI.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
           type: Type.OBJECT,
           properties: {
               transcript: { 
                   type: Type.ARRAY, 
                   items: { 
                       type: Type.OBJECT, 
                       properties: { 
                           emisor: { type: Type.STRING }, 
                           mensaje: { type: Type.STRING } 
                       },
                       required: ["emisor", "mensaje"]
                   } 
               },
               conclusion_llm: { type: Type.STRING },
               nueva_tipologia: { type: Type.STRING }
           },
           required: ["transcript", "conclusion_llm", "nueva_tipologia"]
        }
      }
   });

   const text = response.text || "{}";
   return JSON.parse(text);
}
