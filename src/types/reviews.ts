export interface Review {
  id: string;
  created_at: string;
  user_name: string;
  prompt: string;
  score: number;
  review: string;
  suggestions: string[];
} 