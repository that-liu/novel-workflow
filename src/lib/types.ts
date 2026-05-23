export interface Character {
  id: string;
  name: string;
  role: string;
  personality: string;
  backstory: string;
  motivation: string;
  notes: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  status: 'draft' | 'writing' | 'done';
  wordCount: number;
  summary: string;
}

export interface Novel {
  id: string;
  title: string;
  genre: string;
  description: string;
  notes: string;
  characters: Character[];
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}
