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

export interface Lead {
  id: string;
  companyName: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  instagram?: string;
  status: 'Pendente' | 'Contatado' | 'Qualificado' | 'Desqualificado';
  priority?: "Alta" | "Média" | "Baixa";
}

export async function getLeadsBySearch(query: string, location: string, page: number = 0) {
  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GOOGLE_PLACES_API_KEY;
  
  // Variação de query para busca profunda (Deep Search)
  const relatedTerms = ["", "contato", "unidade", "serviços", "telefone", "endereço", "site oficial", "instagram"];
  const variation = relatedTerms[page % relatedTerms.length];
  const enhancedQuery = variation ? `${query} ${variation}` : query;

  if (!apiKey || apiKey === 'your-api-key') {
    return [{
      id: crypto.randomUUID(), companyName: `Billionaire Example ${page}`, address: "São Paulo, SP",
      website: "https://example.com", phone: "11-99999-9999", instagram: "https://instagram.com/exemplo",
      status: "Pendente" as const, priority: "Alta" as const
    }];
  }

  // ESTRATÉGIA NO-API (Billionaire Shadow): Pesquisa + Gemini Parser
  const rawHtml = await fetchSearchAlternative(enhancedQuery, location);
  
  if (!rawHtml || rawHtml.length < 500) {
    console.warn("[Billionaire Shadow] Nenhuma fonte retornou dados utilizáveis.");
    return [];
  }

  const prompt = `
    CONTEXTO: Robô de Prospecção de Elite (Billionaire Maps Mode).
    OBJETIVO: Localizar empresas do nicho "${query}" em "${location}" usando o GOOGLE MAPS / GOOGLE MEU NEGÓCIO.
    
    INSTRUÇÕES:
    1. Use a ferramenta de busca para varrer o Google Maps na região solicitada.
    2. Extraia até 15 empresas reais com dados atualizados.
    3. Foque em: Nome, Endereço Completo, Website Oficial, Telefone/WhatsApp (FORMATO: +55...), Email e Instagram.
    4. REGRAS DE REDES SOCIAIS: Extraia o link do Instagram/Facebook APENAS se ele for oficial.
    5. Priorize leads que possuem telefone e site.

    JSON FORMAT:
    [{"companyName": "...", "address": "...", "website": "...", "phone": "...", "email": "...", "instagram": "...", "facebook": "...", "status": "Pendente"}]
  `;

  try {
    const cleanKey = apiKey.trim();
    const modelName = "gemini-2.5-flash";
    const apiVer = "v1beta"; 

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/${apiVer}/models/${modelName}:generateContent?key=${cleanKey}`;
      console.log(`[Billionaire Maps] Ativando ${modelName} com Google Search Grounding...`);
      
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }] 
        }),
        signal: AbortSignal.timeout(60000) // 1 minuto de timeout para busca profunda
      });

      const data = await response.json();
      
      if (response.ok && !data.error) {
        const text = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          try {
            const leads = JSON.parse(jsonMatch[0]);
            console.log(`[Billionaire Maps] Sucesso! ${leads.length} leads de alta fidelidade.`);
            return leads.map((l: any) => ({ ...l, id: crypto.randomUUID(), status: 'Pendente' as const }));
          } catch (e) {
            console.warn("[Gemini JSON Parse Error]", e);
          }
        }
      } else {
        console.error("[Gemini API Error]", data.error || "Unknown Error");
      }
    } catch (e) {
      console.error("[Billionaire Maps Logic Error]", e);
    }
  } catch (error: any) { console.error("[Billionaire Shadow Error]", error); }

  // 3. FALLBACK "ULTRA-RESILIENT": Scraper Baseado em Estrutura (Links + Blocos)
  console.log("[Fallback] Iniciando Extração Ultra-Resiliente (Sem dependência de CSS)...");
  const $ = cheerio.load(rawHtml);
  const manualLeads: any[] = [];
  
  // Estratégia: Procurar por blocos que contenham links externos (potenciais sites de empresas)
  $('a').each((i: number, el: any) => {
    if (manualLeads.length >= 15) return;
    
    const url = $(el).attr('href') || "";
    // Ignorar links internos de grandes portais
    if (!url.startsWith('http') || url.includes('google.com') || url.includes('bing.com') || url.includes('duckduckgo.com') || url.includes('microsoft.com')) return;
    
    // Pegar o container pai mais próximo que pareça um resultado de busca
    const container = $(el).closest('div, li, section');
    const text = container.text().trim();
    const name = $(el).text().trim() || container.find('h2, h3').first().text().trim();
    
    if (name && name.length > 3 && url.length > 5 && text.length > 50) {
      // Evitar duplicatas por URL
      if (manualLeads.some(l => l.website === url)) return;

      manualLeads.push({
        id: crypto.randomUUID(),
        companyName: name.split(' - ')[0].split(' | ')[0].trim(),
        address: text.substring(0, 150).replace(/\n/g, ' ') + "...",
        website: url,
        phone: text.match(/(\d{2})?\s?9?\d{4}-?\d{4}/)?.[0] || "Consultar Website",
        email: text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || null,
        instagram: text.includes("instagram.com") ? "Ver no site" : null,
        status: 'Pendente' as const,
        priority: "Média" as const
      });
    }
  });

  console.log(`[Fallback] Concluído! ${manualLeads.length} leads capturados via varredura estrutural.`);
  return manualLeads;
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado' | 'Qualificado' | 'Desqualificado') {
  return await db.update(leads)
    .set({ status })
    .where(eq(leads.id, id))
    .returning();
}

export async function enrichLeadData(id: string, website: string | null, instagram: string | null) {
  let foundData: any = null;

  // 1. Tentar Varredura no Website (se existir)
  if (website && website.startsWith('http')) {
    try {
      console.log(`[Ghost Scraper] Varrendo Website: ${website}`);
      const response = await fetch(website, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        next: { revalidate: 3600 }
      });
      
      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        $('script, style, nav, footer').remove();
        const cleanText = $('body').text().slice(0, 8000);

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Analise o texto do site e encontre: 1. WhatsApp/Telefone, 2. Email, 3. Instagram. Texto: ${cleanText}. Retorne APENAS JSON: {"phone": "...", "email": "...", "instagram": "..."}`;
        const result = await model.generateContent(prompt);
        foundData = JSON.parse(result.response.text().replace(/```json|```/g, ""));
      }
    } catch (e) { console.error("[Ghost Scraper Website Error]", e); }
  }

  // 2. Tentar Varredura no Instagram (se o site falhou ou não tinha WhatsApp)
  if ((!foundData?.phone) && instagram) {
    try {
      console.log(`[Ghost Scraper] Varrendo Instagram: ${instagram}`);
      // Como não podemos fazer scrape direto do IG facilmente, usamos uma busca pública refinada
      const igHandle = instagram.split('/').pop()?.replace('@', '');
      const igSearchHtml = await fetchSearchAlternative(`instagram ${igHandle} whatsapp telefone contato`, "");
      
      if (igSearchHtml) {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Extraia o WHATSAPP/TELEFONE deste snippet de perfil do Instagram: ${igSearchHtml.substring(0, 5000)}. Retorne APENAS JSON: {"phone": "..."}`;
        const result = await model.generateContent(prompt);
        const igData = JSON.parse(result.response.text().replace(/```json|```/g, ""));
        if (igData.phone) {
          foundData = { ...foundData, phone: igData.phone };
        }
      }
    } catch (e) { console.error("[Ghost Scraper Instagram Error]", e); }
  }

  if (foundData && (foundData.phone || foundData.instagram || foundData.email)) {
    await db.update(leads)
      .set({ 
        phone: foundData.phone || undefined, 
        email: foundData.email || null,
        instagram: foundData.instagram || instagram || null,
        status: 'Qualificado' 
      })
      .where(eq(leads.id, id));
    return foundData;
  }
  return null;
}
