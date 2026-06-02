import {useMemo} from 'react';
import type {Issue} from '../../../shared/types';
import {hasOpenBlockers} from '../../lib/issueBlockers';
import {getCommonPrefix} from '../../lib/path';
import {buildHierarchy} from './hierarchy';
import type {FilterPreset} from './types';
import {matchesSearch} from './utils';

interface UseIssueListFilteringOptions {
  issues: Issue[];
  showDeleted: boolean;
  sourceFilter: string;
  activePreset: FilterPreset;
  globalFilter: string;
}

export function useIssueListFiltering({
  issues,
  showDeleted,
  sourceFilter,
  activePreset,
  globalFilter,
}: UseIssueListFilteringOptions) {
  const issueMap = useMemo(() => new Map(issues.map((i) => [i.id, i])), [issues]);

  const sourcePathPrefix = useMemo(() => {
    const allSources: string[] = [];
    for (const issue of issues) {
      if (issue._sources) {
        allSources.push(...issue._sources);
      }
    }
    return getCommonPrefix(allSources);
  }, [issues]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    for (const issue of issues) {
      if (issue._sources) {
        for (const src of issue._sources) {
          sources.add(src);
        }
      }
    }
    return Array.from(sources).sort();
  }, [issues]);

  const {searchMatchedIds, ancestorIds} = useMemo(() => {
    const searchMatchedIds = new Set<string>();
    const ancestorIds = new Set<string>();

    if (!globalFilter) {
      return {searchMatchedIds, ancestorIds};
    }

    for (const issue of issues) {
      if (matchesSearch(issue, globalFilter)) {
        searchMatchedIds.add(issue.id);

        let current = issue;
        while (current.parent) {
          ancestorIds.add(current.parent);
          const parent = issueMap.get(current.parent);
          if (!parent) break;
          current = parent;
        }
      }
    }

    return {searchMatchedIds, ancestorIds};
  }, [issues, globalFilter, issueMap]);

  const filteredIssues = useMemo(() => {
    let result = issues;

    if (!showDeleted) {
      result = result.filter((issue) => !issue.deleted);
    }

    if (sourceFilter) {
      result = result.filter((issue) => issue._sources?.includes(sourceFilter));
    }

    if (!activePreset) return result;

    return result.filter((issue) => {
      if (globalFilter && (searchMatchedIds.has(issue.id) || ancestorIds.has(issue.id))) {
        return true;
      }

      const hasBlockers = hasOpenBlockers(issue, issueMap);
      switch (activePreset) {
        case 'ready':
          return issue.status !== 'closed' && !hasBlockers;
        case 'blocked':
          return hasBlockers;
        case 'in_progress':
          return issue.status === 'in_progress';
        case 'all_open':
          return issue.status !== 'closed';
        default:
          return true;
      }
    });
  }, [issues, activePreset, issueMap, sourceFilter, showDeleted, globalFilter, searchMatchedIds, ancestorIds]);

  const hierarchicalData = useMemo(() => buildHierarchy(filteredIssues), [filteredIssues]);

  return {issueMap, sourcePathPrefix, uniqueSources, hierarchicalData};
}
