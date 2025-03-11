// src/components/paragon/PropertySearchResultCard.tsx
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

// Helper function to get property details based on property type
function getPropertyDetails(property: ParagonPropertyWithMedia) {
  // Get property type
  const propertyType = property.PropertyType || "";
  
  // Format price for all property types
  const price = DisplayUtils.formatCurrency(property.ListPrice || 0);
  
  // Default values - ensure all are strings
  let beds: string = "N/A";
  let baths: string = "N/A";
  let acres: string = property.LotSizeAcres ? `${property.LotSizeAcres} acres` : "N/A";
  let sqFt: string = "N/A";
  
  // Determine values based on property type
  switch(propertyType) {
    case "Residential":
      // Residential properties use standard fields
      beds = property.BedroomsTotal !== null && property.BedroomsTotal !== undefined 
        ? `${property.BedroomsTotal}` 
        : "N/A";
      
      // Check different bathroom fields
      if (property.BathroomsFull !== null && property.BathroomsFull !== undefined) {
        const fullBaths = property.BathroomsFull;
        const halfBaths = property.BathroomsHalf || 0;
        baths = halfBaths > 0 ? `${fullBaths}.${halfBaths * 5}` : `${fullBaths}`;
      } else if (property.TotBth) {
        baths = `${property.TotBth}`;
      }
      
      // Get square footage
      sqFt = property.LivingArea || property.AboveGradeFinishedArea 
        ? `${property.LivingArea || property.AboveGradeFinishedArea}` 
        : "N/A";
      break;
      
    case "Multi Family":
      // Multi-family properties use unit-specific fields
      let totalBeds = 0;
      let totalBaths = 0;
      let totalSqFt = 0;
      
      // Calculate totals from unit fields
      const unitCount = property.NumberOfUnitsTotal || 0;
      for (let i = 1; i <= unitCount; i++) {
        // Add bedrooms - use type assertion to avoid TypeScript errors
        const bedroomKey = `U${i}_Number__Bedrooms` as keyof ParagonPropertyWithMedia;
        if (property[bedroomKey] && typeof property[bedroomKey] === 'number') {
          totalBeds += property[bedroomKey] as number;
        }
        
        // Add bathrooms
        const fullBathKey = `U${i}_Full_Baths` as keyof ParagonPropertyWithMedia;
        if (property[fullBathKey] && typeof property[fullBathKey] === 'number') {
          totalBaths += property[fullBathKey] as number;
        }
        
        const halfBathKey = `U${i}_Half_Baths` as keyof ParagonPropertyWithMedia;
        if (property[halfBathKey] && typeof property[halfBathKey] === 'number') {
          totalBaths += (property[halfBathKey] as number) * 0.5;
        }
        
        // Add square footage
        const sqFtKey = `U${i}_SqFt` as keyof ParagonPropertyWithMedia;
        if (property[sqFtKey] && typeof property[sqFtKey] === 'number') {
          totalSqFt += property[sqFtKey] as number;
        }
      }
      
      // Format the values
      beds = unitCount > 0 ? `${unitCount} units` : "N/A";
      baths = totalBaths > 0 ? `${totalBaths}` : "N/A";
      sqFt = totalSqFt > 0 ? `${totalSqFt}` : (property.LivingArea ? `${property.LivingArea}` : "N/A");
      break;
      
    case "Commercial Sale":
      // Commercial properties focus on building specs
      beds = property.NumberOfUnitsTotal 
        ? `${property.NumberOfUnitsTotal} units` 
        : "N/A";
      baths = "N/A";
      
      // Ensure sqFt is a string
      if (property.BuildingAreaTotal) {
        sqFt = `${property.BuildingAreaTotal}`;
      } else if (property.LeasableArea) {
        sqFt = `${property.LeasableArea}`;
      } else {
        sqFt = "N/A";
      }
      
      // Some commercial properties might have lot size in LotSizeArea instead
      if (!property.LotSizeAcres && property.LotSizeArea) {
        acres = `${property.LotSizeArea} acres`;
      }
      break;
      
    case "Land":
      // Land properties primarily use lot size
      beds = property.NumberOfLots && property.NumberOfLots > 1 ? `${property.NumberOfLots} lots` : "N/A";
      baths = "N/A";
      sqFt = "N/A";
      break;
      
    default:
      // For any other property types, use standard fields if available
      beds = property.BedroomsTotal !== null && property.BedroomsTotal !== undefined 
        ? `${property.BedroomsTotal}` 
        : "N/A";
      
      if (property.BathroomsFull !== null && property.BathroomsFull !== undefined) {
        const fullBaths = property.BathroomsFull;
        const halfBaths = property.BathroomsHalf || 0;
        baths = halfBaths > 0 ? `${fullBaths}.${halfBaths * 5}` : `${fullBaths}`;
      } else if (property.TotBth) {
        baths = `${property.TotBth}`;
      }
      
      // Ensure sqFt is a string
      if (property.LivingArea) {
        sqFt = `${property.LivingArea}`;
      } else if (property.AboveGradeFinishedArea) {
        sqFt = `${property.AboveGradeFinishedArea}`;
      } else {
        sqFt = "N/A";
      }
  }
  
  return { price, beds, baths, acres, sqFt };
}

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
  
  // Get property details based on property type
  const { price, beds, baths, acres, sqFt } = getPropertyDetails(property);

  const subTypeRaw = property.PropertySubType ?? "";
  const finalType = subTypeRaw.trim() ? subTypeRaw : property.PropertyType;

  // Small style fix so text doesn't overflow
  const cardStyleFix = {
    whiteSpace: "normal" as const,
    overflowWrap: "anywhere" as const,
  };

  // Generate the appropriate property details display
  const renderPropertyDetails = () => {
    const propertyType = property.PropertyType || "";
    
    if (propertyType === "Land") {
      return (
        <Group justify="flex-start" gap={5} mb="xs">
          <Text>{acres}</Text>
          {beds !== "N/A" && <Text>• {beds}</Text>}
        </Group>
      );
    } else if (propertyType === "Commercial Sale") {
      return (
        <Group justify="flex-start" gap={5} mb="xs">
          {sqFt !== "N/A" && <Text>{sqFt} sqft</Text>}
          {beds !== "N/A" && <Text>• {beds}</Text>}
          {acres !== "N/A" && <Text>• {acres}</Text>}
        </Group>
      );
    } else if (propertyType === "Multi Family") {
      return (
        <Group justify="flex-start" gap={5} mb="xs">
          <Text>{beds}</Text>
          {sqFt !== "N/A" && <Text>• {sqFt} sqft</Text>}
          {property.GrossIncome && (
            <Text>• ${property.GrossIncome}/mo</Text>
          )}
        </Group>
      );
    } else {
      // Residential
      return (
        <Group justify="flex-start" gap={5} mb="xs">
          {beds !== "N/A" && <Text>{beds} Beds</Text>}
          {beds !== "N/A" && baths !== "N/A" && <Text>•</Text>}
          {baths !== "N/A" && <Text>{baths} Baths</Text>}
          {(beds !== "N/A" || baths !== "N/A") && sqFt !== "N/A" && <Text>•</Text>}
          {sqFt !== "N/A" && <Text>{sqFt} sqft</Text>}
        </Group>
      );
    }
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
            <Text fw="bold">{price}</Text>
            {property.Open_House_Time && <Badge color="green">{property.Open_House_Time}</Badge>}
          </Group>

          {renderPropertyDetails()}

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
            <Text fw="bold">{price}</Text>
            {property.Open_House_Time && <Badge color="green">{property.Open_House_Time}</Badge>}
          </Group>

          {renderPropertyDetails()}

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