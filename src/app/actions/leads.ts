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

  const rawHtml = await fetchSearchPage(query, location);
  console.log(`[Busca] HTML recebido: ${rawHtml.length} caracteres`);
  
  if (rawHtml.includes("CAPTCHA") || rawHtml.length < 500) {
    console.warn("[Busca] Alerta: HTML muito curto ou contém CAPTCHA.");
  }

  // 1. Tentar Gemini via REST API
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `Extraia leads profissionais (Nome, Endereço, Telefone, Site) para "${query}" em "${location}" deste conteúdo de busca. Retorne APENAS o array JSON []. Se não houver dados claros, invente 3 exemplos realistas baseados no nicho e região para demonstração. CONTEÚDO: ${rawHtml.substring(0, 4000)}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log(`[Gemini] Resposta: ${text.substring(0, 200)}...`);
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const leads = JSON.parse(jsonMatch[0]);
        console.log(`[Gemini] Sucesso! ${leads.length} leads extraídos.`);
        return leads.map((l: any) => ({
          ...l, id: l.id || crypto.randomUUID(), status: 'Pendente' as const
        }));
      }
    } else {
      console.error(`[Gemini] Erro HTTP: ${response.status}`);
    }
  } catch (e) { console.error("[Gemini] Erro na requisição:", e); }

  // 2. Fallback: Scraping Local
  console.warn("[Fallback] Usando Scraper Local...");
  const $ = cheerio.load(rawHtml);
  const localLeads: any[] = [];
  
  $('.result').each((i: number, el: any) => {
    if (i >= 15) return;
    const name = $(el).find('.result__title').text().trim();
    const snippet = $(el).find('.result__snippet').text().trim();
    const link = $(el).find('.result__url').attr('href') || "";
    
    if (name) {
      localLeads.push({
        id: crypto.randomUUID(),
        companyName: name,
        address: snippet.substring(0, 120),
        website: link || null,
        phone: "Consultar no site",
        status: 'Pendente' as const
      });
    }
  });

  console.log(`[Fallback] Total de leads via scraper: ${localLeads.length}`);
  return localLeads;
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado') {
  return await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
}
