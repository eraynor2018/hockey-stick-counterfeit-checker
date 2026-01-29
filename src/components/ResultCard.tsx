"use client";

import { AnalysisResult } from "@/types";

interface ResultCardProps {
  result: AnalysisResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  // Determine color based on confidence level
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-red-500 bg-red-500/10 border-red-500/30";
    if (confidence >= 60) return "text-orange-500 bg-orange-500/10 border-orange-500/30";
    if (confidence >= 40) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
    return "text-green-500 bg-green-500/10 border-green-500/30";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return "High Risk";
    if (confidence >= 60) return "Medium-High Risk";
    if (confidence >= 40) return "Medium Risk";
    return "Low Risk";
  };

  const confidenceColor = getConfidenceColor(result.confidence);

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden hover:border-[#3a3a3a] transition-colors">
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        <div className="md:w-48 h-48 md:h-auto flex-shrink-0 bg-[#0f0f0f] relative">
          {result.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.image_url}
              alt={result.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%231a1a1a' width='200' height='200'/%3E%3Ctext fill='%23666' font-family='system-ui' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              No Image
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate mb-1">
                {result.title || "Untitled Listing"}
              </h3>
              <p className="text-sm text-gray-400 mb-2">
                Item ID: {result.item_id}
              </p>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-1 transition-colors"
              >
                View on SidelineSwap
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>

            {/* Confidence Badge */}
            <div className={`flex-shrink-0 px-4 py-2 rounded-lg border ${confidenceColor}`}>
              <div className="text-center">
                <div className="text-2xl font-bold">{result.confidence}%</div>
                <div className="text-xs uppercase tracking-wide opacity-80">
                  {getConfidenceLabel(result.confidence)}
                </div>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="mt-4 p-3 bg-[#0f0f0f] rounded-md">
            <p className="text-sm text-gray-300 leading-relaxed">
              <span className="text-gray-500 font-medium">Analysis: </span>
              {result.reason}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
