import DisplayUtils from '@/lib/utils/DisplayUtils';
import ParagonPropertyUtils, { getPrimaryPhoto } from '@/lib/utils/ParagonPropertyUtils';
import { ParagonPropertyWithMedia } from '@/types/IParagonMedia';
import { Badge, Card, Group, Image, Space, Text } from '@mantine/core';

interface IPropertySearchResultCardProps {
  property: ParagonPropertyWithMedia;
  onClick?: (property: ParagonPropertyWithMedia) => void;
}

// Displays a single property in a card to be used as a search result...
export default function PropertySearchResultCard(props: IPropertySearchResultCardProps) {
  const { property } = props;

  const imgUrl = 'https://images.homesnap.com/listings/302/0946014463-164279961-original.jpg';
  const primaryPhoto = getPrimaryPhoto(property);
  const sPrice = DisplayUtils.formatCurrency(property.ListPrice);
  const sOpenHouse = ParagonPropertyUtils.getOpenHouseTime(property);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder onClick={() => props.onClick?.(property)}>
      <Card.Section>
        <Image src={primaryPhoto ? primaryPhoto.MediaURL : imgUrl} height={256} width={384} alt="Listing" mah={256} className={''}/>
      </Card.Section>

      {/* Price / Open House */}
      <Group justify="space-between" mt="md" mb="xs">
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
      <Text size="xs" color="gray">{property.CoListOfficeName}</Text>
    </Card>
  );
}