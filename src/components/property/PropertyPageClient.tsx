"use client"; // Marks this as a client component

import ClientMessageForm from "@/components/messages/ClientMessageForm";
import { auth } from "@/config/firebase";
import { getUserRole } from "@/lib/utils/firebaseUtils";
import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import { useEffect, useState } from "react";

export default function PropertyPageClient({
  property,
}: {
  property: ParagonPropertyWithMedia;
}) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState(auth.currentUser); // Get current user from auth

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const role = await getUserRole(user.uid); // Fetch user role
        setUserRole(role);
      } else {
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [user]);

  const realtorEmail = property?.ListAgentEmail || "realtor@example.com";
  const realtorPhoneNumber = property?.ListAgentPreferredPhone || "123-456-7890";

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Contact Realtor</h3>
      <ClientMessageForm
        propertyId={property.ListingId}
        realtorEmail={realtorEmail}
        realtorPhoneNumber={realtorPhoneNumber}
      />

      {/* Conditional Rendering for Realtor-specific Information */}
      {userRole === "realtor" ? (
        <div className="mt-4 p-4 bg-gray-200">
          <h4 className="font-bold">Realtor-Only Information</h4>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio.</p>
          {/* Add any other realtor-specific content here */}
        </div>
      ) : (
        <div className="mt-4 p-4 bg-gray-100">
          <p>Additional information is available for realtors. Please log in as a realtor to view this section.</p>
        </div>
      )}
    </div>
  );
}
