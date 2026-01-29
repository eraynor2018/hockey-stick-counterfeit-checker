import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ListingData,
  AnalysisResult,
  ClaudeAnalysis,
} from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Rate limiting helper
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Scrape a seller's hockey stick listings from SidelineSwap
async function scrapeSellerListings(username: string): Promise<ListingData[]> {
  const listings: ListingData[] = [];
  const url = `https://sidelineswap.com/shop/${username}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return listings;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find all product cards/listings on the page
    // SidelineSwap uses various selectors - try common patterns
    const productSelectors = [
      '[data-testid="product-card"]',
      ".product-card",
      ".listing-card",
      '[class*="ProductCard"]',
      '[class*="listing"]',
      'a[href*="/gear/"]',
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let productElements: cheerio.Cheerio<any> | null = null;

    for (const selector of productSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        productElements = elements;
        break;
      }
    }

    // If we can't find product cards, try to parse the page structure
    if (!productElements || productElements.length === 0) {
      // Look for links that point to gear pages
      $('a[href*="/gear/"]').each((_, element) => {
        const $el = $(element);
        const href = $el.attr("href") || "";

        // Extract item ID from URL (e.g., /gear/12345-hockey-stick)
        const itemIdMatch = href.match(/\/gear\/(\d+)/);
        if (!itemIdMatch) return;

        const itemId = itemIdMatch[1];

        // Check if this is a hockey stick listing by looking at the text/title
        const title =
          $el.find("img").attr("alt") ||
          $el.text().trim() ||
          $el.attr("title") ||
          "";

        const isHockeyStick =
          /hockey|stick|bauer|ccm|warrior|true|sherwood|easton/i.test(title);
        if (!isHockeyStick) return;

        // Get price - look in various places
        const priceText =
          $el.find('[class*="price"]').text() ||
          $el.parent().find('[class*="price"]').text() ||
          "";
        const price = priceText.match(/\$[\d,.]+/)?.[0] || "Unknown";

        // Get image URL
        const imgSrc =
          $el.find("img").attr("src") ||
          $el.find("img").attr("data-src") ||
          "";

        // Build the full URL
        const fullUrl = href.startsWith("http")
          ? href
          : `https://sidelineswap.com${href}`;

        // Avoid duplicates
        if (listings.some((l) => l.itemId === itemId)) return;

        listings.push({
          itemId,
          url: fullUrl,
          title: title.substring(0, 200),
          price,
          description: "", // Will need to fetch from item page for full description
          imageUrls: imgSrc ? [imgSrc] : [],
          sellerUsername: username,
        });
      });
    } else {
      // Parse product cards
      productElements.each((_, element) => {
        const $el = $(element);

        // Get the link and item ID
        const link = $el.find("a").first().attr("href") || $el.attr("href") || "";
        const itemIdMatch = link.match(/\/gear\/(\d+)/);
        if (!itemIdMatch) return;

        const itemId = itemIdMatch[1];
        const fullUrl = link.startsWith("http")
          ? link
          : `https://sidelineswap.com${link}`;

        // Get title
        const title =
          $el.find('[class*="title"]').text().trim() ||
          $el.find("h2, h3, h4").text().trim() ||
          $el.find("img").attr("alt") ||
          "";

        // Filter for hockey sticks
        const isHockeyStick =
          /hockey|stick|bauer|ccm|warrior|true|sherwood|easton/i.test(title);
        if (!isHockeyStick) return;

        // Get price
        const priceText = $el.find('[class*="price"]').text();
        const price = priceText.match(/\$[\d,.]+/)?.[0] || "Unknown";

        // Get images
        const imageUrls: string[] = [];
        $el.find("img").each((_, img) => {
          const src = $(img).attr("src") || $(img).attr("data-src");
          if (src && !src.includes("placeholder")) {
            imageUrls.push(src);
          }
        });

        // Get description if available
        const description = $el.find('[class*="description"]').text().trim();

        listings.push({
          itemId,
          url: fullUrl,
          title: title.substring(0, 200),
          price,
          description,
          imageUrls,
          sellerUsername: username,
        });
      });
    }

    // If we found listings, try to fetch more details for the first few
    // (limit to avoid too many requests)
    const detailedListings: ListingData[] = [];
    for (let i = 0; i < Math.min(listings.length, 10); i++) {
      const listing = listings[i];

      try {
        await delay(1000); // Rate limiting
        const detailedListing = await fetchListingDetails(listing);
        detailedListings.push(detailedListing);
      } catch {
        detailedListings.push(listing);
      }
    }

    return detailedListings.length > 0 ? detailedListings : listings;
  } catch (error) {
    console.error(`Error scraping ${username}:`, error);
    return listings;
  }
}

