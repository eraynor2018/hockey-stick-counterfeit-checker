# Hockey Stick Counterfeit Checker

A Next.js application that analyzes SidelineSwap listings for potential counterfeit hockey sticks using AI-powered image and text analysis.

## Features

- **Seller Analysis**: Enter one or more SidelineSwap seller usernames to scan their hockey stick listings
- **AI-Powered Detection**: Uses Claude's vision capabilities to analyze images and listing details for counterfeit indicators
- **Confidence Scoring**: Each listing receives a 0-100 confidence score indicating likelihood of being counterfeit
- **Threshold Filtering**: Adjustable threshold slider to filter results by risk level
- **CSV Export**: Export analysis results for further review
- **Dark Theme UI**: Modern, clean interface optimized for easy reading

## How It Works

1. Enter SidelineSwap seller usernames
2. The app scrapes their hockey stick listings
3. Each listing is analyzed by Claude (claude-sonnet-4-20250514) for:
   - Price vs market value comparison
   - Image authenticity (stock photos vs real product)
   - Logo/branding quality
   - Description red flags
4. Results are displayed with confidence scores and explanations

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

## API Endpoint

### POST /api/analyze

Request body:
```json
{
  "usernames": ["seller1", "seller2"],
  "threshold": 50
}
```

Response:
```json
{
  "results": [
    {
      "item_id": "12345",
      "url": "https://sidelineswap.com/gear/12345",
      "image_url": "https://...",
      "title": "Bauer Vapor 3X Pro",
      "confidence": 75,
      "reason": "Price significantly below market value and images appear to be stock photos"
    }
  ],
  "errors": []
}
```

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Cheerio** - HTML parsing for web scraping
- **Anthropic SDK** - Claude API integration

## Disclaimer

This tool uses AI to identify potential counterfeit indicators and should be used as guidance only. Always verify authenticity through official channels before making purchasing decisions.
