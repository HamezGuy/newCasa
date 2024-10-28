import { ParagonPropertyWithMedia } from '@/types/IParagonMedia';
import { Box } from '@mantine/core';
import Image from 'next/image';

export function PropertyImages({
  property,
}: {
  property: ParagonPropertyWithMedia;
}) {
  const images = property.Media;

  if (!images) {
    return <>No images found</>;
  }

  return (
    <Box className="w-full overflow-x-scroll">
      <Box
        className="flex flex-col flex-wrap gap-1"
        style={{ height: '24.25rem' }}
      >
        {images.map((image, i) => (
          image.MediaURL ? (
            <Box
              key={i}
              className={`relative overflow-hidden ${
                i === 0 ? 'w-96 h-full' : 'w-56 h-48'
              }`}
            >
              <Image
                fill={true}
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
        ))}
      </Box>
    </Box>
  );
}
