/** Learning Engine — Status Transitions */
import type { LearningStatus } from '../interfaces/index.js';

const transitions: Record<LearningStatus, readonly LearningStatus[]> = {
  Created:    ['Learning', 'Archived'],
  Learning:   ['Analyzing', 'Archived'],
  Analyzing:  ['Completed', 'Archived'],
  Completed:  ['Archived'],
  Archived:   [],
};

export function canTransitionLearning(from: LearningStatus, to: LearningStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}
