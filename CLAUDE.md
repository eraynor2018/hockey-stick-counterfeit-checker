# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Build for production
npm run lint     # Run ESLint
npm start        # Run production build
```

## Environment Setup

Requires `ANTHROPIC_API_KEY` in `.env.local` (see `.env.example`).

## Architecture

This is a Next.js 15 App Router application that analyzes SidelineSwap hockey stick listings for potential counterfeits using Claude's vision API.

### Data Flow

1. **Frontend** (`src/app/page.tsx`) - Collects seller usernames and confidence threshold, calls `/api/analyze`
2. **API Route** (`src/app/api/analyze/route.ts`) - Orchestrates the analysis:
   - Fetches seller listings from SidelineSwap's v2 facet_items API (filtered by hockey sticks category ID `110023`)
   - Fetches detailed item info from v1 items API
   - Sends listing images + details to Claude (claude-sonnet-4-5-20250514) for counterfeit analysis
   - Returns results filtered by confidence threshold
3. **Results** - Displayed as cards with confidence scores and AI-generated explanations

### Key Files

- `src/types/index.ts` - Shared TypeScript interfaces (`AnalyzeRequest`, `AnalysisResult`, `ListingData`, etc.)
- `src/app/api/analyze/route.ts` - All backend logic: SidelineSwap API integration, Claude analysis prompts, rate limiting
- `src/components/` - UI components: `UsernameInput`, `ThresholdSlider`, `ResultCard`

### External APIs

- **SidelineSwap v2 API**: `api.sidelineswap.com/v2/facet_items` with bracket notation for array params (`seller[]`, `category[]`)
- **SidelineSwap v1 API**: `api.sidelineswap.com/v1/items/{id}` for detailed item info
- **Anthropic API**: Claude vision for image + text analysis with structured JSON output
