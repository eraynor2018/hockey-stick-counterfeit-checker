"use client";

import { useState } from "react";
import UsernameInput from "@/components/UsernameInput";
import ThresholdSlider from "@/components/ThresholdSlider";
import ResultCard from "@/components/ResultCard";
import type { AnalysisResult, AnalyzeResponse } from "@/types";

export default function Home() {
  const [usernames, setUsernames] = useState<string[]>([]);
  const [threshold, setThreshold] = useState(50);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (usernames.length === 0) {
      setErrors(["Please add at least one seller username"]);
      return;
    }

    setIsLoading(true);
    setErrors([]);
    setResults([]);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernames,
          threshold,
        }),
      });

      const data: AnalyzeResponse = await response.json();

      if (data.results) {
        setResults(data.results);
      }

      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors);
      }
    } catch (error) {
      setErrors([
        `Failed to analyze: ${error instanceof Error ? error.message : "Unknown error"}`,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = ["Item ID", "Title", "URL", "Confidence", "Reason"];
    const rows = results.map((r) => [
      r.item_id,
      `"${r.title.replace(/"/g, '""')}"`,
      r.url,
      r.confidence.toString(),
      `"${r.reason.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `counterfeit-analysis-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Hockey Stick Counterfeit Checker
              </h1>
              <p className="text-sm text-gray-400">
                Analyze SidelineSwap listings for potential counterfeits using AI
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Controls Section */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Username Input */}
            <div>
              <UsernameInput
                usernames={usernames}
                onChange={setUsernames}
                disabled={isLoading}
              />
            </div>

            {/* Threshold Slider */}
            <div>
              <ThresholdSlider
                value={threshold}
                onChange={setThreshold}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleAnalyze}
              disabled={isLoading || usernames.length === 0}
              className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Analyze Listings
                </>
              )}
            </button>

            {results.length > 0 && (
              <button
                onClick={exportToCSV}
                className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                {errors.map((error, i) => (
                  <p key={i} className="text-red-400 text-sm">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 text-gray-400">
              <svg
                className="animate-spin h-8 w-8"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <div className="text-left">
                <p className="font-medium">Analyzing listings...</p>
                <p className="text-sm text-gray-500">
                  This may take a few moments as we scrape and analyze each listing
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Analysis Results
              </h2>
              <span className="text-sm text-gray-400">
                {results.length} listing{results.length !== 1 ? "s" : ""} found
                above {threshold}% threshold
              </span>
            </div>
            <div className="space-y-4">
              {results.map((result) => (
                <ResultCard key={result.item_id} result={result} />
              ))}
            </div>
          </div>
        )}

        {!isLoading && results.length === 0 && usernames.length > 0 && !errors.length && (
          <div className="text-center py-16 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto mb-4 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <p>Click &quot;Analyze Listings&quot; to start scanning for counterfeits</p>
          </div>
        )}

        {!isLoading && usernames.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto mb-4 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <p>Enter a SidelineSwap seller username to get started</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>
            This tool uses AI to identify potential counterfeit indicators. Results
            should be used as guidance only - always verify authenticity through
            official channels before making purchasing decisions.
          </p>
        </div>
      </footer>
    </main>
  );
}
