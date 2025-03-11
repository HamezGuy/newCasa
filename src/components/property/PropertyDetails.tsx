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

// Helper function to get property details based on property type
function getPropertyDetails(property: ParagonPropertyWithMedia) {
  // Determine property type
  const propertyType = property.PropertyType || "";
  
  // Default values
  let beds: number | string = property.BedroomsTotal || "N/A";
  let baths: string = property.TotBth || `${property.BathroomsFull || 0}.${property.BathroomsHalf ? 5 : 0}`;
  let acres: number | string = property.LotSizeAcres || "N/A";
  let sqFt: number | string = property.LivingArea || property.AboveGradeFinishedArea || "N/A";
  let yearBuilt: number | string = property.YearBuilt || "N/A";
  
  // For Multi Family properties
  if (propertyType === "Multi Family") {
    // Total unit stats
    let totalBeds = 0;
    let totalBaths = 0;
    let totalSqFt = 0;
    const unitCount = property.NumberOfUnitsTotal || 0;
    
    // Using type assertion to safely access dynamic property names
    for (let i = 1; i <= unitCount; i++) {
      // Add bedrooms
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
    
    // Update with calculated values
    beds = unitCount > 0 ? `${unitCount} Units` : "N/A";
    baths = totalBaths > 0 ? totalBaths.toString() : "N/A";
    sqFt = totalSqFt > 0 ? totalSqFt : (property.LivingArea || "N/A");
  } 
  // For Commercial properties
  else if (propertyType === "Commercial Sale") {
    beds = "N/A";
    baths = "N/A";
    sqFt = property.BuildingAreaTotal || property.LeasableArea || "N/A";
    
    // Some commercial properties use LotSizeArea instead of LotSizeAcres
    if (!property.LotSizeAcres && property.LotSizeArea) {
      acres = property.LotSizeArea;
    }
  }
  // For Land properties
  else if (propertyType === "Land") {
    beds = property.NumberOfLots && property.NumberOfLots > 1 ? `${property.NumberOfLots} Lots` : "N/A";
    baths = "N/A";
    sqFt = "N/A";
  }
  
  return { beds, baths, acres, sqFt, yearBuilt };
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

  // Get property details based on property type
  const { beds, baths, acres, sqFt, yearBuilt } = getPropertyDetails(property);

  // Format property summary fields
  const mlsNumber = property.ListingId || "N/A";
  const propertyType = property.PropertySubType || property.PropertyType || "N/A";
  const style = property.ArchitecturalStyle && property.ArchitecturalStyle.length > 0 
    ? property.ArchitecturalStyle[0] 
    : "N/A";
  const stories = property.Levels && property.Levels.length > 0 
    ? property.Levels.join(", ") 
    : (property.StoriesTotal ? property.StoriesTotal.toString() : "N/A");
  const taxes = property.TaxAnnualAmount 
    ? DisplayUtils.formatCurrency(property.TaxAnnualAmount) 
    : "N/A";
    
  // Get current URL for sharing
  const propertyUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/property/${property.ListingId}` 
    : '';

  // Render property stats based on property type
  const renderPropertyStats = () => {
    const type = property.PropertyType;
    
    if (type === "Land") {
      return (
        <div className="grid grid-cols-3 gap-2 mt-4 bg-gray-50 p-4 rounded-lg text-center">
          <div>
            <div className="text-xl font-semibold">{acres}</div>
            <div className="text-sm text-gray-500">Acres</div>
          </div>
          {property.NumberOfLots && property.NumberOfLots > 1 && (
            <div>
              <div className="text-xl font-semibold">{property.NumberOfLots}</div>
              <div className="text-sm text-gray-500">Lots</div>
            </div>
          )}
          <div>
            <div className="text-xl font-semibold">{property.Zoning || "N/A"}</div>
            <div className="text-sm text-gray-500">Zoning</div>
          </div>
        </div>
      );
    } else if (type === "Commercial Sale") {
      return (
        <div className="grid grid-cols-4 gap-2 mt-4 bg-gray-50 p-4 rounded-lg text-center">
          <div>
            <div className="text-xl font-semibold">{sqFt}</div>
            <div className="text-sm text-gray-500">SQ FT</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{acres}</div>
            <div className="text-sm text-gray-500">Acres</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{property.StoriesTotal || "N/A"}</div>
            <div className="text-sm text-gray-500">Stories</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{yearBuilt}</div>
            <div className="text-sm text-gray-500">Year Built</div>
          </div>
        </div>
      );
    } else if (type === "Multi Family") {
      return (
        <div className="grid grid-cols-5 gap-2 mt-4 bg-gray-50 p-4 rounded-lg text-center">
          <div>
            <div className="text-xl font-semibold">{property.NumberOfUnitsTotal || "N/A"}</div>
            <div className="text-sm text-gray-500">Units</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{sqFt}</div>
            <div className="text-sm text-gray-500">SQ FT</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{acres}</div>
            <div className="text-sm text-gray-500">Acres</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{yearBuilt}</div>
            <div className="text-sm text-gray-500">Year Built</div>
          </div>
          <div>
            <div className="text-xl font-semibold">
              {property.GrossIncome ? DisplayUtils.formatCurrency(property.GrossIncome) : "N/A"}
            </div>
            <div className="text-sm text-gray-500">Income</div>
          </div>
        </div>
      );
    } else {
      // Default for Residential
      return (
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
      );
    }
  };

  // Build room dimensions for display
  const renderRoomDimensions = () => {
    // Collect all room dimensions in a clean way
    const rooms = [];
    
    // Master/Primary bedroom
    if (property.Primary_Bed_Dim_258 || property.Primary_BedRm_Lvl_67) {
      rooms.push({
        name: "Primary Bedroom",
        dimensions: property.Primary_Bed_Dim_258 || "",
        level: property.Primary_BedRm_Lvl_67 || ""
      });
    } else if (property.Primary_Bed_Dim_259 || property.Primary_BedRm_Lvl_68) {
      rooms.push({
        name: "Primary Bedroom", 
        dimensions: property.Primary_Bed_Dim_259 || "",
        level: property.Primary_BedRm_Lvl_68 || ""
      });
    }
    
    // Bedroom 2
    if (property.Bedroom_2_Dim_259 || property.Bedroom_2_Lvl_68) {
      rooms.push({
        name: "Bedroom 2",
        dimensions: property.Bedroom_2_Dim_259 || "",
        level: property.Bedroom_2_Lvl_68 || ""
      });
    } else if (property.Bedroom_2_Dim_260 || property.Bedroom_2_Lvl_69) {
      rooms.push({
        name: "Bedroom 2",
        dimensions: property.Bedroom_2_Dim_260 || "",
        level: property.Bedroom_2_Lvl_69 || ""
      });
    }
    
    // Bedroom 3
    if (property.Bedroom_3_Dim_260 || property.Bedroom_3_Lvl_69) {
      rooms.push({
        name: "Bedroom 3",
        dimensions: property.Bedroom_3_Dim_260 || "",
        level: property.Bedroom_3_Lvl_69 || ""
      });
    } else if (property.Bedroom_3_Dim_261 || property.Bedroom_3_Lvl_70) {
      rooms.push({
        name: "Bedroom 3",
        dimensions: property.Bedroom_3_Dim_261 || "",
        level: property.Bedroom_3_Lvl_70 || ""
      });
    }
    
    // Kitchen
    if (property.Kitchen_Dim_255 || property.Kitchen_Lvl_64) {
      rooms.push({
        name: "Kitchen",
        dimensions: property.Kitchen_Dim_255 || "",
        level: property.Kitchen_Lvl_64 || ""
      });
    } else if (property.Kitchen_Dim_256 || property.Kitchen_Lvl_65) {
      rooms.push({
        name: "Kitchen",
        dimensions: property.Kitchen_Dim_256 || "",
        level: property.Kitchen_Lvl_65 || ""
      });
    }
    
    // Living Room
    if (property.Living_Or_Great_Dim_254 || property.Living_Or_Great_Room_Lvl_63) {
      rooms.push({
        name: "Living Room",
        dimensions: property.Living_Or_Great_Dim_254 || "",
        level: property.Living_Or_Great_Room_Lvl_63 || ""
      });
    } else if (property.Living_Or_Great_Dim_255 || property.Living_Or_Great_Room_Lvl_64) {
      rooms.push({
        name: "Living Room",
        dimensions: property.Living_Or_Great_Dim_255 || "",
        level: property.Living_Or_Great_Room_Lvl_64 || ""
      });
    }
    
    // Dining Room
    if (property.Dining_Room_Dim_256 || property.Dining_Room_Lvl_65) {
      rooms.push({
        name: "Dining Room",
        dimensions: property.Dining_Room_Dim_256 || "",
        level: property.Dining_Room_Lvl_65 || ""
      });
    } else if (property.Dining_Room_Dim_257 || property.Dining_Room_Lvl_66) {
      rooms.push({
        name: "Dining Room",
        dimensions: property.Dining_Room_Dim_257 || "",
        level: property.Dining_Room_Lvl_66 || ""
      });
    }
    
    // Render the rooms
    if (rooms.length === 0) return null;
    
    return (
      <div className="mt-4">
        <Text fw={600} size="sm" mb={2}>Room Details:</Text>
        {rooms.map((room, index) => (
          <div key={index} className="mt-2">
            <Text fw={600} size="sm">{room.name}:</Text>
            <Text size="sm">
              {room.dimensions ? `Dimensions: ${room.dimensions}` : ""}
              {room.dimensions && room.level ? ", " : ""}
              {room.level ? `Level: ${room.level}` : ""}
            </Text>
          </div>
        ))}
      </div>
    );
  };

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
            {property.PropertyType !== "Land" && property.PropertyType !== "Commercial Sale" && (
              <div className="text-sm text-gray-600 mb-1">Est. Mortgage: {estimatedMortgage}/mo</div>
            )}
            <h1 className="text-3xl font-bold">{price}</h1>
            <p className="text-xl mb-1">{address}</p>
            <p className="text-lg text-gray-700">{cityStateZip}</p>
          </div>
        </div>

        {/* Key property stats - Conditionally rendered based on property type */}
        {renderPropertyStats()}

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
              {style !== "N/A" && (
                <div>
                  <Text fw={600} size="sm">Style:</Text>
                  <Text size="sm">{style}</Text>
                </div>
              )}
              <div>
                <Text fw={600} size="sm">Type:</Text>
                <Text size="sm">{propertyType}</Text>
              </div>
              {yearBuilt !== "N/A" && (
                <div>
                  <Text fw={600} size="sm">Year Built:</Text>
                  <Text size="sm">{yearBuilt}</Text>
                </div>
              )}
              <div>
                <Text fw={600} size="sm">Est. Taxes:</Text>
                <Text size="sm">{taxes}</Text>
              </div>
              {stories !== "N/A" && (
                <div>
                  <Text fw={600} size="sm">Stories:</Text>
                  <Text size="sm">{stories}</Text>
                </div>
              )}
              
              {/* Add additional fields for Commercial properties */}
              {property.PropertyType === "Commercial Sale" && (
                <>
                  {property.BusinessType && property.BusinessType.length > 0 && (
                    <div>
                      <Text fw={600} size="sm">Business Type:</Text>
                      <Text size="sm">{property.BusinessType.join(", ")}</Text>
                    </div>
                  )}
                  {property.LeasableArea && (
                    <div>
                      <Text fw={600} size="sm">Leasable Area:</Text>
                      <Text size="sm">{property.LeasableArea} sqft</Text>
                    </div>
                  )}
                </>
              )}
              
              {/* Add additional fields for Multi-Family properties */}
              {property.PropertyType === "Multi Family" && (
                <>
                  {property.GrossIncome && (
                    <div>
                      <Text fw={600} size="sm">Gross Income:</Text>
                      <Text size="sm">{DisplayUtils.formatCurrency(property.GrossIncome)}</Text>
                    </div>
                  )}
                  {property.NumberOfUnitsTotal && (
                    <div>
                      <Text fw={600} size="sm">Number of Units:</Text>
                      <Text size="sm">{property.NumberOfUnitsTotal}</Text>
                    </div>
                  )}
                </>
              )}
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
              {property.ArchitecturalStyle && property.ArchitecturalStyle.length > 0 && (
                <div>
                  <Text fw={600} size="sm">Architecture:</Text>
                  <Text size="sm">{property.ArchitecturalStyle.join(", ")}</Text>
                </div>
              )}
              {property.YearBuilt && (
                <div>
                  <Text fw={600} size="sm">Year Built:</Text>
                  <Text size="sm">{property.YearBuilt} 
                    {property.YearBuiltSource ? ` (${property.YearBuiltSource})` : ""}
                  </Text>
                </div>
              )}
            </div>
            
            {property.Inclusions && (
              <div className="mt-3">
                <Text fw={600} size="sm">Items Included:</Text>
                <Text size="sm">{property.Inclusions}</Text>
              </div>
            )}
            
            {property.Exclusions && (
              <div className="mt-3">
                <Text fw={600} size="sm">Items Excluded:</Text>
                <Text size="sm">{property.Exclusions}</Text>
              </div>
            )}
          </Accordion.Panel>
        </Accordion.Item>

        {/* Interior Features - Only for Residential and Multi Family */}
        {(property.PropertyType === "Residential" || property.PropertyType === "Multi Family") && (
          <Accordion.Item value="interior-features">
            <Accordion.Control>
              <Text fw={600}>Interior Features</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <Text fw={600} size="sm">Square Footage:</Text>
                  <Text size="sm">
                    {property.AboveGradeFinishedArea ? `${property.AboveGradeFinishedArea} (Above Grade)` : ""}
                    {property.BelowGradeFinishedArea ? `, ${property.BelowGradeFinishedArea} (Below Grade)` : ""}
                    {property.LivingArea ? `, ${property.LivingArea} (Total)` : ""}
                    {!property.AboveGradeFinishedArea && !property.BelowGradeFinishedArea && !property.LivingArea ? "N/A" : ""}
                  </Text>
                </div>
                
                {property.BedroomsTotal !== null && property.BedroomsTotal !== undefined && (
                  <div>
                    <Text fw={600} size="sm">Bedrooms:</Text>
                    <Text size="sm">{property.BedroomsTotal}</Text>
                  </div>
                )}
                
                {(property.BathroomsFull !== null || property.BathroomsHalf !== null) && (
                  <div>
                    <Text fw={600} size="sm">Bathrooms:</Text>
                    <Text size="sm">
                      {property.BathroomsFull ? `${property.BathroomsFull} Full` : ""}
                      {property.BathroomsHalf ? `, ${property.BathroomsHalf} Half` : ""}
                    </Text>
                  </div>
                )}
              </div>

              {/* Room details */}
              {renderRoomDimensions()}

              {/* Basement */}
              {property.Basement && property.Basement.length > 0 && (
                <div className="mt-3">
                  <Text fw={600} size="sm">Basement:</Text>
                  <Text size="sm">{property.Basement.join(", ")}</Text>
                </div>
              )}

              {/* Fireplace */}
              {property.FireplaceYN !== null && (
                <div className="mt-3">
                  <Text fw={600} size="sm">Fireplace:</Text>
                  <Text size="sm">
                    {property.FireplaceYN ? 
                      `Yes${property.FireplacesTotal ? ` (${property.FireplacesTotal})` : ''}` : 
                      "No"}
                  </Text>
                </div>
              )}

              {/* Interior amenities */}
              {property.InteriorFeatures && property.InteriorFeatures.length > 0 && (
                <div className="mt-3">
                  <Text fw={600} size="sm">Interior Amenities:</Text>
                  <Text size="sm">{property.InteriorFeatures.join(", ")}</Text>
                </div>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {/* For Multi Family - specific unit details */}
        {property.PropertyType === "Multi Family" && property.NumberOfUnitsTotal && property.NumberOfUnitsTotal > 0 && (
          <Accordion.Item value="unit-details">
            <Accordion.Control>
              <Text fw={600}>Unit Details</Text>
            </Accordion.Control>
            <Accordion.Panel>
              {Array.from({length: property.NumberOfUnitsTotal}, (_, i) => i + 1).map(unitNum => {
                const unitIdentifier = `Unit_${unitNum}` as keyof ParagonPropertyWithMedia;
                const unitId = property[unitIdentifier] as string;
                
                const bedKey = `U${unitNum}_Number__Bedrooms` as keyof ParagonPropertyWithMedia;
                const fullBathKey = `U${unitNum}_Full_Baths` as keyof ParagonPropertyWithMedia;
                const halfBathKey = `U${unitNum}_Half_Baths` as keyof ParagonPropertyWithMedia;
                const sqftKey = `U${unitNum}_SqFt` as keyof ParagonPropertyWithMedia;
                const rentKey = `U${unitNum}_Mo_Rent` as keyof ParagonPropertyWithMedia;
                const leaseKey = `U${unitNum}_Lease_Expiration_Date` as keyof ParagonPropertyWithMedia;
                const parkingKey = `U${unitNum}_Parking` as keyof ParagonPropertyWithMedia;
                
                return (
                  <div key={unitNum} className="mb-4 border-b pb-4 last:border-b-0">
                    <Text fw={700} size="md" mb={2}>
                      Unit {unitNum} {unitId ? `(${unitId})` : ""}
                    </Text>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {property[bedKey] && (
                        <div>
                          <Text fw={600} size="sm">Bedrooms:</Text>
                          <Text size="sm">{property[bedKey]}</Text>
                        </div>
                      )}
                      
                      {(property[fullBathKey] || property[halfBathKey]) && (
                        <div>
                          <Text fw={600} size="sm">Bathrooms:</Text>
                          <Text size="sm">
                            {property[fullBathKey] ? `${property[fullBathKey]} Full` : ""}
                            {property[halfBathKey] ? `, ${property[halfBathKey]} Half` : ""}
                          </Text>
                        </div>
                      )}
                      
                      {property[sqftKey] && (
                        <div>
                          <Text fw={600} size="sm">Square Feet:</Text>
                          <Text size="sm">{property[sqftKey]}</Text>
                        </div>
                      )}
                      
                      {property[rentKey] && (
                        <div>
                          <Text fw={600} size="sm">Monthly Rent:</Text>
                          <Text size="sm">{DisplayUtils.formatCurrency(property[rentKey] as number)}</Text>
                        </div>
                      )}
                      
                      {property[leaseKey] && (
                        <div>
                          <Text fw={600} size="sm">Lease Expires:</Text>
                          <Text size="sm">{property[leaseKey]}</Text>
                        </div>
                      )}
                      
                      {property[parkingKey] && (
                        <div>
                          <Text fw={600} size="sm">Parking:</Text>
                          <Text size="sm">{property[parkingKey]}</Text>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {/* Commercial Building Details - Only for Commercial properties */}
        {property.PropertyType === "Commercial Sale" && (
          <Accordion.Item value="commercial-details">
            <Accordion.Control>
              <Text fw={600}>Building Details</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {property.BuildingAreaTotal && (
                  <div>
                    <Text fw={600} size="sm">Total Building Area:</Text>
                    <Text size="sm">{property.BuildingAreaTotal} sqft</Text>
                  </div>
                )}
                
                {property.LeasableArea && (
                  <div>
                    <Text fw={600} size="sm">Leasable Area:</Text>
                    <Text size="sm">{property.LeasableArea} sqft</Text>
                  </div>
                )}
                
                {property.Ceiling_Height_Min && (
                  <div>
                    <Text fw={600} size="sm">Ceiling Height:</Text>
                    <Text size="sm">
                      {property.Ceiling_Height_Min}
                      {property.Ceiling_Height_Max ? ` - ${property.Ceiling_Height_Max}` : ""} ft
                    </Text>
                  </div>
                )}
                
                {property.StoriesTotal && (
                  <div>
                    <Text fw={600} size="sm">Stories:</Text>
                    <Text size="sm">{property.StoriesTotal}</Text>
                  </div>
                )}
                
                {property.NumberOfUnitsTotal && (
                  <div>
                    <Text fw={600} size="sm">Units:</Text>
                    <Text size="sm">{property.NumberOfUnitsTotal}</Text>
                  </div>
                )}
                
                {property.YearBuilt && (
                  <div>
                    <Text fw={600} size="sm">Year Built:</Text>
                    <Text size="sm">{property.YearBuilt}</Text>
                  </div>
                )}
                
                {property.Roof && property.Roof.length > 0 && (
                  <div>
                    <Text fw={600} size="sm">Roof:</Text>
                    <Text size="sm">{property.Roof.join(", ")}</Text>
                  </div>
                )}
                
                {property.ConstructionMaterials && property.ConstructionMaterials.length > 0 && (
                  <div>
                    <Text fw={600} size="sm">Construction:</Text>
                    <Text size="sm">{property.ConstructionMaterials.join(", ")}</Text>
                  </div>
                )}
              </div>
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {/* Exterior Features - For all property types */}
        <Accordion.Item value="exterior-features">
          <Accordion.Control>
            <Text fw={600}>Exterior Features</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {/* Waterfront */}
              {property.WaterfrontYN !== null && (
                <div>
                  <Text fw={600} size="sm">Waterfront:</Text>
                  <Text size="sm">
                    {property.WaterfrontYN ? "Yes" : "No"}
                    {property.WaterBodyName ? ` (${property.WaterBodyName})` : ""}
                  </Text>
                </div>
              )}
              
              {/* Waterfront Features */}
              {property.WaterfrontFeatures && property.WaterfrontFeatures.length > 0 && (
                <div>
                  <Text fw={600} size="sm">Waterfront Features:</Text>
                  <Text size="sm">{property.WaterfrontFeatures.join(", ")}</Text>
                </div>
              )}
              
              {/* Exterior Construction */}
              {property.ConstructionMaterials && property.ConstructionMaterials.length > 0 && (
                <div>
                  <Text fw={600} size="sm">Exterior:</Text>
                  <Text size="sm">{property.ConstructionMaterials.join(", ")}</Text>
                </div>
              )}
              
              {/* Exterior Features */}
              {property.ExteriorFeatures && property.ExteriorFeatures.length > 0 && (
                <div className="col-span-2">
                  <Text fw={600} size="sm">Exterior Features:</Text>
                  <Text size="sm">{property.ExteriorFeatures.join(", ")}</Text>
                </div>
              )}
              
              {/* Patio/Porch Features */}
              {property.PatioAndPorchFeatures && property.PatioAndPorchFeatures.length > 0 && (
                <div className="col-span-2">
                  <Text fw={600} size="sm">Patio/Porch:</Text>
                  <Text size="sm">{property.PatioAndPorchFeatures.join(", ")}</Text>
                </div>
              )}
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Garage/Parking - For most property types */}
        {property.PropertyType !== "Land" && (
          <Accordion.Item value="garage-parking">
            <Accordion.Control>
              <Text fw={600}>Garage/Parking</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {property.ParkingFeatures && property.ParkingFeatures.find(p => p.toLowerCase().includes("driveway")) && (
                  <div>
                    <Text fw={600} size="sm">Driveway:</Text>
                    <Text size="sm">
                      {property.ParkingFeatures.find(p => p.toLowerCase().includes("driveway"))}
                    </Text>
                  </div>
                )}
                
                {property.GarageYN !== null && (
                  <div>
                    <Text fw={600} size="sm">Garage:</Text>
                    <Text size="sm">
                      {property.GarageYN ? 
                        `Yes${property.GarageSpaces ? ` (${property.GarageSpaces} spaces)` : ''}` : 
                        "No"}
                      {property.AttachedGarageYN ? ", Attached" : ""}
                    </Text>
                  </div>
                )}
                
                {property.ParkingTotal && (
                  <div>
                    <Text fw={600} size="sm">Total Parking:</Text>
                    <Text size="sm">{property.ParkingTotal} spaces</Text>
                  </div>
                )}
                
                {property.OpenParkingSpaces && (
                  <div>
                    <Text fw={600} size="sm">Open Parking:</Text>
                    <Text size="sm">{property.OpenParkingSpaces} spaces</Text>
                  </div>
                )}
                
                {property.ParkingFeatures && property.ParkingFeatures.length > 0 && (
                  <div className="col-span-2">
                    <Text fw={600} size="sm">Parking Features:</Text>
                    <Text size="sm">{property.ParkingFeatures.join(", ")}</Text>
                  </div>
                )}
              </div>
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {/* Utilities - For all property types */}
        <Accordion.Item value="utilities">
          <Accordion.Control>
            <Text fw={600}>Utilities</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {property.Heating && property.Heating.length > 0 && (
                <div>
                  <Text fw={600} size="sm">Fuel:</Text>
                  <Text size="sm">{property.Heating.join(", ")}</Text>
                </div>
              )}
              
              {((property.Heating && property.Heating.length > 0) || 
                (property.Cooling && property.Cooling.length > 0)) && (
                <div>
                  <Text fw={600} size="sm">Heating/Cooling:</Text>
                  <Text size="sm">
                    {[...(property.Heating || []), ...(property.Cooling || [])].join(", ")}
                  </Text>
                </div>
              )}
              
              {((property.WaterSource && property.WaterSource.length > 0) || 
                (property.Sewer && property.Sewer.length > 0)) && (
                <div>
                  <Text fw={600} size="sm">Water/Waste:</Text>
                  <Text size="sm">
                    {[...(property.WaterSource || []), ...(property.Sewer || [])].join(", ")}
                  </Text>
                </div>
              )}
              
              {property.Utilities && property.Utilities.length > 0 && (
                <div className="col-span-2">
                  <Text fw={600} size="sm">Available Utilities:</Text>
                  <Text size="sm">{property.Utilities.join(", ")}</Text>
                </div>
              )}
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Lot Info - For all property types, especially important for Land */}
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
                <Text size="sm">{property.LotSizeAcres || property.LotSizeArea || "N/A"}</Text>
              </div>
              
              {property.LotSizeDimensions && (
                <div>
                  <Text fw={600} size="sm">Lot Dimensions:</Text>
                  <Text size="sm">{property.LotSizeDimensions}</Text>
                </div>
              )}
              
              {property.NumberOfLots && property.NumberOfLots > 1 && (
                <div>
                  <Text fw={600} size="sm">Number of Lots:</Text>
                  <Text size="sm">{property.NumberOfLots}</Text>
                </div>
              )}
              
              {property.Zoning && (
                <div>
                  <Text fw={600} size="sm">Zoning:</Text>
                  <Text size="sm">{property.Zoning}</Text>
                </div>
              )}
              
              {property.ZoningDescription && (
                <div>
                  <Text fw={600} size="sm">Zoning Description:</Text>
                  <Text size="sm">{property.ZoningDescription}</Text>
                </div>
              )}
              
              {property.Topography && (
                <div>
                  <Text fw={600} size="sm">Topography:</Text>
                  <Text size="sm">{property.Topography}</Text>
                </div>
              )}
              
              {property.LotFeatures && property.LotFeatures.length > 0 && (
                <div className="col-span-2">
                  <Text fw={600} size="sm">Lot Features:</Text>
                  <Text size="sm">{property.LotFeatures.join(", ")}</Text>
                </div>
              )}
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Tax Info - For all property types */}
        <Accordion.Item value="tax-info">
          <Accordion.Control>
            <Text fw={600}>Tax Info</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {property.TaxAssessedValue && (
                <div>
                  <Text fw={600} size="sm">Total Assessment:</Text>
                  <Text size="sm">{DisplayUtils.formatCurrency(property.TaxAssessedValue)}</Text>
                </div>
              )}
              
              {property.TaxYear && (
                <div>
                  <Text fw={600} size="sm">Assessment Year:</Text>
                  <Text size="sm">{property.TaxYear}</Text>
                </div>
              )}
              
              {property.TaxAnnualAmount && (
                <div>
                  <Text fw={600} size="sm">Annual Taxes:</Text>
                  <Text size="sm">{DisplayUtils.formatCurrency(property.TaxAnnualAmount)}</Text>
                </div>
              )}
              
              {property.TaxLegalDescription && (
                <div className="col-span-2">
                  <Text fw={600} size="sm">Legal Description:</Text>
                  <Text size="sm">{property.TaxLegalDescription}</Text>
                </div>
              )}
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Location Info - For all property types */}
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
              
              {property.HighSchoolDistrict && (
                <div>
                  <Text fw={600} size="sm">School District:</Text>
                  <Text size="sm">{property.HighSchoolDistrict}</Text>
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