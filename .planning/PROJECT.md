# LeadFlow Explorer

## What This Is

Um Micro-SaaS para prospecção B2B (Billionaire Shadow Edition) que permite buscar leads qualificados em tempo real. O sistema utiliza Inteligência Artificial (Gemini) para vasculhar a internet e extrair nomes, telefones e endereços de empresas, facilitando o primeiro contato comercial via WhatsApp.

## Core Value

Prospecção B2B rápida, certeira e sem custo de APIs complexas, entregando leads prontos para contato em segundos.

## Requirements

### Validated

- ✓ [UI/UX] Interface moderna com Tailwind CSS e Shadcn UI.
- ✓ [Auth] Integração com Clerk para gestão de usuários.
- ✓ [Database] Conexão com Supabase via Drizzle ORM.

### Active

- [ ] [Search] Implementar busca via Gemini Search Grounding para evitar bloqueios de rede.
- [ ] [Lead Management] Salvar e gerenciar status dos leads no banco de dados.
- [ ] [Smart Contact] Gerar link direto para WhatsApp Web com mensagem pré-definida.

### Out of Scope

- [Auto-Bot] Disparo de mensagens automáticas em massa (foco em "Smart Human Contact").
- [Official WhatsApp API] Integração oficial da Meta (custo alto, foco em agilidade).

## Context

- O projeto foi migrado de Turso para Supabase.
- A ferramenta oficial do Google Places API (New) exige cartão de crédito e ativação manual, o que foi substituído pelo motor Gemini.
- Bloqueios de rede na Vercel impediram o scraping direto de HTML, levando à solução de "Search Grounding".

## Constraints

- **Tech Stack**: Next.js 15, Tailwind, Supabase, Gemini.
- **Security**: As chaves de API devem ser mantidas apenas no servidor (Server Actions).
- **Performance**: As buscas devem retornar resultados em menos de 10 segundos.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Gemini Search Grounding | Evita bloqueios de rede e CAPTCHA ao usar a infra do Google para busca. | ✓ Good |
| Supabase over Turso | Facilidade de integração com PostgreSQL e escalabilidade. | ✓ Good |

---
*Last updated: 2026-03-18 after Gemini Research Phase*
