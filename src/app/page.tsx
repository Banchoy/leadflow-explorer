"use client";

import { useState } from "react";
import { SearchForm } from "@/components/search-form";
import { ResultsTable } from "@/components/results-table";
import { getLeadsBySearch, updateLeadStatus, enrichLeadData } from "./actions/leads";
import { useUser, SignInButton } from "@clerk/nextjs";
import { TrendingUp, Search, MapPin, FastForward, PlayCircle, Loader2 } from "lucide-react";
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [campaignIndex, setCampaignIndex] = useState<number | null>(null);
  const [campaignMessage, setCampaignMessage] = useState("Olá {EMPRESA}, vi seu perfil no Google e achei seu trabalho fantástico! Gostaria de conversar sobre uma parceria.");
  const [error, setError] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState({ query: "", location: "" });

  const handleSearch = async (query: string, location: string) => {
    setIsLoading(true);
    setPage(0);
    setError(null);
    setLastSearch({ query, location });
    try {
      const results = await getLeadsBySearch(query, location, 0);
      setLeads(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev: string[]) => 
      prev.length === leads.length ? [] : leads.map((l: Lead) => l.id)
    );
  };

  const startCampaign = () => {
    if (selectedIds.length === 0) return;
    setCampaignIndex(0);
    sendCurrentCampaignLead(0, true); // true = force new popup
  };

  const sendCurrentCampaignLead = (index: number, isInitial: boolean = false) => {
    const selectedLeads = leads.filter((l: Lead) => selectedIds.includes(l.id));
    const lead = selectedLeads[index];
    if (!lead || !lead.phone) return;

    const text = campaignMessage.replace(/{EMPRESA}/g, lead.companyName);
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const url = `https://web.whatsapp.com/send?phone=${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}&text=${encodeURIComponent(text)}`;
    
    // Configuração do Popup
    const features = "width=800,height=900,status=no,resizable=yes,scrollbars=yes";
    
    if (isInitial) {
      window.open(url, 'wa-campaign', features);
    } else {
      // Reutiliza a mesma janela chamada 'wa-campaign'
      window.open(url, 'wa-campaign');
    }
  };

  const nextCampaignLead = () => {
    if (campaignIndex === null) return;
    const nextIndex = campaignIndex + 1;
    if (nextIndex < selectedIds.length) {
      setCampaignIndex(nextIndex);
      sendCurrentCampaignLead(nextIndex);
    } else {
      setCampaignIndex(null);
    }
  };

  async function handleEnrich(id: string, website: string) {
    const data = await enrichLeadData(id, website);
    if (data) {
      setLeads((prev: Lead[]) => prev.map((l: Lead) => l.id === id ? { 
        ...l, 
        phone: data.phone || l.phone, 
        instagram: data.instagram || l.instagram,
        email: data.email || l.email, 
        status: 'Qualificado' 
      } : l));
    }
  }

  const handleLoadMore = async () => {
    if (!lastSearch.query) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const moreLeads = await getLeadsBySearch(lastSearch.query, lastSearch.location, nextPage);
      
      // Deduplicação básica por nome
      setLeads((prev: Lead[]) => {
        const existingNames = new Set(prev.map((l: Lead) => l.companyName.toLowerCase()));
        const uniqueNew = moreLeads.filter((l: Lead) => !existingNames.has(l.companyName.toLowerCase()));
        return [...prev, ...uniqueNew];
      });
      
      setPage(nextPage);
    } catch (error) {
      console.error("Load more failed:", error);
    } finally {
      setIsLoadingMore(false);
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

        {selectedIds.length > 0 && (
          <section className="mb-12 animate-in zoom-in-95 duration-500">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-[2rem] backdrop-blur-md">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                <div>
                  <h3 className="text-xl font-black text-emerald-400 uppercase italic">Campanha Billionaire</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{selectedIds.length} leads selecionados para ataque</p>
                </div>
                
                {campaignIndex !== null ? (
                  <div className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-2xl border border-emerald-500/30">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">PROGRESSO</p>
                      <p className="text-sm font-bold text-white">{campaignIndex + 1} de {selectedIds.length}</p>
                    </div>
                    <Button 
                      onClick={nextCampaignLead}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs px-6 h-10 rounded-lg shadow-lg"
                    >
                      Próximo Alvo <FastForward className="ml-2 h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setCampaignIndex(null)}
                      className="text-slate-500 hover:text-white text-[10px] uppercase font-bold"
                    >
                      Parar
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={startCampaign}
                    className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black uppercase text-sm px-10 h-14 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all hover:scale-105 flex items-center gap-2"
                  >
                    <PlayCircle className="h-5 w-5" />
                    Iniciar Sequência de Ataque 🚀
                  </Button>
                )}
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Script de Vendas IA (Template)</label>
                <div className="relative">
                  <textarea 
                    value={campaignMessage}
                    onChange={(e) => setCampaignMessage(e.target.value)}
                    className="w-full bg-slate-950/80 border-2 border-slate-800 rounded-2xl p-4 text-slate-200 text-sm focus:border-emerald-500/50 focus:outline-none min-h-[100px] font-medium"
                    placeholder="Use {EMPRESA} para personalizar..."
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-600 uppercase">Dica: use &#123;EMPRESA&#125;</div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="flex items-center justify-between mb-6 px-4">
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Resultados de Inteligência
            </h2>
            <p className="text-[10px] font-bold text-slate-500">{leads.length} OPORTUNIDADES IDENTIFICADAS</p>
          </div>
          <ResultsTable 
            leads={leads} 
            onUpdateStatus={handleUpdateStatus} 
            onEnrich={handleEnrich}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleSelectAll}
          />
          
          {leads.length > 0 && (
            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                variant="outline"
                className="bg-slate-900/50 border-slate-700 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 px-8 py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95"
              >
                {isLoadingMore ? (
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    Deep Search em andamento...
                  </div>
                ) : (
                  "Expandir Varredura (Mais Leads)"
                )}
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
