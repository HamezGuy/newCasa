"use client";

import { Modal } from '@mantine/core';
import Image from "next/image";

interface ImageCarouselModalProps {
  opened: boolean;
  onClose: () => void;
  images: { url: string; alt?: string }[];
}

export default function ImageCarouselModal({
  opened,
  onClose,
  images,
}: ImageCarouselModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Image Gallery"
      size="xl"
      overlayProps={{ opacity: 0.6, blur: 3 }}
    >
      <div className="overflow-x-scroll whitespace-nowrap">
        {images.map((img, index) => (
          <span key={index} className="inline-block mr-4">
            <Image
              src={img.url}
              alt={img.alt || "Property image"}
              width={800}
              height={600}
              className="rounded"
            />
          </span>
        ))}
      </div>
    </Modal>
  );
}
