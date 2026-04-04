"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/UploadZone";
import { uploadCSV, uploadDemo } from "@/lib/api";
import type { UploadResult } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadCSV(file);
      setUploadResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDemo = async () => {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadDemo();
      setUploadResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleExplore = () => {
    if (uploadResult) {
      router.push(`/explore/${uploadResult.session_id}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-paper px-6">
      <main className="flex flex-col items-center max-w-2xl text-center">
        <h1 className="font-display text-5xl md:text-6xl font-bold text-ink leading-tight mb-6">
          Every dataset has a story.
        </h1>
        <p className="font-body text-lg md:text-xl text-muted leading-relaxed max-w-lg mb-12">
          Drop a CSV. The agent finds patterns, runs statistical tests,
          generates charts, and writes a publishable data story.
        </p>

        {!uploadResult ? (
          <>
            <UploadZone onFileSelected={handleFile} disabled={uploading} />

            {uploading && (
              <p className="font-ui text-sm text-muted mt-4">Uploading...</p>
            )}

            {error && (
              <p className="font-ui text-sm text-coral mt-4">{error}</p>
            )}

            <button
              onClick={handleDemo}
              disabled={uploading}
              className="font-ui text-sm text-accent underline underline-offset-4 mt-6 hover:text-accent-hover transition-colors disabled:opacity-50"
            >
              Try with demo data
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="border border-border rounded-[6px] px-6 py-4 bg-surface">
              <p className="font-ui text-sm font-medium text-ink">
                {uploadResult.filename}
              </p>
              <p className="font-mono text-xs text-muted mt-1">
                {uploadResult.rows.toLocaleString()} rows &middot;{" "}
                {uploadResult.columns} columns
              </p>
            </div>

            <button
              onClick={handleExplore}
              className="font-ui text-sm font-medium text-paper bg-accent hover:bg-accent-hover px-8 py-3 rounded-[4px] transition-colors"
            >
              Explore this data
            </button>
          </div>
        )}
      </main>

      <footer className="py-6 mt-auto">
        <p className="font-ui text-xs text-muted tracking-wide">
          Powered by GLM 5.1
        </p>
      </footer>
    </div>
  );
}
