"use server";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function getLeadsBySearch(query: string, location: string) {
  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY;
  
  if (!apiKey || apiKey === 'your-api-key') {
    console.warn("Google AI Studio Key not configured. Using mock data.");
    return [
      {
        id: crypto.randomUUID(),
        companyName: "Academia Performance (Mock)",
        address: "Av. Paulista, 1000 - São Paulo",
        website: "https://performance.com",
        phone: "+5511999999999",
        status: "Pendente" as const,
      }
    ];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      // Using the Search tool (grounding)
      tools: [
        {
          // @ts-ignore - Some TS versions might not have this tool in types yet
          googleSearch: {},
        },
      ],
    } as any);

    const prompt = `
      Aja como um especialista em prospecção B2B. Sua tarefa é encontrar leads reais e atualizados.
      USE A BUSCA DO GOOGLE (Search) para encontrar empresas do nicho "${query}" na região "${location}".
      
      Importante:
      - Foque em empresas que apareceriam no Google Maps/Meu Negócio.
      - Extraia Nome, Endereço Completo e TELEFONE (preferencialmente celular/WhatsApp).
      - Retorne no máximo 15 resultados.

      FORMATO OBRIGATÓRIO (retorne APENAS o JSON, sem explicações):
      [
        {
          "id": "string-unica",
          "companyName": "Nome da Empresa",
          "address": "Endereço Completo",
          "website": "URL ou null",
          "phone": "Telefone ou null",
          "status": "Pendente"
        }
      ]
    `;

    console.log(`Iniciando busca Gemini para: ${query} em ${location}`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log("Resposta bruta do Gemini:", responseText);
    
    // Clean JSON response (look for the first [ and the last ])
    const firstBracket = responseText.indexOf('[');
    const lastBracket = responseText.lastIndexOf(']');
    
    if (firstBracket === -1 || lastBracket === -1) {
      console.error("Gemini não retornou um formato JSON válido.");
      return [];
    }

    const jsonString = responseText.substring(firstBracket, lastBracket + 1);
    const leads = JSON.parse(jsonString);
    console.log(`Sucesso! Encontrados ${leads.length} leads.`);
    return leads;
  } catch (error: any) {
    console.error("Falha na busca do Gemini:", error.message || error);
    return [];
  }
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado') {
  return await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
}
