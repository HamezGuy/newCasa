// File: src/components/property/PropertyImages.tsx
"use client";

import { ParagonPropertyWithMedia } from '@/types/IParagonMedia';
import { Box } from '@mantine/core';
import Image from 'next/image';
import { useState } from 'react';
import ImageCarouselModal from './ImageCarouselModal';

// Create a type guard to ensure that an image has a MediaURL
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
  // Use the original images array – assumed to be property.Media
  const images = property.Media;

  // Always call hooks at the top level!
  const [carouselOpen, setCarouselOpen] = useState(false);

  // If there are no images, return early.
  if (!images) {
    return <>No images found</>;
  }

  // Filter and map images so that TypeScript knows the URL is defined.
  const imageArray = images
    .filter(hasMediaURL)
    .map((img) => ({
      url: img.MediaURL.startsWith('http')
        ? img.MediaURL
        : `https:${img.MediaURL}`,
      alt: 'Property Image',
    }));

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
