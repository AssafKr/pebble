export type AppView = 'list' | 'kanban' | 'dashboard' | 'history' | 'comments';

export const APP_VIEWS: readonly AppView[] = ['list', 'kanban', 'dashboard', 'history', 'comments'];

const APP_VIEW_SET = new Set<string>(APP_VIEWS);

export function isAppView(value: string | undefined): value is AppView {
  return value !== undefined && APP_VIEW_SET.has(value);
}

export function viewPath(view: AppView): string {
  return `/${view}`;
}

export function issuePath(view: AppView, issueId: string): string {
  return `/${view}/${encodeURIComponent(issueId)}`;
}

export interface AppRouteParams {
  view: AppView;
  issueId: string | null;
}

export function parseRouteParams(viewParam: string | undefined, issueIdParam: string | undefined): AppRouteParams {
  const view = isAppView(viewParam) ? viewParam : 'list';
  const issueId = issueIdParam ? decodeURIComponent(issueIdParam) : null;
  return {view, issueId};
}

/** @deprecated Legacy `?view=&issue=` query URLs — used only for redirect on load */
export function parseLegacySearch(search: string): AppRouteParams {
  const params = new URLSearchParams(search);
  const viewParam = params.get('view') ?? undefined;
  const view = isAppView(viewParam) ? viewParam : 'list';
  const issueId = params.get('issue');
  return {view, issueId: issueId || null};
}

export function legacySearchToPath(search: string): string | null {
  const params = new URLSearchParams(search);
  if (!params.has('view') && !params.has('issue')) {
    return null;
  }

  const {view, issueId} = parseLegacySearch(search);
  return issueId ? issuePath(view, issueId) : viewPath(view);
}
