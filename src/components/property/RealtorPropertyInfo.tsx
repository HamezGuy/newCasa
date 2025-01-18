"use client"; // Marks this as a client component

import { auth } from "@/lib/firebase";
import { getUserRole } from "@/lib/utils/firebaseUtils";
import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import { useEffect, useState } from "react";

export default function PropertyPageClient({
  property,
}: {
  property: ParagonPropertyWithMedia;
}) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const role = await getUserRole(user.uid);
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
      {userRole === "realtor" ? (
        <div className="mt-4 p-4 bg-gray-200">
          <h4 className="font-bold">Realtor-Only Information</h4>

          {/* Display Only the Realtor PDF */}
          <h5 className="font-bold">Documents Available</h5>
          <a
            href="/RealtorDocument.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Realtor Document (PDF)
          </a>

          {/* Display Realtor Info */}
          <h5 className="font-bold mt-4">Realtor Information</h5>
          <p>
            <strong>Listing Agent:</strong> {property.ListAgentFullName}
          </p>
          <p>
            <strong>Listing Agent Email:</strong> {realtorEmail}
          </p>
        </div>
      ) : (
        <div className="mt-4 p-4 bg-gray-100">
          <p>
            Additional information is available for realtors. Please log in as a
            realtor to view this section.
          </p>
        </div>
      )}
    </div>
  );
}
