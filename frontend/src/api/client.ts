import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "";
const api = axios.create({ baseURL: `${BASE}/api` });

export interface ReelMetrics {
  shortcode: string;
  url: string;
  thumbnail?: string;
  caption?: string;
  hashtags: string[];
  likes: number;
  comments: number;
  views: number;
  timestamp?: string;
  owner?: string;
}

export interface VideoAnalysis {
  summary: string;
  tone: string;
  keywords: string[];
  topics: string[];
}

export interface ReelDetail extends ReelMetrics {
  analysis?: VideoAnalysis;
}

export interface AccountStats {
  username: string;
  reel_count: number;
  avg_views: number;
  avg_likes: number;
  avg_comments: number;
  avg_engagement_rate: number;
  top_hashtags: [string, number][];
  reels: ReelMetrics[];
}

export interface CompareResult {
  account_a: AccountStats;
  account_b: AccountStats;
  radar: { metric: string; [key: string]: string | number }[];
}

export const getAccount = (username: string, maxItems = 30) =>
  api.get<AccountStats>(`/accounts/${username}`, { params: { max_items: maxItems } }).then((r) => r.data);

export const analyzeReel = (url: string) =>
  api.post<ReelDetail>("/reels/analyze", { url }).then((r) => r.data);

export const compareAccounts = (username_a: string, username_b: string, max_items = 20) =>
  api.post<CompareResult>("/reels/compare", { username_a, username_b, max_items }).then((r) => r.data);
