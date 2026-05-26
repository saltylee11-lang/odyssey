"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { TagChip } from "./TagChip";
import { cn } from "@/lib/utils/cn";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export function TagInput({ tags, onChange, suggestions = [], placeholder = "添加标签...", className }: TagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) => !tags.includes(s) && s.includes(input)
  );

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl backdrop-blur-sm bg-white/40 border border-white/50 focus-within:ring-2 focus-within:ring-indigo-300">
        {tags.map((tag) => (
          <TagChip key={tag} label={tag} onRemove={() => removeTag(tag)} />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-slate-300 py-1 px-1"
        />
      </div>
      {showSuggestions && input.trim() && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-lg z-10 py-1">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(s);
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-indigo-50"
              >
                {s}
              </button>
            ))
          ) : (
            <div className="px-3 py-1.5 text-xs text-slate-400">
              按回车添加自定义标签
            </div>
          )}
          {input.trim() && !suggestions.includes(input.trim()) && filteredSuggestions.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(input);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-indigo-500 hover:bg-indigo-50 border-t border-slate-100"
            >
              添加 "{input.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
