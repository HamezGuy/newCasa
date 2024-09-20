"use client"; // This marks the component as a Client Component

import { sendMessageToRealtor } from "@/app/messages/sendMessageToRealtor";
import PropertyDetails from "@/components/property/PropertyDetails";
import { PropertyImages } from "@/components/property/PropertyImages";
import { auth } from "@/config/firebase"; // Firebase auth
import { getPropertyById } from "@/lib/data";
import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import { useEffect, useState } from "react";

export default function PropertyPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [property, setProperty] = useState<ParagonPropertyWithMedia | null>(null);

  // Fetch the property asynchronously
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await getPropertyById(id);
        setProperty(response);
      } catch (e) {
        console.log(`Could not fetch property`, e);
        setError("Property not found");
      }
    };

    fetchProperty();
  }, [id]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      setError("You need to be logged in to send a message.");
      return;
    }

    try {
      await sendMessageToRealtor({
        propertyId: id,
        realtorEmail: property?.ListAgentEmail || "", // Use ListAgentEmail
        message,
        clientId: user.uid,
        clientEmail: user.email!,
      });
      setSuccess("Message sent successfully!");
      setMessage(""); // Clear the message box
    } catch (err) {
      setError("Failed to send message. Please try again.");
    }
  };

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <main>
      {property ? (
        <>
          {/* Display Property Images */}
          <div>
            <PropertyImages property={property} />
          </div>

          {/* Property Details */}
          <div className="container mx-auto max-w-5xl">
            <PropertyDetails property={property} />

            {/* Message Box */}
            <div className="message-box mt-8">
              <h3>Contact Realtor</h3>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here..."
                className="w-full p-2 border rounded"
              />
              <button onClick={handleSendMessage} className="btn mt-2">
                Send Message
              </button>

              {error && <p className="text-red-500">{error}</p>}
              {success && <p className="text-green-500">{success}</p>}
            </div>
          </div>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </main>
  );
}
