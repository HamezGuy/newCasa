import { useEffect, useState } from 'react'; // ADDED
import DisplayUtils from '@/lib/utils/DisplayUtils';
import ParagonPropertyUtils, {
  getPrimaryPhoto,
} from '@/lib/utils/ParagonPropertyUtils';
import IParagonMedia, { ParagonPropertyWithMedia } from '@/types/IParagonMedia';
import { Badge, Card, Group, Image, Space, Text } from '@mantine/core';
import Link from 'next/link';
import style from './PropertySearchResultCard.module.css';

interface IPropertySearchResultCardProps {
  property: ParagonPropertyWithMedia;
  size?: 'sm' | 'md';
  onClick?: (property: ParagonPropertyWithMedia) => void;
}

export default function PropertySearchResultCard({
  property,
  size = 'md',
  onClick,
}: IPropertySearchResultCardProps) {
  const imgUrl = '/img/placeholder.png';

  // ADDED: local state to hold the resolved primaryPhoto (IParagonMedia | null)
  const [primaryPhoto, setPrimaryPhoto] = useState<null | IParagonMedia>(null);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      // Because getPrimaryPhoto is now async, we must await it
      const result = await getPrimaryPhoto(property);
      if (!isCancelled) {
        setPrimaryPhoto(result);
      }
    })();

    // Cleanup function
    return () => {
      isCancelled = true;
    };
  }, [property]); // Re-run if property changes

  const sPrice = DisplayUtils.formatCurrency(property.ListPrice);
  const sOpenHouse = ParagonPropertyUtils.getOpenHouseTime(property);

  return (
    <Link href={`/property/${property.ListingId}`} className="no-underline">
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        h="100%"
        withBorder
        onClick={() => onClick?.(property)}
        className={size === 'md' ? style.propertyCard : style.propertyCardSmall}
      >
        <Card.Section>
          <Image
            // CHANGED: now we check primaryPhoto in state
            src={primaryPhoto ? primaryPhoto.MediaURL : imgUrl}
            height={size === 'sm' ? 150 : 256}
            width={384}
            alt="Listing"
            mah={size === 'sm' ? 150 : 256}
            className=""
          />
        </Card.Section>

        <Group justify="space-between" mt="md" mb={size === 'sm' ? 4 : 16}>
          <Text fw="bold">{sPrice}</Text>
          {sOpenHouse && <Badge color="green">{sOpenHouse}</Badge>}
        </Group>

        <Group justify="flex-start" gap={5} mb="xs">
          <Text>{property.BedroomsTotal} Beds</Text>
          <Text>•</Text>
          <Text>{property.TotBth} Baths</Text>
          <Text>•</Text>
          <Text>{(property.LivingArea ?? '').toLocaleString()} Sqft</Text>
        </Group>

        <Text>{ParagonPropertyUtils.formatStreetAddress(property)}</Text>
        <Text>{ParagonPropertyUtils.formatCityStateZip(property)}</Text>

        <Space h={10} />
        <Text size="xs" color="gray">
          {property.CoListOfficeName}
        </Text>
      </Card>
    </Link>
  );
}
