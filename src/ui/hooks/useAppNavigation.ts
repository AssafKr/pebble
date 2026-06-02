import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Issue } from '../../shared/types';
import {
  isAppView,
  issuePath,
  parseRouteParams,
  viewPath,
  type AppView,
} from '../lib/routes';

export function useAppNavigation() {
  const { view: viewParam, issueId: issueIdParam } = useParams();
  const navigate = useNavigate();

  const { view, issueId } = useMemo(
    () => parseRouteParams(viewParam, issueIdParam),
    [viewParam, issueIdParam],
  );

  const goToView = useCallback(
    (newView: AppView) => {
      navigate(viewPath(newView));
    },
    [navigate],
  );

  const selectIssue = useCallback(
    (issue: Issue) => {
      navigate(issuePath(view, issue.id));
    },
    [navigate, view],
  );

  const closeIssue = useCallback(() => {
    navigate(viewPath(view));
  }, [navigate, view]);

  const isValidView = isAppView(viewParam);

  return {
    view,
    issueId,
    isValidView,
    goToView,
    selectIssue,
    closeIssue,
  };
}
