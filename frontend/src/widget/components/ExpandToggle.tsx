import { cn } from 'cn'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useLanguage } from '@/i18n'
import { Button } from '../ui/button'

interface ExpandToggleProps {
  expanded: boolean
  onToggle: () => void
  className?: string
}

/**
 * Maximise / restore control for desktop. Hidden on phones, where the panel
 * is always full screen.
 */
export function ExpandToggle({ expanded, onToggle, className }: ExpandToggleProps) {
  const { t } = useLanguage()
  const Icon = expanded ? Minimize2 : Maximize2
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={expanded ? t.widget.restore : t.widget.maximise}
      aria-pressed={expanded}
      onClick={onToggle}
      className={cn('maat:hidden maat:sm:inline-flex', className)}
    >
      <Icon />
    </Button>
  )
}
