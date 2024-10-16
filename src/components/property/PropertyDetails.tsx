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
  Title
} from "@mantine/core";

interface IPropertyDetailsProps {
  property: IParagonProperty;
  userRole: string; // Assuming 'realtor' or 'client'
  userUid?: string | null; // To track if the user is logged in
}

// Main PropertyDetails component displaying a full summary
export default function PropertyDetails(props: IPropertyDetailsProps) {
  const { property, userRole, userUid } = props;

  return (
    <>
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
      <Space h={20} />
      <Text>{property.PublicRemarks}</Text>

      {/* Property Summary */}
      <Space h={80} />
      <PropertySection title="Property Summary">
        <PropertySummary property={property} />
      </PropertySection>

      {/* Property Features (reuse PropertySummary for simplicity) */}
      <PropertySection title="Features">
        <PropertySummary property={property} />
      </PropertySection>

      {/* Documents and Realtor Information */}
      {userUid && userRole === "realtor" ? (
        <PropertySection title="Documents and Realtor Information">
          <RealtorInformation property={property} />
        </PropertySection>
      ) : (
        <Text>
          You need to be a logged-in realtor to view additional property details.
        </Text>
      )}

      {/* Listing Information */}
      <PropertySection
        title={`Listing Information for MLS #${property.ListAgentMlsId}`}
      >
        <ListingInformation property={property} />
      </PropertySection>
    </>
  );
}

//
// PRIVATE COMPONENTS
//

// PropertySummary: Displays property summary information
function PropertySummary({ property }: { property: IParagonProperty }) {
  return (
    <SimpleGrid cols={2}>
      <LabelValueTextDisplay label="MLS #:" value={property.ListingId} />
      <LabelValueTextDisplay label="Type:" value={property.PropertySubType} />
      <LabelValueTextDisplay label="Year Built:" value={property.YearBuilt?.toString() ?? ""} />
      <LabelValueTextDisplay
        label="Estimated Taxes:"
        value={DisplayUtils.formatCurrency(property.TaxAnnualAmount)}
      />
      <LabelValueTextDisplay label="Subdivision:" value={property.SubdivisionName} />
      <LabelValueTextDisplay label="Stories:" value={property.StoriesTotal?.toString()} />
      <LabelValueTextDisplay label="Style:" value={property.ArchitecturalStyle?.join(", ")} />
    </SimpleGrid>
  );
}

// ListingInformation: Displays listing agent and broker info
function ListingInformation({ property }: { property: IParagonProperty }) {
  return (
    <Stack>
      <LabelValueTextDisplay label="Listing Broker:" value={property.ListOfficeName} />
      <LabelValueTextDisplay label="Listing Agent:" value={property.ListAgentFullName} />
      <LabelValueTextDisplay label="Last Changed:" value={property.StatusChangeTimestamp} />
      <Text>
        Accuracy of information is not guaranteed and should be verified by the buyer if material.
      </Text>
    </Stack>
  );
}

// PropertySection: A reusable section component
function PropertySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Title order={2} mt={40} mb={10} className="normal-case font-normal">
        {title}
      </Title>
      <Divider py={10} mt={0} />
      {children}
    </>
  );
}

// PropertyStatus: Displays status information of the property
interface IPropertyStatusProps {
  numBeds?: number;
  numBaths?: number;
  acres?: number;
  sqft?: number;
  yearBuilt?: number;
}

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

// RealtorInformation: Displays realtor-specific details
function RealtorInformation({ property }: { property: IParagonProperty }) {
  return (
    <Stack>
      <DetailsSubtitle>Documents Available</DetailsSubtitle>
      {property.DocumentsAvailable && property.DocumentsAvailable.length > 0 ? (
        <ul>
          {property.DocumentsAvailable.map((document, index) => (
            <li key={index}>{document}</li>
          ))}
        </ul>
      ) : (
        <Text>No documents available for this property.</Text>
      )}

      <DetailsSubtitle>Realtor Information</DetailsSubtitle>
      <LabelValueTextDisplay label="Listing Agent:" value={property.ListAgentFullName} />
      <LabelValueTextDisplay label="Listing Agent Email:" value={property.ListAgentEmail} />
    </Stack>
  );
}

// PropertyHeader: Displays the header section of the property
function PropertyHeader({ property }: { property: IParagonProperty }) {
  const isForSale = true;
  const sOpenHouse = ParagonPropertyUtils.getOpenHouseTime(property);
  const estimatedMortgage = 3225;

  return (
    <Box py={10}>
      <Group>
        {isForSale && <Badge color="green" size="lg">For Sale</Badge>}
        {sOpenHouse && <Badge color="green" size="lg">{sOpenHouse}</Badge>}
      </Group>
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
            Est. Mortgage: <Text span fw="bold">&nbsp;{DisplayUtils.formatCurrency(estimatedMortgage)}</Text>
          </Text>
          <Text fw={500} style={{ fontSize: "32px" }} color="green">
            {DisplayUtils.formatCurrency(property.ListPrice)}
          </Text>
        </Stack>
      </Group>
    </Box>
  );
}

// LabelValueTextDisplay: General component for displaying a label and value
function LabelValueTextDisplay({ label, value }: { label?: string; value?: string }) {
  return (
    <Group gap={0}>
      <Text fw="bold">{label ?? ""}</Text>
      <Text pl={5}>{value ?? ""}</Text>
    </Group>
  );
}

// DetailsSubtitle: Displays subtitles for sections
function DetailsSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <Title order={3} className="text-lg">
      {children}
    </Title>
  );
}
