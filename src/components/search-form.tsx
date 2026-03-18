"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, MapPin, Loader2 } from "lucide-react";

interface SearchFormProps {
  onSearch: (query: string, location: string) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query && location) {
      onSearch(query, location);
    }
  };

  return (
    <Card className="w-full border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">Encontre novos leads</CardTitle>
        <CardDescription>Insira o nicho e a localização para buscar empresas.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ex: Imobiliárias, Academias..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ex: São Paulo, SP"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !query || !location}
            className="h-12 px-8 text-lg font-semibold bg-accent hover:bg-accent/90 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buscar Leads"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
