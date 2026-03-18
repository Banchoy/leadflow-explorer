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

async function fetchRobustSearch(query: string, location: string) {
  const searchTerm = encodeURIComponent(`${query} ${location} telefone contato`);
  const engines = [
    `https://lite.duckduckgo.com/lite/?q=${searchTerm}`,
    `https://www.bing.com/search?q=${searchTerm}`
  ];

  for (const url of engines) {
    try {
      console.log(`[Busca] Tentando motor: ${url}`);
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
      });
      if (response.ok) {
        const text = await response.text();
        if (text.length > 1000) {
          console.log(`[Busca] Sucesso! HTML de ${text.length} bytes.`);
          return text;
        }
      }
    } catch (e) {
      console.warn(`[Busca] Falha no motor ${url}`);
    }
  }
  return "";
}

export async function getLeadsBySearch(query: string, location: string) {
  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey || apiKey === 'your-api-key') {
    return [{
      id: crypto.randomUUID(), companyName: "Exemplo Bio", address: "São Paulo, SP",
      website: "https://exemplo.com", phone: "11-99999-9999", status: "Pendente" as const,
    }];
  }

  // 1. Tentar Gemini v1beta com Search Grounding
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: `ENCONTRE 10 LEADS REAIS (Nome, Endereço, Fone, Site) para "${query}" em "${location}". Retorne APENAS um array JSON [].` }] }],
      tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0.1 } } }]
    };

    const response = await fetch(geminiUrl, { method: 'POST', body: JSON.stringify(payload) });
    const data = await response.json();
    
    if (response.ok && !data.error) {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]).map((l: any) => ({ ...l, id: l.id || crypto.randomUUID(), status: 'Pendente' as const }));
    }
    console.warn("[Gemini] Search Grounding falhou ou 400, tentando Fallback Híbrido...");
  } catch (e) { console.error("[Gemini] Erro REST:", e); }

  // 2. Fallback Híbrido: Fetch Robusto + Parsing Gemini
  const rawHtml = await fetchRobustSearch(query, location);
  if (rawHtml) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const prompt = `Analise este HTML e extraia leads de "${query}" em "${location}". Retorne apenas JSON []. HTML: ${rawHtml.substring(0, 5000)}`;
      const response = await fetch(geminiUrl, { method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]).map((l: any) => ({ ...l, id: l.id || crypto.randomUUID(), status: 'Pendente' as const }));
    } catch (e) { console.error("[Fallback] Erro Gemini:", e); }
  }

  // 3. Fallback Final: Scraper Local
  const $ = cheerio.load(rawHtml);
  const leads: any[] = [];
  $('.result, .b_algo').each((i: number, el: any) => {
    if (i >= 10) return;
    const name = $(el).find('h2, .result__title').text().trim();
    if (name) leads.push({ id: crypto.randomUUID(), companyName: name, address: "Ver detalhes no site", website: $(el).find('a').attr('href') || null, phone: "Consultar", status: 'Pendente' as const });
  });

  return leads;
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado') {
  return await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
}
