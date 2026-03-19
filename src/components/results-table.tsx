import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, ExternalLink, MapPin, CheckCircle2, XCircle, Mail, Instagram, TrendingUp, Zap } from "lucide-react";
import { Lead } from "@/app/page";

interface ResultsTableProps {
  leads: Lead[];
  onUpdateStatus: (id: string, status: Lead['status']) => void;
  onEnrich: (id: string, website: string | null, instagram: string | null) => Promise<void>;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
}

export function ResultsTable({ leads, onUpdateStatus, onEnrich, selectedIds, onToggleSelect, onToggleAll }: ResultsTableProps) {
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const allSelected = leads.length > 0 && selectedIds.length === leads.length;

  const handleWhatsApp = (phone: string, companyName?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;
    const message = encodeURIComponent(`Olá ${companyName || ''}! Vi seu perfil no LeadFlow e gostaria de conversar sobre seus serviços.`);
    const url = `https://web.whatsapp.com/send?phone=${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}&text=${message}`;
    
    // Popup Sniper Mode
    const features = "width=800,height=900,status=no,resizable=yes,scrollbars=yes";
    const waPopup = window.open(url, 'wa-vender', features);
    if (waPopup) waPopup.focus();
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-900/80 border-b border-slate-800">
          <TableRow className="hover:bg-transparent border-slate-800">
            <TableHead className="w-12 px-4">
              <input 
                type="checkbox" 
                checked={allSelected}
                onChange={onToggleAll}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
              />
            </TableHead>
            <TableHead className="text-slate-300 font-semibold py-4">Lead / Canais</TableHead>
            <TableHead className="text-slate-300 font-semibold">Localização</TableHead>
            <TableHead className="text-slate-300 font-semibold text-center">Qualificação</TableHead>
            <TableHead className="text-slate-300 font-semibold text-right pr-6">Ações Premium</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="h-48 text-center">
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <TrendingUp className="h-8 w-8 opacity-20" />
                  <p className="text-sm font-medium">Billionaire Shadow aguardando ordens...</p>
                  <p className="text-xs opacity-60">Inicie uma busca para listar oportunidades.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className={`group border-slate-800/50 hover:bg-slate-800/30 transition-all duration-300 ${selectedIds.includes(lead.id) ? 'bg-emerald-500/5' : ''}`}
              >
                <TableCell className="px-4">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(lead.id)}
                    onChange={() => onToggleSelect(lead.id)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5 py-1">
                    <span className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors uppercase tracking-tight text-sm">
                      {lead.companyName}
                    </span>
                    <div className="flex flex-wrap gap-2 items-center">
                      {lead.website && (
                        <a 
                          href={lead.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700/50"
                          title="Website"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {lead.instagram && (
                        <a 
                          href={lead.instagram.includes('instagram.com') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@', '')}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-all border border-pink-500/20"
                          title="Instagram"
                        >
                          <Instagram className="h-3 w-3" />
                        </a>
                      )}
                      {lead.email && (
                        <a 
                          href={`mailto:${lead.email}`}
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/20"
                          title={lead.email}
                        >
                          <Mail className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="max-w-[180px] break-words leading-relaxed">{lead.address || "Local não informado"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Badge 
                      className={`
                        px-2.5 py-0.5 rounded-full text-[10px] font-bold border
                        ${lead.status === 'Qualificado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          lead.status === 'Desqualificado' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          lead.status === 'Contatado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-slate-800 text-slate-400 border-slate-700'}
                      `}
                    >
                      {lead.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex gap-1 mr-2 border-r border-slate-800 pr-3">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                        onClick={() => onUpdateStatus(lead.id, 'Qualificado')}
                        title="Qualificar"
                      >
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                        onClick={() => onUpdateStatus(lead.id, 'Desqualificado')}
                        title="Desqualificar"
                      >
                        <XCircle className="h-4.5 w-4.5" />
                      </Button>
                    </div>

                    {(lead.website || lead.instagram) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setEnrichingId(lead.id);
                          await onEnrich(lead.id, lead.website || null, lead.instagram || null);
                          setEnrichingId(null);
                        }}
                        disabled={enrichingId === lead.id}
                        className="group/ghost border-violet-500/50 text-violet-400 hover:bg-violet-500/20 hover:text-violet-300 h-9 px-3 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all"
                      >
                        {enrichingId === lead.id ? (
                          <div className="h-3 w-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Zap className="h-3.5 w-3.5 mr-1 fill-violet-500/30 group-hover:animate-pulse" />
                            Ghost Scraper
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      onClick={() => {
                        // Prioridade Total: Abrir WhatsApp primeiro carregar o popup
                        if (lead.phone) {
                          handleWhatsApp(lead.phone, lead.companyName);
                        } else {
                          // Caso não tenha telefone, abre busca direta pelo nome no WA
                          const waUrl = `https://web.whatsapp.com/search?text=${encodeURIComponent(lead.companyName)}`;
                          window.open(waUrl, 'wa-search', "width=800,height=900");
                        }
                        
                        // Atualização de status em background (silenciosa)
                        try {
                          onUpdateStatus(lead.id, 'Contatado');
                        } catch (e) {
                          console.warn("[UI Sync Error] Falha ao atualizar status, mas popup aberto.", e);
                        }
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95"
                    >
                      <MessageSquare className="h-4 w-4" />
                      VENDER
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
