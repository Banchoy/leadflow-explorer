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

async function fetchSearchAlternative(query: string, location: string) {
  const searchTerm = encodeURIComponent(`${query} em ${location} telefone instagram`);
  const sources = [
    `https://lite.duckduckgo.com/lite/?q=${searchTerm}`,
    `https://www.bing.com/search?q=${searchTerm}`,
    `https://www.google.com/search?q=${searchTerm}&num=10&gbv=1` // Google básico (sem JS)
  ];

  for (const url of sources) {
    try {
      console.log(`[Billionaire Shadow] Tentando fonte: ${url}`);
      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      if (response.ok) {
        const text = await response.text();
        if (text.length > 800 && !text.includes("CAPTCHA") && !text.includes("automated access")) {
          console.log(`[Billionaire Shadow] Fonte respondeu com ${text.length} bytes.`);
          return text;
        }
      }
    } catch (e) {
      console.warn(`[Billionaire Shadow] Erro na fonte ${url}`);
    }
  }
  return "";
}

export async function getLeadsBySearch(query: string, location: string) {
  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey || apiKey === 'your-api-key') {
    return [{
      id: crypto.randomUUID(), companyName: "Billionaire Example", address: "São Paulo, SP",
      website: "https://example.com", phone: "11-99999-9999", status: "Pendente" as const,
    }];
  }

  // ESTRATÉGIA NO-API (Billionaire Shadow): Pesquisa + Gemini Parser
  const rawHtml = await fetchSearchAlternative(query, location);
  
  if (!rawHtml || rawHtml.length < 500) {
    console.warn("[Billionaire Shadow] Nenhuma fonte retornou dados utilizáveis.");
    return [];
  }

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `
      CONTEXTO: Robô de Prospecção de Elite (Billionaire Shadow Mode).
      OBJETIVO: Extrair exatamente os leads da busca por "${query}" em "${location}".
      
      INSTRUÇÕES:
      1. Leia o HTML e extraia até 15 empresas.
      2. Foque em: Nome, Endereço, Website, Telefone/WhatsApp (FORMATO: +55...) e Instagram.
      3. Se o telefone não estiver explícito, procure padrões como (XX) 9XXXX-XXXX.
      4. Retorne APENAS o array JSON, sem texto explicativo.

      JSON FORMAT:
      [{"companyName": "...", "address": "...", "website": "...", "phone": "...", "instagram": "...", "status": "Pendente"}]
      
      HTML DA BUSCA:
      ${rawHtml.substring(0, 25000)}
    `;

    console.log(`[Gemini] Enviando ${prompt.length} caracteres para análise...`);
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error("[Gemini Error Body]", JSON.stringify(data.error));
      return [];
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log(`[Gemini Response] Bruto: ${responseText.substring(0, 300)}...`);
    
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const leads = JSON.parse(jsonMatch[0]);
      console.log(`[Billionaire Shadow] ${leads.length} leads extraídos com sucesso!`);
      return leads.map((l: any) => ({
        ...l,
        id: crypto.randomUUID(),
        status: 'Pendente' as const
      }));
    } else {
      console.warn("[Gemini] Não foi possível encontrar um array JSON na resposta.");
    }
  } catch (error: any) {
    console.error("[Billionaire Shadow Error]", error.message || error);
  }

  return [];
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado') {
  return await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
}
