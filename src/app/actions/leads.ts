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
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey || apiKey === 'your-api-key') {
    return [{
      id: crypto.randomUUID(), companyName: "Lead Demonstrativo", address: "São Paulo, SP",
      website: "https://exemplo.com", phone: "11-99999-9999", status: "Pendente" as const,
    }];
  }

  // ESTRATÉGIA OFICIAL: Google Places API (New) - Texto Search
  try {
    const googleUrl = `https://places.googleapis.com/v1/places:searchText`;
    
    const body = {
      textQuery: `${query} em ${location}`,
      languageCode: "pt-BR",
      maxResultCount: 15
    };

    console.log(`[Google Maps] Iniciando busca oficial para: ${query} em ${location}`);
    
    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Requisitando os campos específicos que queremos
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Google API Error]", JSON.stringify(errorData));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const places = data.places || [];
    
    console.log(`[Google Maps] Sucesso! ${places.length} locais encontrados.`);

    return places.map((p: any) => ({
      id: p.id || crypto.randomUUID(),
      companyName: p.displayName?.text || "Sem Nome",
      address: p.formattedAddress || "Endereço não informado",
      website: p.websiteUri || null,
      phone: p.nationalPhoneNumber || null,
      status: 'Pendente' as const
    }));

  } catch (error: any) {
    console.error("[Google Search Error]", error.message || error);
    // Fallback silencioso (retorna vazio para o UI lidar)
    return [];
  }
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado') {
  return await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
}
