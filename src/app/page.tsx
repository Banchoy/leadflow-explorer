"use client";

import { useState } from "react";
import { SearchForm } from "@/components/search-form";
import { ResultsTable } from "@/components/results-table";
import { getLeadsBySearch, updateLeadStatus } from "./actions/leads";
import { useUser, SignInButton } from "@clerk/nextjs";
import { TrendingUp, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string, location: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await getLeadsBySearch(query, location);
      setLeads(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateStatus(id: string, status: Lead['status']) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    await updateLeadStatus(id, status);
  }

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 selection:bg-emerald-500/30">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] transform hover:rotate-6 transition-transform">
              <TrendingUp className="h-8 w-8 text-slate-950" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                LeadFlow <span className="text-emerald-400">Explorer</span>
              </h1>
              <p className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase">Billionaire Shadow Edition</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/40 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-sm">
            {isLoaded && !isSignedIn ? (
              <div className="flex items-center gap-4 px-3">
                <span className="text-xs font-bold text-slate-500 uppercase">Acesso Restrito</span>
                <SignInButton mode="modal">
                  <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase px-6 rounded-xl transition-all">
                    Conectar Google
                  </Button>
                </SignInButton>
              </div>
            ) : isSignedIn ? (
              <div className="flex items-center gap-3 px-3">
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">PRO PLAN</p>
                  <p className="text-xs font-bold text-slate-200">{user?.firstName || "Usuário"}</p>
                </div>
                <div className="h-9 w-9 rounded-full border-2 border-emerald-500/50 p-0.5">
                  <img src={user?.imageUrl} className="h-full w-full rounded-full object-cover" alt="User" />
                </div>
              </div>
            ) : (
              <div className="h-8 w-32 animate-pulse bg-slate-800 rounded-xl" />
            )}
          </div>
        </header>

        <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        </section>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-sm flex items-center justify-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="flex items-center justify-between mb-6 px-4">
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Resultados de Inteligência
            </h2>
            <p className="text-[10px] font-bold text-slate-500">{leads.length} OPORTUNIDADES IDENTIFICADAS</p>
          </div>
          <ResultsTable leads={leads} onUpdateStatus={handleUpdateStatus} />
        </section>
      </div>
    </main>
  );
}
