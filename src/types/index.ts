export interface AnalyzeRequest {
  usernames: string[];
  threshold: number;
}

export interface ListingData {
  itemId: string;
  url: string;
  title: string;
  price: string;
  description: string;
  imageUrls: string[];
  sellerUsername: string;
}

export interface AnalysisResult {
  item_id: string;
  url: string;
  image_url: string;
  title: string;
  confidence: number;
  reason: string;
}

export interface AnalyzeResponse {
  results: AnalysisResult[];
  errors?: string[];
}

export interface ClaudeAnalysis {
  confidence: number;
  reason: string;
}
