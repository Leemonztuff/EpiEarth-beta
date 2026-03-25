
import { GoogleGenAI, Type } from "@google/genai";
import { TerrainType } from "../types";

// BIBLIA DE LORE
const LORE_SYSTEM_INSTRUCTION = `
Eres el "Loreweaver" de Aethelgard, un mundo de fantasía táctica oscura fracturado por el Gran Desgarro.
REGLAS DE MUNDO:
1. El Gran Desgarro: Los Fragmentos de Eternum mantienen la realidad. Sin ellos, el mundo cae al Vacío.
2. La Marea del Eclipse (Noche): El Vacío se filtra. Los enemigos son agresivos y surgen sombras.
3. El Vacío: Dimensión espejo corrupta de dolor y entropía.
4. Tono: Gótico, épico, melancólico. Lenguaje evocador.
`;

export const GeminiService = {
    getAI: () => new GoogleGenAI({ apiKey: process.env.API_KEY }),

    generateBattleFlavor: async (biome: string, enemies: string[], dimension: string, isNight: boolean): Promise<string> => {
        try {
            const ai = GeminiService.getAI();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: LORE_SYSTEM_INSTRUCTION },
                contents: `Describe combate en ${biome} contra ${enemies.join(', ')}. Contexto: ${dimension}, ${isNight ? 'noche' : 'dia'}. 2 frases góticas.`,
            });
            return response.text || "El metal chocará contra el horror.";
        } catch (e) {
            return "El destino se decide ahora.";
        }
    },

    generateAmbushFlavor: async (biome: string, isNight: boolean): Promise<string> => {
        try {
            const ai = GeminiService.getAI();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: LORE_SYSTEM_INSTRUCTION },
                contents: `Aviso de emboscada en ${biome}. Noche: ${isNight}. 1 frase aterradora.`,
            });
            return response.text || "¡Te han rodeado!";
        } catch (e) {
            return "¡Emboscada!";
        }
    },

    generateNPCDialogue: async (npcName: string, role: string, region: string, currentQuests: string[], isNight: boolean): Promise<string> => {
        try {
            const ai = GeminiService.getAI();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: LORE_SYSTEM_INSTRUCTION },
                contents: `NPC: ${npcName} (${role}) en ${region}. Misiones: ${currentQuests.join(', ')}. Noche: ${isNight}. Saludo corto de fantasía oscura.`,
            });
            return response.text || "Mantente lejos de las sombras.";
        } catch (e) {
            return "El mundo se desmorona...";
        }
    },

    generateMapStructure: async (type: '2D' | '3D', params: { prompt: string, biome: string, complexity: number }) => {
        const is3D = type === '3D';
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                mapName: { type: Type.STRING },
                loreSnippet: { type: Type.STRING },
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
            const ai = GeminiService.getAI();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: LORE_SYSTEM_INSTRUCTION,
                    responseMimeType: "application/json",
                    responseSchema: responseSchema as any
                },
                contents: `Diseña ${is3D ? 'arena táctica' : 'mapa de exploración'}. Prompt: ${params.prompt}. Bioma: ${params.biome}. Refleja el Gran Desgarro.`
            });
            return JSON.parse(response.text || "{}");
        } catch (e) {
            return null;
        }
    }
};
