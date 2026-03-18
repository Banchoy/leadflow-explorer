"use server";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from 'cheerio';

async function fetchSearchData(query: string, location: string) {
  // Using DuckDuckGo HTML version for easier scraping
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' ' + location + ' telefone endereço')}`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) return "Erro ao buscar dados externos.";
    return await response.text();
  } catch (error) {
    return "Falha na conexão de busca.";
  }
}

export async function getLeadsBySearch(query: string, location: string) {
  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY;
  
  if (!apiKey || apiKey === 'your-api-key') {
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
    // Stage 1: Get raw search data
    console.log(`Billionaire Shadow: Buscando dados brutos para ${query}...`);
    const rawHtml = await fetchSearchData(query, location);
    
    // Stage 2: Let Gemini parse the mess
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Aja como um analista de dados. Abaixo está o HTML/texto de uma busca por empresas de "${query}" em "${location}".
      Extraia até 10 leads reais deste texto.
      
      Dados Necessários:
      - Nome da Empresa
      - Endereço Completo
      - Telefone (extraia dos snippets de busca)
      - Website

      RETORNE APENAS UM ARRAY JSON VÁLIDO NO FORMATO:
      [
        {
          "id": "gerar-uuid",
          "companyName": "Nome",
          "address": "Endereço",
          "website": "URL ou null",
          "phone": "Telefone ou null",
          "status": "Pendente"
        }
      ]

      TEXTO DE BUSCA:
      ${rawHtml.substring(0, 5000)} // Limiting to avoid token overflow
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const jsonStart = responseText.indexOf('[');
    const jsonEnd = responseText.lastIndexOf(']');
    
    if (jsonStart === -1 || jsonEnd === -1) return [];

    const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
    const leads = JSON.parse(jsonString);
    
    return leads.map((l: any) => ({
      ...l,
      id: l.id || crypto.randomUUID(),
      status: 'Pendente' as const
    }));
  } catch (error) {
    console.error("Erro na busca híbrida:", error);
    return [];
  }
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado') {
  return await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
}
