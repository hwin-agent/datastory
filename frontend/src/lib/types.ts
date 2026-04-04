export interface UploadResult {
  session_id: string;
  rows: number;
  columns: number;
  filename: string;
}

export interface TimelineStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete";
  isDeepDive: boolean;
}

export interface Finding {
  id: string;
  hypothesis: string;
  chart_url?: string;
  test_type?: string;
  p_value?: number;
  effect_summary?: string;
  insight: string;
  isDeepDive: boolean;
}

export interface ReportSection {
  heading: string;
  body: string;
  chart_id?: string;
}

export interface Report {
  title: string;
  executive_summary: string;
  sections: ReportSection[];
  methodology: string;
  recommendations: string;
  findings: {
    id: string;
    hypothesis: string;
    test_type: string;
    p_value: number;
    effect_summary: string;
    insight: string;
    chart_url: string | null;
    is_deep_dive: boolean;
  }[];
  profile: {
    rows: number;
    columns: number;
  };
}
