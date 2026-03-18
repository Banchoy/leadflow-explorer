"use server";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";

import { GoogleGenerativeAI } from "@google/generative-ai";

async function fetchSearchPage(query: string, location: string) {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' ' + location + ' telefone endereço site')}`;
  try {
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    return response.ok ? await response.text() : "";
  } catch { return ""; }
}

export async function getLeadsBySearch(query: string, location: string) {
  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey || apiKey === 'your-api-key') {
    return [{
      id: crypto.randomUUID(),
      companyName: "Academia Performance (Mock)",
      address: "Av. Paulista, 1000 - São Paulo",
      website: "https://performance.com",
      phone: "+5511999999999",
      status: "Pendente" as const,
    }];
  }

  const rawHtml = await fetchSearchPage(query, location);
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try different models in sequence to avoid 404
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Tentando busca com modelo: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const prompt = `
        Abaixo está o conteúdo de uma busca. Extraia até 10 leads de "${query}" em "${location}".
        Retorne APENAS um array JSON: [{"id": "uuid", "companyName": "...", "address": "...", "website": "...", "phone": "...", "status": "Pendente"}]
        
        CONTEÚDO:
        ${rawHtml.substring(0, 4000)}
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const jsonStart = responseText.indexOf('[');
      const jsonEnd = responseText.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const leads = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
        return leads.map((l: any) => ({
          ...l,
          id: l.id || crypto.randomUUID(),
          status: 'Pendente' as const
        }));
      }
    } catch (err: any) {
      console.error(`Erro no modelo ${modelName}:`, err.message || err);
      lastError = err;
      continue;
    }
  }

  console.error("Todos os modelos Falharam.", lastError);
  return [];
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado') {
  return await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
}
