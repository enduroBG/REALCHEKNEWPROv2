# RealCheck — PRD

## Original Problem Statement
User provided an HTML mockup (Bulgarian) of a fact-checking dashboard called RealCheck. Dark GitHub-like theme with green accents. Sidebar (Начало/Проверки/История/Любими/Настройки) and main result page with circular reality score (82/100), claim analysis stats and category progress bars.

## User Choices (locked)
- Functionality: article analysis + product/ad checks + news fact-checking
- AI provider: **Gemini 3 Pro** (`gemini-3.1-pro-preview`) via Emergent Universal Key
- Authentication: **none**
- Persistence: MongoDB (history + favorites)
- Scope: full MVP with all pages

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations LlmChat
- **Frontend**: React 19 + react-router-dom + Tailwind + sonner + lucide-react
- **AI**: Gemini 3.1 Pro Preview, system prompt enforces JSON-only Bulgarian output

## Implemented (2026-04-25)
- `POST /api/analyze` — runs Gemini analysis, persists `AnalysisResult`
- `GET /api/checks` (+ `favorites_only`)  
- `GET /api/checks/{id}`, `DELETE /api/checks/{id}`, `PATCH /api/checks/{id}/favorite`
- `GET /api/stats`
- Pages: Home (dashboard + recent), New Check (3 type cards + sample loader + textarea), Result (animated SVG score circle, risk badge, category bars, claim cards with verdict tags), History (with filter), Favorites, Settings
- Design: Chivo + IBM Plex Sans/Mono, terminal/Swiss aesthetic, grid texture, glow accents, animated score circle, pulsing verdict dots
- All 16 backend tests passing (`/app/backend/tests/backend_test.py`)

## Backlog (P1)
- URL ingestion (paste link → fetch & analyze)
- Export check as PDF / share link
- Tag/category system + advanced filters in History
- Streak / weekly summary on dashboard

## Backlog (P2)
- Multi-language (EN)
- User accounts & cross-device sync (would require auth)
- Browser extension for one-click checks
- Public "viral claims" feed

## Test Credentials
N/A — app has no auth.
