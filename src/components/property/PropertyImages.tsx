"use client";

import { ParagonPropertyWithMedia } from '@/types/IParagonMedia';
import { Box } from '@mantine/core';
import Image from 'next/image';
import { useState } from 'react';
import ImageCarouselModal from './ImageCarouselModal';

// Type guard: ensure an image has a defined MediaURL.
function hasMediaURL(img: { MediaURL?: string }): img is { MediaURL: string } {
  return !!img.MediaURL;
}

export function PropertyImages({
  property,
}: {
  property: ParagonPropertyWithMedia;
}) {
  const images = property.Media;
  const [carouselOpen, setCarouselOpen] = useState(false);

  if (!images) {
    return <>No images found</>;
  }

  // Filter and map images to ensure TypeScript knows URLs are defined.
  const imageArray = images
    .filter(hasMediaURL)
    .map((img) => ({
      url: img.MediaURL.startsWith('http') ? img.MediaURL : `https:${img.MediaURL}`,
      alt: 'Property Image',
    }));

  return (
    <>
      <Box className="w-full overflow-x-scroll">
        <Box className="flex flex-col flex-wrap gap-1" style={{ height: '24.25rem' }}>
          {images.map((image, i) =>
            image.MediaURL ? (
              <Box
                key={i}
                className={`relative overflow-hidden ${i === 0 ? 'w-96 h-full' : 'w-56 h-48'}`}
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
