import PropertyDetails from "@/components/property/PropertyDetails";
import { PropertyImages } from "@/components/property/PropertyImages";
import PropertyPageClient from "@/components/property/RealtorPropertyInfo";
import ClientMessageForm from "@/components/messages/ClientMessageForm";

import { getProperties, getPropertyById } from "@/lib/data";
import { isProduction } from "@/lib/utils/config";
import { getUserRole } from "@/lib/utils/firebaseUtils";
import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import { getAuth } from "firebase/auth";

export async function generateStaticParams() {
  if (!isProduction) {
    return [];
  }

  const listings = await getProperties();
  console.log(`Generating ${listings.length} property pages...`);
  return listings.map((listing: ParagonPropertyWithMedia) => ({
    id: listing.ListingId,
  }));
}

export default async function PropertyPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  if (!id) {
    return <span>Redirect to all listings page...</span>;
  }

  let response: ParagonPropertyWithMedia;
  try {
    response = await getPropertyById(id);
  } catch (e) {
    console.log(`Could not fetch property`, e);
    return <div>Not found</div>;
  }

  // 1) Get user role if logged in
  const auth = getAuth();
  const currentUser = auth.currentUser;
  let userRole = "user";
  if (currentUser) {
    const uid = currentUser.uid;
    userRole = await getUserRole(uid);
  }

  // 2) Realtor contact data for the form
  const realtorEmail = response.ListAgentEmail || "realtor@example.com";
  const realtorPhone = response.ListAgentPreferredPhone || "123-456-7890";

  return (
    <main className="w-full">
      {/* 1) Property images => full width */}
      <PropertyImages property={response} />

      {/* 2) Two-column layout => also full width */}
      <div className="w-full mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
        {/* LEFT => property details */}
        <div>
          <PropertyDetails
            property={response}
            userRole={userRole}
            userUid={currentUser ? currentUser.uid : null}
          />
        </div>

        {/* RIGHT => message form */}
        <div>
          <ClientMessageForm
            propertyId={response.ListingId}
            realtorEmail={realtorEmail}
            realtorPhoneNumber={realtorPhone}
          />
        </div>
      </div>

      {/* 3) Realtor-only info => below */}
      <div className="w-full border-t mt-8 pt-6 px-4">
        <PropertyPageClient property={response} />
      </div>
    </main>
  );
}
