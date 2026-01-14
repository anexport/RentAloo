import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: Array<{
    id: string;
    photo_url: string;
    alt?: string;
  }>;
  title: string;
}

/**
 * Mobile-optimized image gallery with swipe support
 */
export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">No images</span>
      </div>
    );
  }

  const goToImage = (index: number) => {
    const newIndex = Math.max(0, Math.min(index, images.length - 1));
    setCurrentIndex(newIndex);
    
    if (scrollRef.current) {
      const scrollWidth = scrollRef.current.scrollWidth;
      const itemWidth = scrollWidth / images.length;
      scrollRef.current.scrollTo({
        left: itemWidth * newIndex,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const itemWidth = scrollRef.current.scrollWidth / images.length;
      const newIndex = Math.round(scrollLeft / itemWidth);
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  };

  return (
    <div className="relative">
      {/* Main image carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            className="flex-shrink-0 w-full snap-center"
          >
            <div className="aspect-[4/3] bg-muted">
              <img
                src={image.photo_url}
                alt={image.alt || `${title} - photo ${index + 1}`}
                className="w-full h-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Navigation arrows (desktop/larger screens) */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => goToImage(currentIndex - 1)}
            disabled={currentIndex === 0}
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm',
              'transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center',
              currentIndex === 0 ? 'opacity-30' : 'opacity-100'
            )}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => goToImage(currentIndex + 1)}
            disabled={currentIndex === images.length - 1}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm',
              'transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center',
              currentIndex === images.length - 1 ? 'opacity-30' : 'opacity-100'
            )}
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToImage(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center',
              )}
              aria-label={`Go to image ${index + 1}`}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentIndex
                    ? 'bg-white w-4'
                    : 'bg-white/50'
                )}
              />
            </button>
          ))}
        </div>
      )}

      {/* Image counter */}
      <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}

export default ImageGallery;
