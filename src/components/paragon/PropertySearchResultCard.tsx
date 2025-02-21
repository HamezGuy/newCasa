"use client";

import { useEffect, useState } from "react";
import DisplayUtils from "@/lib/utils/DisplayUtils";
import ParagonPropertyUtils, {
  getPrimaryPhoto,
} from "@/lib/utils/ParagonPropertyUtils";
import IParagonMedia, { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import { Badge, Card, Group, Image, Space, Text } from "@mantine/core";
import Link from "next/link"; // We bring back Link

import style from "./PropertySearchResultCard.module.css";

interface IPropertySearchResultCardProps {
  property: ParagonPropertyWithMedia;
  size?: "sm" | "md";
  /**
   * If present, we do NOT link to /property/..., but call this callback instead.
   */
  onClick?: (property: ParagonPropertyWithMedia) => void;
}

export default function PropertySearchResultCard({
  property,
  size = "md",
  onClick,
}: IPropertySearchResultCardProps) {
  const [primaryPhoto, setPrimaryPhoto] = useState<IParagonMedia | null>(null);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      const photo = await getPrimaryPhoto(property);
      if (!isCancelled) {
        setPrimaryPhoto(photo);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [property]);

  const imgUrl = primaryPhoto?.MediaURL || "/img/placeholder.png";

  const sPrice = DisplayUtils.formatCurrency(property.ListPrice || 0);
  const sBeds = property.BedroomsTotal || 0;
  const sBaths = property.TotBth || `${property.BathroomsFull || 0} Bths`;

  const subTypeRaw = property.PropertySubType ?? "";
  const finalType = subTypeRaw.trim() ? subTypeRaw : property.PropertyType;

  if (onClick) {
    // --- (A) If parent gave onClick => we do a custom onClick (modal)
    const handleCardClick = () => {
      onClick(property);
    };

    return (
      <div style={{ cursor: "pointer" }} onClick={handleCardClick}>
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          h="100%"
          withBorder
          className={size === "md" ? style.propertyCard : style.propertyCardSmall}
        >
          <Card.Section>
            <Image
              src={imgUrl}
              height={size === "sm" ? 150 : 256}
              width={384}
              alt="Listing"
              mah={size === "sm" ? 150 : 256}
            />
          </Card.Section>

          <Group justify="space-between" mt="md" mb={size === "sm" ? 4 : 16}>
            <Text fw="bold">{sPrice}</Text>
            {property.Open_House_Time && <Badge color="green">{property.Open_House_Time}</Badge>}
          </Group>

          <Group justify="flex-start" gap={5} mb="xs">
            <Text>{sBeds} Beds</Text>
            <Text>•</Text>
            <Text>{sBaths}</Text>
          </Group>

          <Text fw={500} mb={5}>
            {finalType}
          </Text>
          <Text>{ParagonPropertyUtils.formatStreetAddress(property)}</Text>
          <Text>{ParagonPropertyUtils.formatCityStateZip(property)}</Text>

          <Space h={10} />
          <Text size="xs" color="gray">
            {property.ListOfficeName}
          </Text>
        </Card>
      </div>
    );
  } else {
    // --- (B) If no onClick => we do a normal <Link> to the detail page
    return (
      <Link href={`/property/${property.ListingId}`} className="no-underline">
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          h="100%"
          withBorder
          className={size === "md" ? style.propertyCard : style.propertyCardSmall}
          style={{ cursor: "pointer" }}
        >
          <Card.Section>
            <Image
              src={imgUrl}
              height={size === "sm" ? 150 : 256}
              width={384}
              alt="Listing"
              mah={size === "sm" ? 150 : 256}
            />
          </Card.Section>

          <Group justify="space-between" mt="md" mb={size === "sm" ? 4 : 16}>
            <Text fw="bold">{sPrice}</Text>
            {property.Open_House_Time && <Badge color="green">{property.Open_House_Time}</Badge>}
          </Group>

          <Group justify="flex-start" gap={5} mb="xs">
            <Text>{sBeds} Beds</Text>
            <Text>•</Text>
            <Text>{sBaths}</Text>
          </Group>

          <Text fw={500} mb={5}>
            {finalType}
          </Text>
          <Text>{ParagonPropertyUtils.formatStreetAddress(property)}</Text>
          <Text>{ParagonPropertyUtils.formatCityStateZip(property)}</Text>

          <Space h={10} />
          <Text size="xs" color="gray">
            {property.ListOfficeName}
          </Text>
        </Card>
      </Link>
    );
  }
}
