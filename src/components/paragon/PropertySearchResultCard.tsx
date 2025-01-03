import DisplayUtils from '@/lib/utils/DisplayUtils';
import ParagonPropertyUtils, {
  getPrimaryPhoto,
} from '@/lib/utils/ParagonPropertyUtils';
import { ParagonPropertyWithMedia } from '@/types/IParagonMedia';
import { Badge, Card, Group, Image, Space, Text } from '@mantine/core';
import Link from 'next/link';
import style from './PropertySearchResultCard.module.css';

interface IPropertySearchResultCardProps {
  property: ParagonPropertyWithMedia;
  size?: 'sm' | 'md';
  onClick?: (property: ParagonPropertyWithMedia) => void;
}

// Displays a single property in a card to be used as a search result...
export default function PropertySearchResultCard({
  property,
  size = 'md',
  onClick,
}: IPropertySearchResultCardProps) {
  //TODO: design a better placeholder
  const imgUrl = '/img/placeholder.png';
  const primaryPhoto = getPrimaryPhoto(property);
  const sPrice = DisplayUtils.formatCurrency(property.ListPrice);
  const sOpenHouse = ParagonPropertyUtils.getOpenHouseTime(property);

  return (
    <Link href={`/property/${property.ListingId}`} className={`no-underline`}>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        h="100%"
        withBorder
        onClick={() => onClick?.(property)}
        className={size == 'md' ? style.propertyCard : style.propertyCardSmall}
      >
        <Card.Section>
          <Image
            src={primaryPhoto ? primaryPhoto.MediaURL : imgUrl}
            height={size == 'sm' ? 150 : 256}
            width={384}
            alt="Listing"
            mah={size == 'sm' ? 150 : 256}
            className={''}
          />
        </Card.Section>

        {/* Price / Open House */}
        <Group justify="space-between" mt="md" mb={size == 'sm' ? 4 : 16}>
          <Text fw="bold">{sPrice}</Text>
          {sOpenHouse && <Badge color="green">{sOpenHouse}</Badge>}
        </Group>

        {/* Beds / Baths / Sqft */}
        <Group justify="flex-start" gap={5} mb="xs">
          <Text>{property.BedroomsTotal} Beds</Text>
          <Text>•</Text>
          <Text>{property.TotBth} Baths</Text>
          <Text>•</Text>
          <Text>{(property.LivingArea ?? '').toLocaleString()} Sqft</Text>
        </Group>

        {/* Address (2 lines) */}
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
