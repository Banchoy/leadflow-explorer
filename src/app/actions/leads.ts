"use server";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from 'cheerio';

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

  // DEFINITIVE FIX: Use Gemini with Google Search Grounding to avoid local network blocks
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        role: "user",
        parts: [{
          text: `Aja como um especialista em prospecção (Billionaire Shadow Mode).
          USE A FERRAMENTA DE BUSCA DO GOOGLE integrada para encontrar leads reais de "${query}" em "${location}".
          Extraia Nome, Endereço Completo, Telefone (WhatsApp) e Website.
          
          Retorne APENAS um array JSON válido:
          [{"id": "uuid", "companyName": "...", "address": "...", "website": "...", "phone": "...", "status": "Pendente"}]
          `
        }]
      }],
      tools: [{
        // @ts-ignore - Standard Gemini Search tool name
        google_search_retrieval: {
          dynamic_retrieval_config: {
            mode: "MODE_DYNAMIC",
            dynamic_threshold: 0.1
          }
        }
      }]
    };

    console.log(`[Billionaire Shadow] Iniciando busca via Search Grounding para: ${query}`);
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("[Gemini API Error]", JSON.stringify(data.error));
      throw new Error(data.error.message);
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("[Gemini Response Data]", responseText.substring(0, 100));

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const leads = JSON.parse(jsonMatch[0]);
      return leads.map((l: any) => ({
        ...l, 
        id: l.id || crypto.randomUUID(), 
        status: 'Pendente' as const
      }));
    }
    
    console.warn("Gemini não encontrou leads via Grounding, tentando extração forçada...");
    return [];
  } catch (error: any) {
    console.error("[Search Error]", error.message || error);
    return [];
  }
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado') {
  return await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
}
