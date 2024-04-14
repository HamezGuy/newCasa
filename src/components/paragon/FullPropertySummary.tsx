import DisplayUtils from "@/lib/utils/DisplayUtils";
import ParagonPropertyUtils from "@/lib/utils/ParagonPropertyUtils";
import IParagonProperty from "@/types/IParagonProperty";
import {
  Badge,
  Box,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Space,
  Stack,
  Text,
} from "@mantine/core";

interface IFullPropertySummaryProps {
  property: IParagonProperty;
}

// Takes a property and displays a full summary of it...
export default function FullPropertySummary(props: IFullPropertySummaryProps) {
  const { property } = props;

  // TODO: Get the actual image
  const imgUrl =
    "https://images.homesnap.com/listings/302/0946014463-164279961-original.jpg";

  return (
    <>
      {/* Image */}
      {/* <Image src={imgUrl} height={256} width={384} alt="Listing" /> */}

      {/* Header */}
      <PropertyHeader property={property} />

      {/* Status Card */}
      <Space h={20} />
      <PropertyStatus
        numBeds={property.BedroomsTotal}
        numBaths={property.TotBth ? parseFloat(property.TotBth) : undefined}
        acres={property.LotSizeAcres}
        sqft={property.LivingArea}
        yearBuilt={property.YearBuilt}
      />

      {/* Description */}
      <Space h={10} />
      <Text>{property.PublicRemarks}</Text>

      {/* Property Summary */}
      <Space h={20} />
      <PropertySummary
        mlsNumber={property.ListingId}
        style={property.ArchitecturalStyle.join(", ")}
        type="Single Family, Multi-level"
        yearBuilt={property.YearBuilt}
        estimatedTaxes={property.TaxAnnualAmount}
      />
    </>
  );
}

//
// PRIVATE COMPONENTS
//

interface IPropertyHeaderProps {
  property: IParagonProperty;
}

// Displays the header of the property summary
// This is the address and price in large letters and some other info
function PropertyHeader(props: IPropertyHeaderProps) {
  const { property } = props;

  const isForSale = true; // TODO: How do we detect that?
  const sOpenHouse = ParagonPropertyUtils.getOpenHouseTime(property);
  const estimatedMortgage = 3225; // TODO: How do we get this?

  return (
    <Box py={10}>
      {/* For Sale / Open House Badges */}
      <Group>
        {isForSale && (
          <Badge color="green" size="lg">
            For Sale
          </Badge>
        )}
        {sOpenHouse && (
          <Badge color="green" size="lg">
            {sOpenHouse}
          </Badge>
        )}
      </Group>

      {/* Address on Left; Price/Mortgage on Right */}
      <Space h={10} />
      <Group justify="space-between">
        <Stack gap={0}>
          <Text fw={500} style={{ fontSize: "24px" }}>
            {ParagonPropertyUtils.formatStreetAddress(property)}
          </Text>
          <Text fw={500} style={{ fontSize: "24px" }}>
            {ParagonPropertyUtils.formatCityStateZip(property)}
          </Text>
        </Stack>

        <Stack gap={0}>
          <Text size="sm">
            Est. Mortgage:
            <Text display="inline" fw="bold">
              &nbsp;{DisplayUtils.formatCurrency(estimatedMortgage)}
            </Text>
          </Text>
          <Text fw={500} style={{ fontSize: "32px" }} color="green">
            {DisplayUtils.formatCurrency(property.ListPrice)}
          </Text>
        </Stack>
      </Group>
    </Box>
  );
}

interface IPropertySummaryProps {
  mlsNumber?: string;
  style?: string;
  type?: string;
  yearBuilt?: number;
  estimatedTaxes?: number;
}

// Displays the "Property Summary" table...
function PropertySummary(props: IPropertySummaryProps) {
  return (
    <>
      <Text size="xl">Property Summary</Text>
      <Divider py={10} mt={0} />

      <SimpleGrid cols={2}>
        <LabelValueTextDisplay label="MLS Number: " value={props.mlsNumber} />
        <LabelValueTextDisplay label="Style: " value={props.style} />
        <LabelValueTextDisplay label="Type: " value={props.type} />
        <LabelValueTextDisplay
          label="Year Built: "
          value={props.yearBuilt ? props.yearBuilt.toString() : ""}
        />
        <LabelValueTextDisplay
          label="Estimated Taxes: "
          value={DisplayUtils.formatCurrency(props.estimatedTaxes)}
        />
      </SimpleGrid>
    </>
  );
}

interface IPropertyStatusProps {
  numBeds?: number;
  numBaths?: number;
  acres?: number;
  sqft?: number;
  yearBuilt?: number;
}

// Displays status of property as a card with a colorful bottom border...
function PropertyStatus(props: IPropertyStatusProps) {
  return (
    <Card
      radius={0}
      withBorder
      bg="#f9f9f9"
      style={{
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderBottom: "3px solid green",
      }}
    >
      <SimpleGrid cols={5}>
        <Stack align="center" gap={0} style={{ borderRight: "1px solid #CCC" }}>
          <Text style={{ fontSize: "32px" }}>{props.numBeds ?? "-"}</Text>
          <Text style={{ textTransform: "uppercase" }}>Beds</Text>
        </Stack>

        <Stack align="center" gap={0} style={{ borderRight: "1px solid #CCC" }}>
          <Text style={{ fontSize: "32px" }}>{props.numBaths ?? "-"}</Text>
          <Text style={{ textTransform: "uppercase" }}>Baths</Text>
        </Stack>

        <Stack align="center" gap={0} style={{ borderRight: "1px solid #CCC" }}>
          <Text style={{ fontSize: "32px" }}>{props.acres ?? "-"}</Text>
          <Text style={{ textTransform: "uppercase" }}>Acres</Text>
        </Stack>

        <Stack align="center" gap={0} style={{ borderRight: "1px solid #CCC" }}>
          <Text style={{ fontSize: "32px" }}>
            {props.sqft ? props.sqft.toLocaleString() : "-"}
          </Text>
          <Text style={{ textTransform: "uppercase" }}>Sqft</Text>
        </Stack>

        <Stack align="center" gap={0}>
          <Text style={{ fontSize: "32px" }}>{props.yearBuilt ?? "-"}</Text>
          <Text style={{ textTransform: "uppercase" }}>Year Built</Text>
        </Stack>
      </SimpleGrid>
    </Card>
  );
}

// Displays a label in bold with a value next to it...
function LabelValueTextDisplay(props: { label?: string; value?: string }) {
  return (
    <Group gap={0}>
      <Text fw="bold">{props.label ?? ""}</Text>
      <Text pl={5}>{props.value ?? ""}</Text>
    </Group>
  );
}
