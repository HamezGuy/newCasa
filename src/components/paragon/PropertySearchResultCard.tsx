import DisplayUtils from "@/lib/utils/DisplayUtils";
import ParagonPropertyUtils from "@/lib/utils/ParagonPropertyUtils";
import IParagonProperty from "@/types/IParagonProperty";
import { Badge, Card, Group, Image, Space, Text } from "@mantine/core";

interface IPropertySearchResultCardProps {
    property: IParagonProperty;
    onClick?: (property: IParagonProperty) => void;
}

// Displays a single property in a card to be used as a search result...
export default function PropertySearchResultCard(props: IPropertySearchResultCardProps) {
    const { property } = props;

    // TODO: Get the actual image
    const imgUrl = "https://images.homesnap.com/listings/302/0946014463-164279961-original.jpg";
    const sPrice = DisplayUtils.formatCurrency(property.ListPrice);
    const sOpenHouse = ParagonPropertyUtils.getOpenHouseTime(property);

    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder onClick={() => props.onClick?.(property)}>
            <Card.Section>
                <Image src={imgUrl} height={256} width={384} alt="Listing" />
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
                <Text>{(property.LivingArea ?? "").toLocaleString()} Sqft</Text>
            </Group>

            {/* Address (2 lines) */}
            <Text>{ParagonPropertyUtils.formatStreetAddress(property)}</Text>
            <Text>{ParagonPropertyUtils.formatCityStateZip(property)}</Text>

            <Space h={10} />
            <Text size="xs" color="gray">{property.CoListOfficeName}</Text>
        </Card>
    );
}