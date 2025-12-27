import { adjectives } from "./adjectives";
import { nouns } from "./nouns";

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function generateDisplayName(): string {
  const adj1 = getRandomItem(adjectives);
  const adj2 = getRandomItem(adjectives);
  const noun = getRandomItem(nouns);
  
  return `${adj1} ${adj2} ${noun}`;
}
