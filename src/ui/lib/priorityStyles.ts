import type {Priority} from '../../shared/types';

/** Text color classes for priority labels in lists, cards, and timelines. */
export function getPriorityTextClass(priority: Priority): string {
  switch (priority) {
    case 0:
    case 1:
      return 'font-semibold text-red-600 dark:text-red-400';
    case 2:
      return 'font-semibold text-orange-600 dark:text-orange-400';
    case 3:
      return 'font-semibold text-green-600 dark:text-green-400';
    default:
      return 'text-muted-foreground';
  }
}
