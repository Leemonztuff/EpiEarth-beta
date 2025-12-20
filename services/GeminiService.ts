
import { GoogleGenAI, Type } from "@google/genai";
import { TerrainType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// BIBLIA DE LORE: Instrucción de sistema centralizada
const LORE_SYSTEM_INSTRUCTION = `
Eres el "Loreweaver" de Aethelgard, un mundo de fantasía táctica oscura fracturado por el Gran Desgarro.
REGLAS DE MUNDO:
1. El Gran Desgarro: Los Fragmentos de Eternum son lo único que mantiene la realidad unida. Sin ellos, el mundo cae al Vacío.
2. La Marea del Eclipse (Noche): De noche, el Vacío se filtra. Los enemigos son más agresivos, surgen sombras y no-muertos, y la visibilidad es casi nula.
3. El Vacío (Sombra): Una dimensión espejo corrupta. Todo allí es dolor y entropía.
4. Tono: Gótico, épico, melancólico. Usa un lenguaje evocador ("La sangre de los antiguos", "El susurro del Vacío", "Cenizas del destino").
5. Cohesión: No menciones cosas modernas. Mantente en el género de espada y brujería oscura.
`;

export const GeminiService = {
    /**
     * Genera una descripción atmosférica para el inicio de una batalla basada en el lore.
     */
    generateBattleFlavor: async (biome: string, enemies: string[], dimension: string, isNight: boolean): Promise<string> => {
        try {
            const timeCtx = isNight ? "durante la peligrosa Marea del Eclipse (noche)" : "bajo la luz pálida de Aethelgard";
            const dimCtx = dimension === 'UPSIDE_DOWN' ? "dentro de la pesadilla del Vacío" : "en el reino material fracturado";
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: LORE_SYSTEM_INSTRUCTION },
                contents: `Describe un encuentro de combate:
                Bioma: ${biome}
                Enemigos: ${enemies.join(', ')}
                Contexto: ${dimCtx} ${timeCtx}.
                Limítate a 2 frases cargadas de atmósfera gótica.`,
            });
            return response.text || "El metal chocará contra el horror bajo la mirada de dioses olvidados.";
        } catch (e) {
            return "El destino se decide en este campo de batalla.";
        }
    },

    /**
     * Genera un aviso de emboscada sorprendente basado en la Marea del Eclipse.
     */
    generateAmbushFlavor: async (biome: string, isNight: boolean): Promise<string> => {
        try {
            const context = isNight ? "la Marea del Eclipse ha traído horrores de las sombras" : "bandidos o bestias acechan entre las ruinas";
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: LORE_SYSTEM_INSTRUCTION },
                contents: `Genera una advertencia de 1 frase para una EMBOSCADA en ${biome}. Contexto: ${context}. Debe ser aterrador y repentino.`,
            });
            return response.text || "¡Te han rodeado!";
        } catch (e) {
            return "¡Te han rodeado!";
        }
    },

    /**
     * Genera diálogo dinámico para un NPC que respeta el lore y las misiones.
     */
    generateNPCDialogue: async (npcName: string, role: string, region: string, currentQuests: string[], isNight: boolean): Promise<string> => {
        try {
            const timeCtx = isNight ? "El NPC está aterrorizado por la oscuridad actual." : "El NPC busca esperanza en la luz.";
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: LORE_SYSTEM_INSTRUCTION },
                contents: `NPC: ${npcName} (${role})
                Ubicación: ${region}
                Estado: ${timeCtx}
                Misiones del jugador: ${currentQuests.join(', ')}
                Genera un saludo corto que hable de la fragilidad del mundo o de la amenaza del Vacío.`,
            });
            return response.text || "Mantente alejado de las sombras, viajero.";
        } catch (e) {
            return "Mis labios están sellados por el momento.";
        }
    },

    /**
     * AI ARCHITECT V3: Genera mapas que cuentan una historia del lore.
     */
    generateMapStructure: async (type: '2D' | '3D', params: { prompt: string, biome: string, complexity: number }) => {
        const is3D = type === '3D';
        const terrainList = Object.values(TerrainType).join(', ');
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                mapName: { type: Type.STRING, description: "Un nombre que suene a Aethelgard o al Vacío." },
                loreSnippet: { type: Type.STRING, description: "Una frase breve sobre por qué este lugar es importante en el lore." },
                cells: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: is3D ? {
                            x: { type: Type.NUMBER },
                            z: { type: Type.NUMBER },
                            height: { type: Type.NUMBER },
                            terrain: { type: Type.STRING }
                        } : {
                            q: { type: Type.NUMBER },
                            r: { type: Type.NUMBER },
                            terrain: { type: Type.STRING },
                            poiType: { type: Type.STRING }
                        },
                        required: is3D ? ["x", "z", "height", "terrain"] : ["q", "r", "terrain"]
                    }
                }
            },
            required: ["mapName", "loreSnippet", "cells"]
        };

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: LORE_SYSTEM_INSTRUCTION,
                    responseMimeType: "application/json",
                    responseSchema: responseSchema as any
                },
                contents: `Diseña un área ${is3D ? 'táctica vertical' : 'de exploración'} para el RPG.
                PROMPT DEL JUGADOR: ${params.prompt}
                BIOMA: ${params.biome}
                Asegúrate de que la estructura refleje un mundo fracturado por el Gran Desgarro.`
            });

            return JSON.parse(response.text || "{}");
        } catch (e) {
            console.error("Architect Error:", e);
            return null;
        }
    }
};
