import { NextRequest, NextResponse } from "next/server";
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

// SidelineSwap API response types
interface SidelineSwapItem {
  id: number;
  state: string;
  name: string;
  category_1: string;
  category_2: string;
  price: number;
  url: string;
  primary_image?: {
    large_url: string;
    edge_url: string;
  };
  images?: Array<{
    large_url: string;
    edge_url?: string;
  }>;
  seller: {
    id: number;
    username: string;
  };
  condition_detail?: {
    name: string;
  };
}

interface SidelineSwapV2Response {
  data: SidelineSwapItem[];
  meta: {
    paging: {
      total_count: number;
      total_pages: number;
      page: number;
      page_size: number;
      has_next_page: boolean;
    };
  };
}

// Build URL with bracket notation for array parameters
function buildFacetItemsUrl(params: {
  seller?: string[];
  category?: string[];
  brand?: string[];
}): string {
  const baseUrl = "https://api.sidelineswap.com/v2/facet_items";
  const searchParams = new URLSearchParams();

  // Add array parameters with bracket notation
  if (params.seller) {
    for (const s of params.seller) {
      searchParams.append("seller[]", s);
    }
  }
  if (params.category) {
    for (const c of params.category) {
      searchParams.append("category[]", c);
    }
  }
  if (params.brand) {
    for (const b of params.brand) {
      searchParams.append("brand[]", b);
    }
  }

  return `${baseUrl}?${searchParams.toString()}`;
}

// Fetch seller's hockey stick listings using SidelineSwap v2 facet_items API
async function fetchSellerListings(username: string): Promise<ListingData[]> {
  const listings: ListingData[] = [];

  try {
    // Use the v2 facet_items API with bracket notation for arrays
    // Filter by seller and hockey/sticks category
    const apiUrl = buildFacetItemsUrl({
      seller: [username],
      category: ["hockey", "sticks"],
    });

    console.log(`Fetching from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`API request failed for ${username}: ${response.status}`);
      return listings;
    }

    const data: SidelineSwapV2Response = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log(`No items found for seller: ${username}`);
      return listings;
    }

    console.log(`API returned ${data.data.length} items (total: ${data.meta.paging.total_count})`);

    // Process all items (already filtered by category via API)
    for (const item of data.data) {
      // Get image URLs
      const imageUrls: string[] = [];
      if (item.primary_image?.edge_url) {
        imageUrls.push(item.primary_image.edge_url);
      } else if (item.primary_image?.large_url) {
        imageUrls.push(item.primary_image.large_url);
      }

      listings.push({
        itemId: String(item.id),
        url: item.url,
        title: item.name,
        price: `$${item.price.toFixed(2)}`,
        description: item.condition_detail?.name || "",
        imageUrls,
        sellerUsername: item.seller.username,
      });
    }

    // Fetch additional details for each listing (to get more images and description)
    const detailedListings: ListingData[] = [];
    for (let i = 0; i < Math.min(listings.length, 15); i++) {
      const listing = listings[i];
      try {
        await delay(500); // Rate limiting
        const detailed = await fetchItemDetails(listing);
        detailedListings.push(detailed);
      } catch {
        detailedListings.push(listing);
      }
    }

    return detailedListings.length > 0 ? detailedListings : listings;
  } catch (error) {
    console.error(`Error fetching listings for ${username}:`, error);
    return listings;
  }
}

// Fetch detailed item information from API
async function fetchItemDetails(listing: ListingData): Promise<ListingData> {
  try {
    const apiUrl = `https://api.sidelineswap.com/v1/items/${listing.itemId}`;

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) return listing;

    const data = await response.json();
    const item = data.data;

    if (!item) return listing;

    // Get all image URLs
    const imageUrls: string[] = [];
    if (item.images && Array.isArray(item.images)) {
      for (const img of item.images) {
        if (img.edge_url) {
          imageUrls.push(img.edge_url);
        } else if (img.large_url) {
          imageUrls.push(img.large_url);
        }
      }
    }

    // Get description
    const description = item.description || item.condition_detail?.name || "";

    return {
      ...listing,
      description: description.substring(0, 1000),
      imageUrls: imageUrls.length > 0 ? imageUrls : listing.imageUrls,
    };
  } catch (error) {
    console.error(`Error fetching details for item ${listing.itemId}:`, error);
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

      console.log(`Fetching listings for seller: ${cleanUsername}`);

      // Fetch listings via API
      const listings = await fetchSellerListings(cleanUsername);

      if (listings.length === 0) {
        errors.push(`No hockey stick listings found for seller: ${cleanUsername}`);
        continue;
      }

      console.log(`Found ${listings.length} hockey stick listings for ${cleanUsername}`);

      // Analyze each listing
      for (const listing of listings) {
        await delay(1000); // Rate limiting between API calls

        console.log(`Analyzing listing: ${listing.itemId} - ${listing.title}`);

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
