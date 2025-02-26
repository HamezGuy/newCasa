// src/components/property/PropertyDetails.tsx
"use client";

import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import DisplayUtils from "@/lib/utils/DisplayUtils";
import { useState } from "react";
import { Accordion, Badge, Group, Text, Button, CopyButton, Tooltip } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconShare, IconCheck, IconCopy } from "@tabler/icons-react";
import ParagonPropertyUtils from "@/lib/utils/ParagonPropertyUtils";

interface PropertyDetailsProps {
  property: ParagonPropertyWithMedia;
  userRole?: string;
  userUid: string | null;
}

export default function PropertyDetails({
  property,
  userRole = "user",
  userUid,
}: PropertyDetailsProps) {
  // Format values for display
  const price = DisplayUtils.formatCurrency(property.ListPrice || 0);
  const address = ParagonPropertyUtils.formatStreetAddress(property);
  const cityStateZip = ParagonPropertyUtils.formatCityStateZip(property);
  
  // Calculate mortgage estimate (very simplified)
  const estimatedMortgage = property.ListPrice 
    ? DisplayUtils.formatCurrency((property.ListPrice * 0.005) / 12) 
    : "N/A";

  const yearBuilt = property.YearBuilt || "N/A";
  const acres = property.LotSizeAcres || "N/A";
  const sqFt = property.LivingArea || property.AboveGradeFinishedArea || "N/A";
  const beds = property.BedroomsTotal || 0;
  const baths = property.TotBth || `${property.BathroomsFull || 0}.${property.BathroomsHalf ? 5 : 0}`;

  // Format property summary fields
  const mlsNumber = property.ListingId || "N/A";
  const propertyType = property.PropertySubType || property.PropertyType || "N/A";
  const style = property.ArchitecturalStyle && property.ArchitecturalStyle.length > 0 
    ? property.ArchitecturalStyle[0] 
    : "N/A";
  const stories = property.Levels && property.Levels.length > 0 
    ? property.Levels.join(", ") 
    : "N/A";
  const taxes = property.TaxAnnualAmount 
    ? DisplayUtils.formatCurrency(property.TaxAnnualAmount) 
    : "N/A";
    
  // Get current URL for sharing
  const propertyUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/properties/${property.ListingId}` 
    : '';

  return (
    <div>
      {/* Main property information (always visible) */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge color="green">For Sale</Badge>
              <CopyButton value={propertyUrl} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? "Copied!" : "Copy link"} withArrow position="right">
                    <Button 
                      variant="subtle" 
                      color={copied ? "teal" : "blue"} 
                      onClick={copy} 
                      size="xs"
                    >
                      <div className="flex items-center">
                        {copied ? <IconCheck size={16} className="mr-1" /> : <IconShare size={16} className="mr-1" />}
                        {copied ? "Copied" : "Share"}
                      </div>
                    </Button>
                  </Tooltip>
                )}
              </CopyButton>
            </div>
            <div className="text-sm text-gray-600 mb-1">Est. Mortgage: {estimatedMortgage}/mo</div>
            <h1 className="text-3xl font-bold">{price}</h1>
            <p className="text-xl mb-1">{address}</p>
            <p className="text-lg text-gray-700">{cityStateZip}</p>
          </div>
        </div>

        {/* Key property stats */}
        <div className="grid grid-cols-5 gap-2 mt-4 bg-gray-50 p-4 rounded-lg text-center">
          <div>
            <div className="text-xl font-semibold">{beds}</div>
            <div className="text-sm text-gray-500">Beds</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{baths}</div>
            <div className="text-sm text-gray-500">Baths</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{acres}</div>
            <div className="text-sm text-gray-500">Acres</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{sqFt}</div>
            <div className="text-sm text-gray-500">SQ FT</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{yearBuilt}</div>
            <div className="text-sm text-gray-500">Year Built</div>
          </div>
        </div>

        {/* Property description */}
        <div className="mt-6">
          <p className="text-gray-700">{property.PublicRemarks}</p>
        </div>
      </div>

      {/* Detailed property information in accordions */}
      <Accordion variant="separated" className="mt-4">
        {/* Property Summary */}
        <Accordion.Item value="property-summary">
          <Accordion.Control>
            <Text fw={600}>Property Summary</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <Text fw={600} size="sm">MLS #:</Text>
                <Text size="sm">{mlsNumber}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Style:</Text>
                <Text size="sm">{style}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Type:</Text>
                <Text size="sm">{propertyType}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Year Built:</Text>
                <Text size="sm">{yearBuilt}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Est. Taxes:</Text>
                <Text size="sm">{taxes}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Stories:</Text>
                <Text size="sm">{stories}</Text>
              </div>
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Listing Details */}
        <Accordion.Item value="listing-details">
          <Accordion.Control>
            <Text fw={600}>Listing Details</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <Text fw={600} size="sm">City/Town/Village:</Text>
                <Text size="sm">{property.City || "N/A"}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Municipality:</Text>
                <Text size="sm">{property.City_Town_orVillage || "N/A"}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Status:</Text>
                <Text size="sm">{property.StandardStatus || "N/A"}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">County:</Text>
                <Text size="sm">{property.CountyOrParish || "N/A"}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Class:</Text>
                <Text size="sm">{property.PropertyType || "N/A"}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Type:</Text>
                <Text size="sm">{property.PropertySubType || property.PropertyType || "N/A"}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Architecture:</Text>
                <Text size="sm">
                  {property.ArchitecturalStyle && property.ArchitecturalStyle.length > 0 
                    ? property.ArchitecturalStyle.join(", ") 
                    : "N/A"}
                </Text>
              </div>
              <div>
                <Text fw={600} size="sm">Year Built:</Text>
                <Text size="sm">{property.YearBuilt || "N/A"} 
                  {property.YearBuiltSource ? ` (${property.YearBuiltSource})` : ""}
                </Text>
              </div>
            </div>
            <div className="mt-3">
              <Text fw={600} size="sm">Items Included:</Text>
              <Text size="sm">{property.Inclusions || "None specified"}</Text>
            </div>
            <div className="mt-3">
              <Text fw={600} size="sm">Items Excluded:</Text>
              <Text size="sm">{property.Exclusions || "None specified"}</Text>
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Interior Features */}
        <Accordion.Item value="interior-features">
          <Accordion.Control>
            <Text fw={600}>Interior Features</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <Text fw={600} size="sm">Square Footage:</Text>
                <Text size="sm">
                  {property.AboveGradeFinishedArea ? `${property.AboveGradeFinishedArea} (Above Grade)` : "N/A"}
                  {property.BelowGradeFinishedArea ? `, ${property.BelowGradeFinishedArea} (Below Grade)` : ""}
                  {property.LivingArea ? `, ${property.LivingArea} (Total)` : ""}
                </Text>
              </div>
              <div>
                <Text fw={600} size="sm">Bedrooms:</Text>
                <Text size="sm">{property.BedroomsTotal || "N/A"}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Bathrooms:</Text>
                <Text size="sm">
                  {property.BathroomsFull ? `${property.BathroomsFull} Full` : ""}
                  {property.BathroomsHalf ? `, ${property.BathroomsHalf} Half` : ""}
                  {!property.BathroomsFull && !property.BathroomsHalf ? "N/A" : ""}
                </Text>
              </div>
            </div>

            {/* Room details */}
            {(property.Primary_Bed_Dim_258 || property.Primary_BedRm_Lvl_67) && (
              <div className="mt-3">
                <Text fw={600} size="sm">Master Bedroom:</Text>
                <Text size="sm">
                  {property.Primary_Bed_Dim_258 ? `Dimensions: ${property.Primary_Bed_Dim_258}` : ""}
                  {property.Primary_BedRm_Lvl_67 ? `, Level: ${property.Primary_BedRm_Lvl_67}` : ""}
                </Text>
              </div>
            )}
            
            {(property.Bedroom_2_Dim_259 || property.Bedroom_2_Lvl_68) && (
              <div className="mt-2">
                <Text fw={600} size="sm">Bedroom 2:</Text>
                <Text size="sm">
                  {property.Bedroom_2_Dim_259 ? `Dimensions: ${property.Bedroom_2_Dim_259}` : ""}
                  {property.Bedroom_2_Lvl_68 ? `, Level: ${property.Bedroom_2_Lvl_68}` : ""}
                </Text>
              </div>
            )}
            
            {(property.Bedroom_3_Dim_260 || property.Bedroom_3_Lvl_69) && (
              <div className="mt-2">
                <Text fw={600} size="sm">Bedroom 3:</Text>
                <Text size="sm">
                  {property.Bedroom_3_Dim_260 ? `Dimensions: ${property.Bedroom_3_Dim_260}` : ""}
                  {property.Bedroom_3_Lvl_69 ? `, Level: ${property.Bedroom_3_Lvl_69}` : ""}
                </Text>
              </div>
            )}
            
            {(property.Kitchen_Dim_255 || property.Kitchen_Lvl_64) && (
              <div className="mt-2">
                <Text fw={600} size="sm">Kitchen:</Text>
                <Text size="sm">
                  {property.Kitchen_Dim_255 ? `Dimensions: ${property.Kitchen_Dim_255}` : ""}
                  {property.Kitchen_Lvl_64 ? `, Level: ${property.Kitchen_Lvl_64}` : ""}
                </Text>
              </div>
            )}
            
            {(property.Living_Or_Great_Dim_254 || property.Living_Or_Great_Room_Lvl_63) && (
              <div className="mt-2">
                <Text fw={600} size="sm">Living Room:</Text>
                <Text size="sm">
                  {property.Living_Or_Great_Dim_254 ? `Dimensions: ${property.Living_Or_Great_Dim_254}` : ""}
                  {property.Living_Or_Great_Room_Lvl_63 ? `, Level: ${property.Living_Or_Great_Room_Lvl_63}` : ""}
                </Text>
              </div>
            )}
            
            {(property.Dining_Room_Dim_256 || property.Dining_Room_Lvl_65) && (
              <div className="mt-2">
                <Text fw={600} size="sm">Dining Room:</Text>
                <Text size="sm">
                  {property.Dining_Room_Dim_256 ? `Dimensions: ${property.Dining_Room_Dim_256}` : ""}
                  {property.Dining_Room_Lvl_65 ? `, Level: ${property.Dining_Room_Lvl_65}` : ""}
                </Text>
              </div>
            )}

            {/* Basement */}
            <div className="mt-3">
              <Text fw={600} size="sm">Basement:</Text>
              <Text size="sm">
                {property.Basement && property.Basement.length > 0 
                  ? property.Basement.join(", ") 
                  : "N/A"}
              </Text>
            </div>

            {/* Fireplace */}
            <div className="mt-3">
              <Text fw={600} size="sm">Fireplace:</Text>
              <Text size="sm">
                {property.FireplaceYN ? 
                  `Yes${property.FireplacesTotal ? ` (${property.FireplacesTotal})` : ''}` : 
                  "No"}
              </Text>
            </div>

            {/* Interior amenities */}
            <div className="mt-3">
              <Text fw={600} size="sm">Interior Amenities:</Text>
              <Text size="sm">
                {property.InteriorFeatures && property.InteriorFeatures.length > 0 
                  ? property.InteriorFeatures.join(", ") 
                  : "None specified"}
              </Text>
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Exterior Features */}
        <Accordion.Item value="exterior-features">
          <Accordion.Control>
            <Text fw={600}>Exterior Features</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {/* Waterfront */}
              {property.WaterfrontYN && (
                <div>
                  <Text fw={600} size="sm">Waterfront:</Text>
                  <Text size="sm">
                    {property.WaterfrontYN ? "Yes" : "No"}
                    {property.WaterBodyName ? ` (${property.WaterBodyName})` : ""}
                  </Text>
                </div>
              )}
              
              {/* Exterior */}
              <div>
                <Text fw={600} size="sm">Exterior:</Text>
                <Text size="sm">
                  {property.ConstructionMaterials && property.ConstructionMaterials.length > 0 
                    ? property.ConstructionMaterials.join(", ") 
                    : "N/A"}
                </Text>
              </div>
              
              {/* Exterior Features */}
              <div className="col-span-2">
                <Text fw={600} size="sm">Exterior Features:</Text>
                <Text size="sm">
                  {property.ExteriorFeatures && property.ExteriorFeatures.length > 0 
                    ? property.ExteriorFeatures.join(", ") 
                    : "None specified"}
                </Text>
              </div>
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Garage/Parking */}
        <Accordion.Item value="garage-parking">
          <Accordion.Control>
            <Text fw={600}>Garage/Parking</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <Text fw={600} size="sm">Driveway:</Text>
                <Text size="sm">
                  {property.ParkingFeatures && property.ParkingFeatures.find(
                    p => p.toLowerCase().includes("driveway")
                  ) || "N/A"}
                </Text>
              </div>
              <div>
                <Text fw={600} size="sm">Garage:</Text>
                <Text size="sm">
                  {property.GarageYN ? 
                    `Yes${property.GarageSpaces ? ` (${property.GarageSpaces} spaces)` : ''}` : 
                    "No"}
                  {property.AttachedGarageYN ? ", Attached" : ""}
                </Text>
              </div>
              <div>
                <Text fw={600} size="sm">Parking Features:</Text>
                <Text size="sm">
                  {property.ParkingFeatures && property.ParkingFeatures.length > 0 
                    ? property.ParkingFeatures.join(", ") 
                    : "None specified"}
                </Text>
              </div>
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Utilities */}
        <Accordion.Item value="utilities">
          <Accordion.Control>
            <Text fw={600}>Utilities</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <Text fw={600} size="sm">Fuel:</Text>
                <Text size="sm">
                  {property.Heating && property.Heating.length > 0 
                    ? property.Heating.join(", ") 
                    : "N/A"}
                </Text>
              </div>
              <div>
                <Text fw={600} size="sm">Heating/Cooling:</Text>
                <Text size="sm">
                  {(property.Heating && property.Heating.length > 0) || 
                   (property.Cooling && property.Cooling.length > 0) 
                    ? [...(property.Heating || []), ...(property.Cooling || [])].join(", ")
                    : "N/A"}
                </Text>
              </div>
              <div>
                <Text fw={600} size="sm">Water/Waste:</Text>
                <Text size="sm">
                  {(property.WaterSource && property.WaterSource.length > 0) || 
                   (property.Sewer && property.Sewer.length > 0)
                    ? [...(property.WaterSource || []), ...(property.Sewer || [])].join(", ")
                    : "N/A"}
                </Text>
              </div>
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Lot Info */}
        <Accordion.Item value="lot-info">
          <Accordion.Control>
            <Text fw={600}>Lot Info</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <Text fw={600} size="sm">Parcel Number:</Text>
                <Text size="sm">{property.ParcelNumber || "N/A"}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Acres:</Text>
                <Text size="sm">{property.LotSizeAcres || "N/A"}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Lot Description:</Text>
                <Text size="sm">
                  {property.LotFeatures && property.LotFeatures.length > 0 
                    ? property.LotFeatures.join(", ") 
                    : "None specified"}
                </Text>
              </div>
              <div>
                <Text fw={600} size="sm">Zoning:</Text>
                <Text size="sm">{property.Zoning || "N/A"}</Text>
              </div>
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Tax Info */}
        <Accordion.Item value="tax-info">
          <Accordion.Control>
            <Text fw={600}>Tax Info</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <Text fw={600} size="sm">Land Assessment:</Text>
                <Text size="sm">
                  {property.TaxAssessedValue 
                    ? DisplayUtils.formatCurrency(property.TaxAssessedValue) 
                    : "N/A"}
                </Text>
              </div>
              <div>
                <Text fw={600} size="sm">Total Assessment:</Text>
                <Text size="sm">
                  {property.TaxAssessedValue 
                    ? DisplayUtils.formatCurrency(property.TaxAssessedValue) 
                    : "N/A"}
                </Text>
              </div>
              <div>
                <Text fw={600} size="sm">Assessment Year:</Text>
                <Text size="sm">{property.TaxYear || "N/A"}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">Net Taxes:</Text>
                <Text size="sm">
                  {property.TaxAnnualAmount 
                    ? DisplayUtils.formatCurrency(property.TaxAnnualAmount) 
                    : "N/A"}
                </Text>
              </div>
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Location Info */}
        <Accordion.Item value="location-info">
          <Accordion.Control>
            <Text fw={600}>Location Info</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <Text fw={600} size="sm">Address:</Text>
                <Text size="sm">{ParagonPropertyUtils.formatStreetAddress(property)}</Text>
              </div>
              <div>
                <Text fw={600} size="sm">City, State, Zip:</Text>
                <Text size="sm">{ParagonPropertyUtils.formatCityStateZip(property)}</Text>
              </div>
              {property.Directions && (
                <div className="col-span-2">
                  <Text fw={600} size="sm">Directions:</Text>
                  <Text size="sm">{property.Directions}</Text>
                </div>
              )}
              {property.ElementarySchool && (
                <div>
                  <Text fw={600} size="sm">Elementary School:</Text>
                  <Text size="sm">{property.ElementarySchool}</Text>
                </div>
              )}
              {property.MiddleOrJuniorSchool && (
                <div>
                  <Text fw={600} size="sm">Middle School:</Text>
                  <Text size="sm">{property.MiddleOrJuniorSchool}</Text>
                </div>
              )}
              {property.HighSchool && (
                <div>
                  <Text fw={600} size="sm">High School:</Text>
                  <Text size="sm">{property.HighSchool}</Text>
                </div>
              )}
            </div>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* Print Listing Details button */}
      <div className="mt-4 text-right">
        <Button 
          variant="outline"
          onClick={() => window.print()}
          className="print:hidden"
        >
          Print Listing Details
        </Button>
      </div>
    </div>
  );
}