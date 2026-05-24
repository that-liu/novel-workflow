// Cross-page AI conversation memory store
// Key: projectId, Value: Message[]
// Shared globally so different pages can access the same conversation context

export interface MemoryMessage {
  role: 'user' | 'ai';
  text: string;
}

const memoryStore = new Map<string, MemoryMessage[]>();

export function getMemory(key: string): MemoryMessage[] {
  return memoryStore.get(key) || [];
}

export function setMemory(key: string, messages: MemoryMessage[]): void {
  memoryStore.set(key, messages);
}

export function clearMemory(key: string): void {
  memoryStore.delete(key);
}
