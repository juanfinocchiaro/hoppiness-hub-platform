import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import type { MenuCategory } from '@/hooks/store/useBranchMenu';

interface CategoryTabsProps {
  categories: MenuCategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  showFeatured?: boolean;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
  showFeatured = true,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  
  // Auto-scroll to active tab
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const button = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      
      const scrollLeft = button.offsetLeft - containerRect.width / 2 + buttonRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeCategory]);
  
  return (
    <div 
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto py-2 scrollbar-hide"
    >
      {/* Featured tab */}
      {showFeatured && (
        <Button
          ref={activeCategory === 'featured' ? activeRef : undefined}
          variant={activeCategory === 'featured' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onCategoryChange('featured')}
          className="shrink-0 h-8 text-xs rounded-full"
        >
          <Star className="w-3 h-3 mr-1" />
          Destacados
        </Button>
      )}
      
      {/* Category tabs */}
      {categories.map(cat => (
        <Button
          key={cat.id}
          ref={activeCategory === cat.id ? activeRef : undefined}
          variant={activeCategory === cat.id ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onCategoryChange(cat.id)}
          className="shrink-0 h-8 text-xs rounded-full"
        >
          {cat.name}
        </Button>
      ))}
    </div>
  );
}
