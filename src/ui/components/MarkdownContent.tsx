import {useMemo} from 'react';
import {cn} from '../lib/utils';
import {renderMarkdown} from '../lib/markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
  emptyFallback?: string;
  /** When true, wraps content in a bordered panel distinct from surrounding UI. */
  framed?: boolean;
}

export function MarkdownContent({content, className, emptyFallback, framed = true}: MarkdownContentProps) {
  const html = useMemo(() => (content.trim() ? renderMarkdown(content) : ''), [content]);

  if (!html) {
    return emptyFallback ? (
      <p className={cn('text-sm italic text-muted-foreground', className)}>{emptyFallback}</p>
    ) : null;
  }

  return (
    <div className={cn(framed && 'markdown-panel', className)}>
      <div className="markdown-content" dangerouslySetInnerHTML={{__html: html}} />
    </div>
  );
}
