/** Experience Engine — Status Transitions */
import type { ExperienceStatus } from '../interfaces/index.js';

const TRANSITIONS: Record<ExperienceStatus, ExperienceStatus[]> = {
  Draft: ['Published', 'Archived'],
  Published: ['Draft', 'Archived'],
  Archived: ['Draft'],
};

export function canTransitionExperience(from: ExperienceStatus, to: ExperienceStatus): boolean {
  if (from === to) return true;
  return (TRANSITIONS[from] ?? []).includes(to);
}
