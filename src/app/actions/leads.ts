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
    // Modelos para tentar em sequência caso dê 404
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro"];
    const apiVersions = ["v1beta", "v1"];
    
    let lastError = "";
    console.log(`[Gemini] Validando chave API (Início: ${apiKey.substring(0, 7)}...)`);

    for (const apiVer of apiVersions) {
      for (const modelName of modelsToTry) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/${apiVer}/models/${modelName}:generateContent?key=${apiKey}`;
          
          console.log(`[Gemini] Tentando: ${apiVer}/${modelName}...`);
          
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          const data = await response.json();
          
          if (response.ok && !data.error) {
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const leads = JSON.parse(jsonMatch[0]);
              console.log(`[Gemini] Sucesso com ${modelName}! ${leads.length} leads extraídos.`);
              return leads.map((l: any) => ({
                ...l,
                id: crypto.randomUUID(),
                status: 'Pendente' as const
              }));
            }
          } else {
            lastError = data.error?.message || `Status ${response.status}`;
            if (response.status !== 404) break; // Se não for 404, o erro é outro (ex: quota), não adianta mudar modelo
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }
    }
    console.error("[Gemini] Todas as tentativas de modelo falharam:", lastError);
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
