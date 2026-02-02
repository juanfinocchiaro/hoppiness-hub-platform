import { useState } from 'react';
import { HelpCircle, Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useContextualHelp } from '@/hooks/useContextualHelp';

interface FloatingHelpButtonProps {
  pageId: string;
}

export function FloatingHelpButton({ pageId }: FloatingHelpButtonProps) {
  const { config, showFloatingHelp, toggleFloatingHelp } = useContextualHelp(pageId);
  const [open, setOpen] = useState(false);

  if (!showFloatingHelp || !config) return null;

  return (
    <>
      <Button
        className="fixed bottom-4 right-4 rounded-full w-12 h-12 shadow-lg z-50"
        onClick={() => setOpen(true)}
        size="icon"
      >
        <HelpCircle className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {config.title}
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            <p className="text-muted-foreground">{config.description}</p>
            
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Tips
              </h4>
              <ul className="space-y-3">
                {config.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await toggleFloatingHelp();
                  setOpen(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Ocultar botón de ayuda
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
