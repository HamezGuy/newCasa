import { useEffect, useState } from "react";
import DisplayUtils from "@/lib/utils/DisplayUtils";
import ParagonPropertyUtils, {
  getPrimaryPhoto,
} from "@/lib/utils/ParagonPropertyUtils"; // <--- see that we import getPrimaryPhoto
import IParagonMedia, { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import { Badge, Card, Group, Image, Space, Text } from "@mantine/core";
import Link from "next/link";
import style from "./PropertySearchResultCard.module.css";

interface IPropertySearchResultCardProps {
  property: ParagonPropertyWithMedia; // But we only have minimal fields
  size?: "sm" | "md";
  onClick?: (property: ParagonPropertyWithMedia) => void;
}

export default function PropertySearchResultCard({
  property,
  size = "md",
  onClick,
}: IPropertySearchResultCardProps) {
  // default fallback
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

  // Example formatting (assuming you have a DisplayUtils)
  const sPrice = DisplayUtils.formatCurrency(property.ListPrice || 0);
  const sBeds = property.BedroomsTotal || 0;
  // if you track total baths as property.TotBth or BathroomsFull + half
  const sBaths = property.TotBth || `${property.BathroomsFull || 0} Bths`;

  return (
    <Link href={`/property/${property.ListingId}`} className="no-underline">
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        h="100%"
        withBorder
        onClick={() => onClick?.(property)}
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
          {/* example open house */}
          {property.Open_House_Time && <Badge color="green">{property.Open_House_Time}</Badge>}
        </Group>

        <Group justify="flex-start" gap={5} mb="xs">
          <Text>{sBeds} Beds</Text>
          <Text>•</Text>
          <Text>{sBaths}</Text>
        </Group>

        <Text>{ParagonPropertyUtils.formatStreetAddress(property)}</Text>
        <Text>{ParagonPropertyUtils.formatCityStateZip(property)}</Text>

        <Space h={10} />
        <Text size="xs" color="gray">
          {/* maybe property.CoListOfficeName or property.ListOfficeName */}
          {property.ListOfficeName}
        </Text>
      </Card>
    </Link>
  );
}
