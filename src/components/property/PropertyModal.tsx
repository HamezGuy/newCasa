"use client";

import { Modal } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks"; // detect mobile
import PropertyDetails from "@/components/property/PropertyDetails";
import { PropertyImages } from "@/components/property/PropertyImages";
import ClientMessageForm from "@/components/messages/ClientMessageForm";
import PropertyPageClient from "@/components/property/RealtorPropertyInfo";
import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";

interface PropertyModalProps {
  opened: boolean;
  onClose: () => void;
  property: ParagonPropertyWithMedia;
  userRole: string;
  userUid: string | null;
  realtorEmail: string;
  realtorPhone: string;
}

export default function PropertyModal({
  opened,
  onClose,
  property,
  userRole,
  userUid,
  realtorEmail,
  realtorPhone,
}: PropertyModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  // CHANGED: Construct property link here as well if needed
  const propertyLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/property/${property.ListingId}`
      : "";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Property Details"
      size={isMobile ? "lg" : "70%"}
      overlayProps={{ opacity: 0.55, blur: 3 }}
      styles={{
        body: {
          fontSize: isMobile ? 14 : 16,
          overflowWrap: "break-word",
        },
      }}
    >
      <div className="w-full">
        {/* Property images with clickable thumbnails */}
        <PropertyImages property={property} />

        {/* Two-column layout: details and contact form */}
        <div className="w-full mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <PropertyDetails
              property={property}
              userRole={userRole}
              userUid={userUid}
            />
          </div>
          <div>
            <ClientMessageForm
              propertyId={property.ListingId}
              realtorEmail={realtorEmail}
              realtorPhoneNumber={realtorPhone}
              // CHANGED: pass the property link for the share
              propertyLink={propertyLink}
            />
          </div>
        </div>

        {/* Realtor-only info section */}
        <div className="w-full border-t mt-8 pt-6">
          <PropertyPageClient property={property} />
        </div>
      </div>
    </Modal>
  );
}
