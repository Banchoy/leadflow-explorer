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
      Encontre uma lista de até 15 empresas (leads) para o nicho "${query}" na localização "${location}" no Brasil.
      Para cada empresa, retorne:
      1. Nome da empresa
      2. Endereço completo
      3. Telefone (se disponível, priorizando celular/WhatsApp)
      4. Website (se disponível)

      Retorne APENAS um array JSON válido no seguinte formato, sem explicações:
      [
        {
          "id": "gerar um id único aqui",
          "companyName": "Nome",
          "address": "Endereço",
          "website": "URL ou null",
          "phone": "Telefone ou null",
          "status": "Pendente"
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean JSON response (Markdown blocks)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Gemini failed to return valid JSON:", responseText);
      return [];
    }

    const leads = JSON.parse(jsonMatch[0]);
    return leads;
  } catch (error) {
    console.error("Gemini search failed:", error);
    // Silent return to avoid UI crash, error state handled in Home
    return [];
  }
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado') {
  return await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
}
