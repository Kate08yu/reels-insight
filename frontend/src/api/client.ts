import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "";
const api = axios.create({ baseURL: `${BASE}/api` });

export interface SceneAnalysis {
  scene: number;
  text: string;
  text_kr: string;
  description: string;
  technique: string;
  psychology: string;
  retention_score: string;
}

export interface BenchmarkingGuide {
  hook_template: string;
  structure_template: string;
  visual_style: string;
  audio_strategy: string;
  caption_strategy: string;
  checklist: string[];
}

export interface VideoAnalysis {
  summary: string;
  tone: string;
  keywords: string[];
  topics: string[];
  hook: { technique: string; strength: string; reason: string };
  structure: { pattern: string; pacing: string; loop_potential: string };
  scenes: SceneAnalysis[];
  engagement_triggers: string[];
  algorithm_factors: { watch_time_optimization: string; shareability: string; shareability_reason: string };
  weaknesses: string[];
  improvement: string[];
  benchmarking: BenchmarkingGuide;
}

export interface ReelDetail {
  shortcode: string;
  url: string;
  analysis?: VideoAnalysis;
  notion_url?: string;
}

export interface AccountStats {
  username: string;
  reel_count: number;
  avg_views: number;
  avg_likes: number;
  avg_comments: number;
  avg_engagement_rate: number;
  top_hashtags: [string, number][];
}

export const analyzeReel = (url: string, save_to_notion = false) =>
  api.post<ReelDetail>("/reels/analyze", { url, save_to_notion }).then((r) => r.data);

export const analyzeCarousel = (files: File[], save_to_notion = false) => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("save_to_notion", save_to_notion ? "true" : "false");
  return api.post<ReelDetail>("/carousel/analyze", form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

export const fetchAccountStats = (username: string, max_items = 30) =>
  api.get<AccountStats>(`/accounts/${username}`, { params: { max_items } }).then((r) => r.data);
