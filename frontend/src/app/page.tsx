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
    <div className="flex flex-col min-h-screen bg-paper">
      {/* Hero section — full viewport, asymmetric layout */}
      <section className="flex flex-col justify-center min-h-screen px-8 md:px-16 lg:px-24 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 items-center">
          {/* Left column — text-forward, left-aligned */}
          <div className="animate-fade-in-up">
            <p className="font-ui text-xs font-medium tracking-[0.2em] uppercase text-accent mb-6">
              Autonomous Data Analysis
            </p>
            <h1 className="font-display text-5xl md:text-[64px] font-bold text-ink leading-[1.08] mb-8">
              Every dataset<br />has a story.
            </h1>
            <p className="font-body text-lg md:text-xl text-muted leading-[1.7] max-w-xl mb-2">
              Drop a CSV. The agent finds patterns, runs statistical tests, generates
              charts, and writes a publishable data story — in minutes, not hours.
            </p>
            <p className="font-body text-base text-muted/60 leading-[1.7] max-w-xl mb-10">
              50,000+ rows analyzed. Hypotheses generated and tested.
              Publication-quality charts rendered. A complete narrative written.
              All autonomous.
            </p>

            {/* Stats strip */}
            <div className="flex flex-wrap gap-8 mb-0">
              <div>
                <span className="font-mono text-2xl font-medium text-ink">3 min</span>
                <p className="font-ui text-xs text-muted mt-0.5">Average analysis time</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <span className="font-mono text-2xl font-medium text-ink">5&ndash;7</span>
                <p className="font-ui text-xs text-muted mt-0.5">Hypotheses tested</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <span className="font-mono text-2xl font-medium text-ink">1</span>
                <p className="font-ui text-xs text-muted mt-0.5">Publishable story</p>
              </div>
            </div>
          </div>

          {/* Right column — upload zone */}
          <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            {!uploadResult ? (
              <div className="flex flex-col">
                <UploadZone onFileSelected={handleFile} disabled={uploading} />

                {uploading && (
                  <div className="flex items-center gap-2 mt-4">
                    <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="font-ui text-sm text-muted">Processing...</p>
                  </div>
                )}

                {error && (
                  <div className="mt-4 px-4 py-3 border border-coral/20 bg-coral/5 rounded-[6px]">
                    <p className="font-ui text-sm text-coral">{error}</p>
                  </div>
                )}

                <div className="mt-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-ui text-xs text-muted">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <button
                  onClick={handleDemo}
                  disabled={uploading}
                  className="mt-5 font-ui text-sm font-medium text-accent border border-accent/30 rounded-[6px] px-5 py-2.5 hover:border-accent hover:bg-accent/5 transition-all disabled:opacity-50"
                >
                  Explore demo dataset
                  <span className="text-muted ml-1.5 font-normal">(50K bike trips)</span>
                </button>
              </div>
            ) : (
              <div className="animate-scale-in flex flex-col gap-5">
                <div className="border border-border rounded-[6px] px-6 py-5 bg-surface">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-[4px] bg-accent/10 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent">
                        <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-ui text-sm font-medium text-ink">
                        {uploadResult.filename}
                      </p>
                      <p className="font-mono text-xs text-muted">
                        {uploadResult.rows.toLocaleString()} rows &middot;{" "}
                        {uploadResult.columns} columns
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleExplore}
                  className="font-ui text-sm font-medium text-paper bg-accent hover:bg-accent-hover px-8 py-3.5 rounded-[6px] transition-colors w-full"
                >
                  Explore this data
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 md:px-16 lg:px-24 py-6 border-t border-border mt-auto">
        <div className="flex items-center justify-between max-w-6xl">
          <p className="font-ui text-xs text-muted">
            Powered by GLM 5.1 &middot; Built for the Z.AI Challenge
          </p>
          <p className="font-mono text-[11px] text-muted/50">
            DataStory
          </p>
        </div>
      </footer>
    </div>
  );
}