// Fetch detailed information for a single listing
async function fetchListingDetails(listing: ListingData): Promise<ListingData> {
  try {
    const response = await fetch(listing.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    if (!response.ok) return listing;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Get description
    const description =
      $('[class*="description"]').text().trim() ||
      $('[data-testid="description"]').text().trim() ||
      $('meta[name="description"]').attr("content") ||
      listing.description;

    // Get all images
    const imageUrls: string[] = [];
    $('img[src*="sidelineswap"], img[src*="cloudinary"]').each((_, img) => {
      const src = $(img).attr("src");
      if (src && !src.includes("placeholder") && !src.includes("avatar")) {
        // Get higher resolution version if possible
        const highResSrc = src.replace(/w_\d+/, "w_800").replace(/h_\d+/, "h_800");
        if (!imageUrls.includes(highResSrc)) {
          imageUrls.push(highResSrc);
        }
      }
    });

    // Get price if not already set
    let price = listing.price;
    if (price === "Unknown") {
      const priceText =
        $('[class*="price"]').first().text() ||
        $('[data-testid="price"]').text();
      price = priceText.match(/\$[\d,.]+/)?.[0] || "Unknown";
    }

    return {
      ...listing,
      description: description.substring(0, 1000),
      imageUrls: imageUrls.length > 0 ? imageUrls : listing.imageUrls,
      price,
    };
  } catch (error) {
    console.error(`Error fetching details for ${listing.itemId}:`, error);
    return listing;
  }
}

// Analyze a listing using Claude's vision capabilities
async function analyzeListingWithClaude(
  listing: ListingData
): Promise<ClaudeAnalysis> {
  try {
    // Build the content array with images
    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    // Add images (up to 4 to stay within limits)
    const imagesToAnalyze = listing.imageUrls.slice(0, 4);

    for (const imageUrl of imagesToAnalyze) {
      // Fetch image and convert to base64
      try {
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = Buffer.from(imageBuffer).toString("base64");

          // Determine media type
          const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
          const mediaType = contentType.includes("png")
            ? "image/png"
            : contentType.includes("gif")
              ? "image/gif"
              : contentType.includes("webp")
                ? "image/webp"
                : "image/jpeg";

          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image,
            },
          });
        }
      } catch {
        console.error(`Failed to fetch image: ${imageUrl}`);
      }
    }

    // Add the analysis prompt
    const prompt = `You are an expert at identifying counterfeit hockey sticks. Analyze this listing for potential counterfeit indicators.

**Listing Details:**
- Title: ${listing.title}
- Price: ${listing.price}
- Description: ${listing.description || "No description provided"}
- Seller: ${listing.sellerUsername}

**Please assess the following:**

1. **Price Analysis**: Is the price suspiciously low compared to typical market value for this stick model? Consider that used sticks should still be at least 30-50% of retail for authentic items in good condition.

2. **Image Quality**: Do these images look like:
   - Stock photos copied from retail sites?
   - Low-quality photos that hide details?
   - Genuine product photos with actual wear/use?

3. **Logo/Branding**: Look for:
   - Incorrect fonts or spacing in brand names
   - Wrong colors or proportions
   - Missing or incorrect holographic stickers
   - Poor print quality

4. **Description Red Flags**: Check for:
   - Vague or missing specifications
   - Unusual grammar/spelling (fake sellers often have these)
   - Claims that seem too good to be true
   - Missing flex, curve, or hand information

**Required Response Format (JSON only):**
{
  "confidence": <number 0-100 representing likelihood this is counterfeit>,
  "reason": "<brief 1-2 sentence explanation of your assessment>"
}

A confidence of 0 means definitely authentic, 100 means definitely counterfeit. Score 50+ for items with significant red flags.

Respond ONLY with the JSON object, no other text.`;

    content.push({
      type: "text",
      text: prompt,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    // Parse the response
    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
        reason: String(parsed.reason || "Unable to determine"),
      };
    }

    return {
      confidence: 0,
      reason: "Unable to parse analysis response",
    };
  } catch (error) {
    console.error(`Error analyzing listing ${listing.itemId}:`, error);
    return {
      confidence: 0,
      reason: `Analysis error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const body: AnalyzeRequest = await request.json();
    const { usernames, threshold = 50 } = body;

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json(
        { results: [], errors: ["Please provide at least one username"] },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { results: [], errors: ["Anthropic API key not configured"] },
        { status: 500 }
      );
    }

    const results: AnalysisResult[] = [];
    const errors: string[] = [];

    // Process each seller
    for (const username of usernames) {
      const cleanUsername = username.trim();
      if (!cleanUsername) continue;

      console.log(`Scraping listings for seller: ${cleanUsername}`);

      // Scrape listings
      const listings = await scrapeSellerListings(cleanUsername);

      if (listings.length === 0) {
        errors.push(`No hockey stick listings found for seller: ${cleanUsername}`);
        continue;
      }

      console.log(`Found ${listings.length} listings for ${cleanUsername}`);

      // Analyze each listing
      for (const listing of listings) {
        await delay(1000); // Rate limiting between API calls

        console.log(`Analyzing listing: ${listing.itemId}`);

        const analysis = await analyzeListingWithClaude(listing);

        // Only include results above threshold
        if (analysis.confidence >= threshold) {
          results.push({
            item_id: listing.itemId,
            url: listing.url,
            image_url: listing.imageUrls[0] || "",
            title: listing.title,
            confidence: analysis.confidence,
            reason: analysis.reason,
          });
        }
      }

      // Rate limiting between sellers
      await delay(1000);
    }

    // Sort by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        results: [],
        errors: [
          `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      },
      { status: 500 }
    );
  }
}
