"use server";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

import * as cheerio from 'cheerio';

export async function getLeadsBySearch(query: string, location: string) {
  const searchUrl = `https://cnpj.biz/procura/${encodeURIComponent(query + ' ' + location)}`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    if (!response.ok) {
      console.error(`Scraper failed with status: ${response.status}`);
      // Fallback to a mock result or error
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const leadsList: any[] = [];

    $('.item').each((_, element) => {
      const companyName = $(element).find('h2').text().trim();
      const address = $(element).find('p').first().text().trim();
      
      if (companyName) {
        leadsList.push({
          id: crypto.randomUUID(),
          companyName,
          address,
          website: null,
          phone: null,
          status: 'Pendente' as const,
        });
      }
    });

    // If CNPJ.biz fails to return items, try a fallback structure
    if (leadsList.length === 0) {
      console.warn("No leads found with current selector. Possible structure change or block.");
    }

    return leadsList.slice(0, 10);
  } catch (error) {
    console.error("Scraper encountered an error:", error);
    return [];
  }
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado') {
  return await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
}
