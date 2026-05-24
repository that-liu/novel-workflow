export interface Character {
  id: string;
  name: string;
  role: string;
  personality: string;
  backstory: string;
  motivation: string;
  notes: string;
  relationships?: { targetId: string; type: string; note: string }[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  status: 'draft' | 'writing' | 'done';
  wordCount: number;
  summary: string;
  updatedAt?: string;
}

export interface WorldSetting {
  era: string;
  geography: string;
  magic: string;
  society: string;
  factions: string;
  rules: string;
}

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  chapterRef: string;
}

export interface Novel {
  id: string;
  title: string;
  genre: string;
  description: string;
  notes: string;
  characters: Character[];
  chapters: Chapter[];
  worldSettings: WorldSetting;
  timelineEvents: TimelineEvent[];
  targetWords: number;
  createdAt: string;
  updatedAt: string;
  status?: 'planning' | 'writing' | 'completed' | 'paused';
}
