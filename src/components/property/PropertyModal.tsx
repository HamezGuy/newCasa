"use client";

import { Modal } from '@mantine/core';
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
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Property Details"
      size="xl"
      // Use overlayProps instead of overlayOpacity/overlayBlur:
      overlayProps={{ opacity: 0.55, blur: 3 }}
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
