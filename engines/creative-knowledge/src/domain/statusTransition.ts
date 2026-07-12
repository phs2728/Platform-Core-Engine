/** Creative Knowledge Engine — Status Transitions */
import type { ResearchStatus } from '../interfaces/index.js';

const transitions: Record<ResearchStatus, readonly ResearchStatus[]> = {
  Created:     ['Interviewing', 'Archived'],
  Interviewing:['Auditing', 'Analyzing', 'Archived'],
  Auditing:    ['Analyzing', 'Archived'],
  Analyzing:   ['Completed', 'Archived'],
  Completed:   ['Archived'],
  Archived:    [],
};

export function canTransitionResearch(from: ResearchStatus, to: ResearchStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}
