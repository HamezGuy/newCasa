"use client";

import { useEffect, useState } from "react";
import DisplayUtils from "@/lib/utils/DisplayUtils";
import ParagonPropertyUtils, {
  getPrimaryPhoto,
} from "@/lib/utils/ParagonPropertyUtils";
import IParagonMedia, { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import { Badge, Card, Group, Image, Space, Text } from "@mantine/core";
import Link from "next/link";

import style from "./PropertySearchResultCard.module.css";

interface IPropertySearchResultCardProps {
  property: ParagonPropertyWithMedia;
  size?: "sm" | "md";
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

  // CHANGED: Add a small style fix so text doesn't overflow
  const cardStyleFix = {
    whiteSpace: "normal" as const,
    overflowWrap: "anywhere" as const,
  };

  if (onClick) {
    // If parent gave onClick => we do a custom onClick (modal)
    return (
      <div style={{ cursor: "pointer" }} onClick={() => onClick(property)}>
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          h="100%"
          withBorder
          className={size === "md" ? style.propertyCard : style.propertyCardSmall}
          // CHANGED: ensure no overflow
          style={cardStyleFix}
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
    // Normal Link to detail page
    return (
      <Link href={`/property/${property.ListingId}`} className="no-underline">
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          h="100%"
          withBorder
          className={size === "md" ? style.propertyCard : style.propertyCardSmall}
          style={cardStyleFix} // CHANGED
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
