import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PageHelpProps {
  id: string;
  title?: string;
  description: string;
  features?: string[];
  tips?: string[];
  defaultCollapsed?: boolean;
}

export function PageHelp({ 
  id, 
  title = "¿Qué puedo hacer acá?",
  description, 
  features, 
  tips,
  defaultCollapsed = false 
}: PageHelpProps) {
  const storageKey = `pageHelp_${id}_collapsed`;
  
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return !defaultCollapsed;
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? saved === 'false' : !defaultCollapsed;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, (!isOpen).toString());
  }, [isOpen, storageKey]);

  return (
    <Card className="mb-6 bg-muted/30 border-muted">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <span className="font-medium">{title}</span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
            
            {features && features.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Desde acá podés:</p>
                <ul className="space-y-1">
                  {features.map((feature, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {tips && tips.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Tips</span>
                </div>
                <ul className="space-y-1">
                  {tips.map((tip, index) => (
                    <li key={index} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                      <span>•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
