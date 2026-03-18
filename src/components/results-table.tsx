import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, ExternalLink, MapPin } from "lucide-react";

interface Lead {
  id: string;
  companyName: string;
  address: string | null;
  website: string | null;
  phone: string | null;
  status: 'Pendente' | 'Contatado';
}

interface ResultsTableProps {
  leads: Lead[];
  onContact: (lead: Lead) => void;
}

export function ResultsTable({ leads, onContact }: ResultsTableProps) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="font-bold">Empresa</TableHead>
            <TableHead className="font-bold">Localização</TableHead>
            <TableHead className="font-bold">Status</TableHead>
            <TableHead className="text-right font-bold">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                Nenhum lead encontrado. Comece uma nova busca acima.
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{lead.companyName}</span>
                    {lead.website && (
                      <a 
                        href={lead.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline w-fit"
                      >
                        {lead.website.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[200px]">{lead.address}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={lead.status === 'Contatado' ? 'default' : 'secondary'}
                    className={lead.status === 'Contatado' ? 'bg-accent/20 text-accent hover:bg-accent/30 border-accent/20 border shadow-none' : ''}
                  >
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    onClick={() => onContact(lead)}
                    className="bg-accent hover:bg-accent/90 text-white gap-2 shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
