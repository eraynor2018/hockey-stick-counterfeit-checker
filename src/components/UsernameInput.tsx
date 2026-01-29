"use client";

import { useState, KeyboardEvent } from "react";

interface UsernameInputProps {
  usernames: string[];
  onChange: (usernames: string[]) => void;
  disabled?: boolean;
}

export default function UsernameInput({
  usernames,
  onChange,
  disabled = false,
}: UsernameInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addUsername = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !usernames.includes(trimmed)) {
      onChange([...usernames, trimmed]);
      setInputValue("");
    }
  };

  const removeUsername = (username: string) => {
    onChange(usernames.filter((u) => u !== username));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addUsername();
    } else if (e.key === "Backspace" && !inputValue && usernames.length > 0) {
      // Remove last username if input is empty
      onChange(usernames.slice(0, -1));
    }
  };

  return (
    <div className="space-y-3">
      <label htmlFor="username-input" className="block text-sm font-medium text-gray-300">
        SidelineSwap Seller Usernames
      </label>

      {/* Username Tags */}
      {usernames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {usernames.map((username) => (
            <span
              key={username}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm border border-blue-500/30"
            >
              @{username}
              <button
                type="button"
                onClick={() => removeUsername(username)}
                disabled={disabled}
                className="ml-1 hover:text-blue-200 disabled:opacity-50"
                aria-label={`Remove ${username}`}
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            @
          </span>
          <input
            id="username-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Enter seller username"
            className="w-full pl-8 pr-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={addUsername}
          disabled={disabled || !inputValue.trim()}
          className="px-4 py-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] disabled:bg-[#1a1a1a] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Press Enter to add a username. You can analyze multiple sellers at once.
      </p>
    </div>
  );
}
