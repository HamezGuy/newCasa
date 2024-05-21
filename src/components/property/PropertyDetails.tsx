import DisplayUtils from "@/lib/utils/DisplayUtils";
import ParagonPropertyUtils from "@/lib/utils/ParagonPropertyUtils";
import IParagonProperty from "@/types/IParagonProperty";
import {
  Badge,
  Box,
  Card,
  Divider,
  Flex,
  Group,
  SimpleGrid,
  Space,
  Stack,
  Text,
  Title,
} from "@mantine/core";

interface IPropertyDetailsProps {
  property: IParagonProperty;
}

// Takes a property and displays a full summary of it...
export default function PropertyDetails(props: IPropertyDetailsProps) {
  const { property } = props;

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

      {/* Property Features */}
      <PropertySection title="Features">
        <PropertyFeatures property={property} />
      </PropertySection>

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
            <Text span fw="bold">
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
  property: IParagonProperty;
}

function PropertySection({
  title,
  children,
}: {
  title: String;
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

// Displays the "Property Summary" table...
function PropertySummary({ property }: IPropertySummaryProps) {
  return (
    <>
      <SimpleGrid cols={2}>
        <LabelValueTextDisplay label="MLS #: " value={property.ListingId} />
        <LabelValueTextDisplay
          label="Type: "
          value={property.PropertySubType}
        />
        <LabelValueTextDisplay
          label="Year Built: "
          value={property.YearBuilt ? property.YearBuilt.toString() : ""}
        />
        <LabelValueTextDisplay
          label="Estimated Taxes: "
          value={DisplayUtils.formatCurrency(property.TaxAnnualAmount)}
        />
        <LabelValueTextDisplay
          label="Subdivision: "
          value={property.SubdivisionName}
        />
        <LabelValueTextDisplay
          label="Stories: "
          value={property.StoriesTotal?.toString()}
        />
        <LabelValueTextDisplay
          label="Style: "
          value={property.ArchitecturalStyle?.join(", ")}
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

function PropertyFeatures({ property }: { property: IParagonProperty }) {
  return (
    <>
      <Flex gap={"md"} justify="space-evenly">
        <Stack className="w-full">
          <DetailsSubtitle>Listing Details</DetailsSubtitle>
          <LabelValueTextDisplay label="C/T/V:" value={property.ListingId} />
          <LabelValueTextDisplay
            label="Municipality:"
            value={property.City ?? ""}
          />
          <LabelValueTextDisplay
            label="Status Detail:"
            value={property.StandardStatus}
          />
          <LabelValueTextDisplay
            label="Mailing City:"
            value={property.PostalCity}
          />
          <LabelValueTextDisplay
            label="County:"
            value={property.CountyOrParish}
          />

          {/* <LabelValueTextDisplay
            label="Class:"
            value={"Single Family"}
          /> */}
          <LabelValueTextDisplay label="Type:" value={"Single Family"} />
          {/* <LabelValueTextDisplay
            label="Type of Property:"
            value={""}
          /> */}
          <LabelValueTextDisplay
            label="Items Excluded:"
            value={property.Exclusions}
          />
          <LabelValueTextDisplay
            label="Items Included:"
            value={property.Inclusions}
          />
          <LabelValueTextDisplay
            label="Year Built Source:"
            value={property.YearBuiltSource}
          />
          <LabelValueTextDisplay
            label="Year Built:"
            value={property.YearBuilt?.toString() ?? "unknown"}
          />
          {/* <LabelValueTextDisplay
            label="Above Grade price per sq. ft:"
            value={property?.sq}
          /> */}
          <DetailsSubtitle>Exterior Features</DetailsSubtitle>
          {/* <LabelValueTextDisplay label="Exterior " value={"Vinyl"} /> */}
          <LabelValueTextDisplay
            label="Exterior Features:"
            value={property.ExteriorFeatures?.join(",")}
          />
          <DetailsSubtitle>Garage / Parking</DetailsSubtitle>
          <LabelValueTextDisplay
            label="Driveway:"
            value={
              property.ParkingFeatures?.includes("Paved") ? "Paved" : "Unpaved"
            }
          />
          <LabelValueTextDisplay
            label="Parking Features:"
            value={property.ParkingFeatures?.join(", ")}
          />
          <DetailsSubtitle>Utilities</DetailsSubtitle>
          <LabelValueTextDisplay
            label="Fuel:"
            value={
              property.Heating?.includes("Natural Gas") ? "Natural Gas" : ""
            }
          />
          <LabelValueTextDisplay
            label="Heating Cooling:"
            value={property.Heating?.join(",")}
          />
          {/* <LabelValueTextDisplay label="Water Waste:" value={property} /> */}
          <DetailsSubtitle>Tax Info</DetailsSubtitle>
          {/* <LabelValueTextDisplay label="Land Assessment:" value={property.LandAssessment} /> */}
          <LabelValueTextDisplay
            label="Improvements:"
            value={property.Improvements}
          />
          <LabelValueTextDisplay
            label="Total Assessment:"
            value={property.TaxAssessedValue?.toString()}
          />
          <LabelValueTextDisplay
            label="Assessment Year:"
            value={property.Total_Assess_Year?.toString()}
          />
          <LabelValueTextDisplay
            label="Net Taxes:"
            value={property.TaxAnnualAmount?.toString()}
          />
          <LabelValueTextDisplay
            label="Tax Year:"
            value={property.TaxYear?.toString()}
          />
          <DetailsSubtitle>Buyer Broker Compensation</DetailsSubtitle>
          <LabelValueTextDisplay
            label="Compensation:"
            value={property.BuyerAgencyCompensation?.toString()}
          />
          <LabelValueTextDisplay
            label="Sub-Agency Compensation:"
            value={property.SubAgencyCompensation}
          />
          {/* <LabelValueTextDisplay
            label="Disclaimer:"
            value={property.Disclaimer?.toString()}
          />
          <LabelValueTextDisplay
            label="BrokerAttribContact:"
            value={property.BrokerAttribContact?.toString()}
          /> */}
        </Stack>
        <Stack className="w-full">
          <DetailsSubtitle>Interior Features</DetailsSubtitle>
          <LabelValueTextDisplay
            label="Above Grade Finished Sq Ft:"
            value={property.AboveGradeFinishedArea?.toString()}
          />
          {/* <LabelValueTextDisplay
            label="Finished Sq Ft:"
            value={property.FinishedSqFt}
          /> */}
          <LabelValueTextDisplay
            label="Above Grade Finished Sq Ft:"
            value={property.AboveGradeFinishedArea?.toString()}
          />
          <LabelValueTextDisplay
            label="Above Grade Finished Sq Ft:"
            value={property.AboveGradeFinishedArea?.toString()}
          />

          <LabelValueTextDisplay
            label="Estimated Taxes: "
            value={DisplayUtils.formatCurrency(property.TaxAnnualAmount)}
          />
          <DetailsSubtitle>Lot Info</DetailsSubtitle>
          <DetailsSubtitle>Location Info</DetailsSubtitle>
        </Stack>
      </Flex>
    </>
  );
}

function ListingInformation({ property }: { property: IParagonProperty }) {
  return (
    <Stack>
      <LabelValueTextDisplay
        label="Listing Broker:"
        value={property.ListOfficeName}
      />
      <LabelValueTextDisplay
        label="Listing Agent:"
        value={property.ListAgentFullName}
      />
      <LabelValueTextDisplay
        label="Last Changed:"
        value={property.StatusChangeTimestamp}
      />
      <Text>
        Accuracy of information is not guaranteed and should be verified by
        buyer if material
      </Text>
    </Stack>
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

function DetailsSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <Title order={3} className="text-lg">
      {children}
    </Title>
  );
}
