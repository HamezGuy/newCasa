// File: components/property/PropertyImages.tsx
import { ParagonPropertyWithMedia } from '@/types/IParagonMedia';
import { Box } from '@mantine/core';
import Image from 'next/image';
import { useState } from 'react';
import ImageCarouselModal from './ImageCarouselModal';

// Create a type guard to narrow image type
function hasMediaURL(
  img: { MediaURL?: string }
): img is { MediaURL: string } {
  return !!img.MediaURL;
}

export function PropertyImages({
  property,
}: {
  property: ParagonPropertyWithMedia;
}) {
  // Use the original images array – here assumed to be property.Media
  const images = property.Media;

  if (!images) {
    return <>No images found</>;
  }

  // Use the type guard so that each image now has a defined MediaURL
  const imageArray = images
    .filter(hasMediaURL)
    .map((img) => ({
      url: img.MediaURL.startsWith('http')
        ? img.MediaURL
        : `https:${img.MediaURL}`,
      alt: 'Property Image',
    }));

  // State for showing the enlarged image carousel modal
  const [carouselOpen, setCarouselOpen] = useState(false);

  return (
    <>
      <Box className="w-full overflow-x-scroll">
        <Box
          className="flex flex-col flex-wrap gap-1"
          style={{ height: '24.25rem' }}
        >
          {images.map((image, i) =>
            image.MediaURL ? (
              <Box
                key={i}
                className={`relative overflow-hidden ${
                  i === 0 ? 'w-96 h-full' : 'w-56 h-48'
                }`}
                // Open the carousel modal on click:
                onClick={() => setCarouselOpen(true)}
                style={{ cursor: 'pointer' }}
              >
                <Image
                  fill
                  src={
                    image.MediaURL.startsWith('http')
                      ? image.MediaURL
                      : `https:${image.MediaURL}`
                  }
                  alt="Property Image"
                  style={{ objectFit: 'cover' }}
                />
              </Box>
            ) : null
          )}
        </Box>
      </Box>

      {carouselOpen && (
        <ImageCarouselModal
          opened={carouselOpen}
          onClose={() => setCarouselOpen(false)}
          images={imageArray}
        />
      )}
    </>
  );
}
