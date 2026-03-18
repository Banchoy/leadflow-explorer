"use client";

import { useState } from "react";
import { SearchForm } from "@/components/search-form";
import { ResultsTable } from "@/components/results-table";
import { getLeadsBySearch, updateLeadStatus } from "./actions/leads";
import { useUser } from "@clerk/nextjs";

interface Lead {
  id: string;
  companyName: string;
  address: string | null;
  website: string | null;
  phone: string | null;
  status: 'Pendente' | 'Contatado';
}

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string, location: string) => {
    setIsLoading(true);
    try {
      const results = await getLeadsBySearch(query, location);
      setLeads(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContact = (lead: Lead) => {
    if (!lead.phone) return;
    
    const message = encodeURIComponent("Olá, bom dia!");
    const whatsappUrl = `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${message}`;
    
    window.open(whatsappUrl, "_blank");
    
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'Contatado' } : l));
    
    // In a real app, we would update the DB here
    // updateLeadStatus(lead.id, 'Contatado');
  };

  if (!isLoaded) return null;

  return (
    <main className="min-h-screen bg-background p-4 md:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
              LeadFlow <span className="text-primary">Explorer</span>
            </h1>
            <p className="text-muted-foreground mt-1">Busque leads qualificados em segundos.</p>
          </div>
          {isSignedIn && (
            <div className="flex items-center gap-3 bg-white p-2 rounded-full shadow-sm border px-4">
              <span className="text-sm font-medium">Olá, {user.firstName}</span>
            </div>
          )}
        </header>

        <section>
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              Resultados da Busca
              {leads.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {leads.length} encontrados
                </span>
              )}
            </h2>
          </div>
          <ResultsTable leads={leads} onContact={handleContact} />
        </section>
      </div>
    </main>
  );
}
