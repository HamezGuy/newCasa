// app/property/[id]/PropertyClient.tsx
'use client';

import PropertyDetails from "@/components/property/PropertyDetails";
import { PropertyImages } from "@/components/property/PropertyImages";
import PropertyPageClient from "@/components/property/RealtorPropertyInfo";
import ClientMessageForm from "@/components/messages/ClientMessageForm";
import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getUserRole } from "@/lib/utils/firebaseUtils";

interface PropertyClientProps {
  property: ParagonPropertyWithMedia;
}

export default function PropertyClient({ property }: PropertyClientProps) {
  const [userRole, setUserRole] = useState("user");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Get user role if logged in
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setCurrentUser(user);
      getUserRole(user.uid).then(role => {
        setUserRole(role);
      });
    }
  }, []);

  // Realtor contact data for the form
  const realtorEmail = property.ListAgentEmail || "realtor@example.com";
  const realtorPhone = property.ListAgentPreferredPhone || "123-456-7890";

  return (
    <main className="w-full">
      {/* 1) Property images => full width */}
      <PropertyImages property={property} />

      {/* 2) Two-column layout => also full width */}
      <div className="w-full mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
        {/* LEFT => property details */}
        <div>
          <PropertyDetails
            property={property}
            userRole={userRole}
            userUid={currentUser ? currentUser.uid : null}
          />
        </div>

        {/* RIGHT => message form */}
        <div>
          <ClientMessageForm
            propertyId={property.ListingId}
            realtorEmail={realtorEmail}
            realtorPhoneNumber={realtorPhone}
          />
        </div>
      </div>

      {/* 3) Realtor-only info => below */}
      <div className="w-full border-t mt-8 pt-6 px-4">
        <PropertyPageClient property={property} />
      </div>
    </main>
  );
}