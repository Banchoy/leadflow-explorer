"use server";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

export async function getLeadsBySearch(query: string, location: string) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey || apiKey === 'your-api-key') {
    console.warn("Google Places API Key not configured. Using mock data.");
    return [
      {
        id: crypto.randomUUID(),
        companyName: "Imobiliária Exemplo (Mock)",
        address: "Rua Exemplo, 123",
        website: "https://exemplo.com",
        phone: "+5511999999999",
        status: "Pendente" as const,
      }
    ];
  }

  try {
    const response = await fetch(GOOGLE_PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.internationalPhoneNumber",
      },
      body: JSON.stringify({
        textQuery: `${query} em ${location}`,
        languageCode: "pt-BR",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Places API Error:", JSON.stringify(errorData, null, 2));
      throw new Error(`Google Places API failure: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.places) return [];

    return data.places.map((place: any) => ({
      id: place.id,
      companyName: place.displayName?.text || "Nome não disponível",
      address: place.formattedAddress,
      website: place.websiteUri || null,
      phone: place.internationalPhoneNumber || null,
      status: "Pendente" as const,
    }));
  } catch (error) {
    console.error("Search failed, attempting fallback or reporting error:", error);
    throw error;
  }
}

export async function saveLead(leadData: typeof leads.$inferInsert) {
  return await db.insert(leads).values(leadData).returning();
}

export async function updateLeadStatus(id: string, status: 'Pendente' | 'Contatado') {
  return await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
}
