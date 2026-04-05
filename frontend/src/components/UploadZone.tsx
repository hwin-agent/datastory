"use client";

import { useCallback, useState, useRef } from "react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        w-full border-2 border-dashed rounded-[6px] py-10 px-8
        cursor-pointer transition-all duration-200
        ${isDragOver
          ? "border-accent bg-accent/5 scale-[1.01]"
          : "border-border hover:border-muted hover:bg-surface/50"
        }
        ${disabled ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-3">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          className={`transition-colors duration-200 ${isDragOver ? "text-accent" : "text-muted/40"}`}
        >
          <rect x="6" y="4" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10 12h12M10 16h8M10 20h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M6 9h4V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="text-center">
          <p className="font-ui text-sm text-muted">
            {isDragOver ? "Drop your CSV" : "Drop a CSV file here"}
          </p>
          <p className="font-ui text-xs text-muted/60 mt-1">
            or click to browse &middot; up to 50 MB
          </p>
        </div>
      </div>
    </div>
  );
}
