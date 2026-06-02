import {motion} from 'framer-motion';
import {Loader2} from 'lucide-react';

export function MainContentSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-foreground-muted">Loading issues...</span>
      </motion.div>
    </div>
  );
}
