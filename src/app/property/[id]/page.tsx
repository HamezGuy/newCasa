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
  const [message, setMessage] = useState<string>(""); // Message state
  const [error, setError] = useState<string | null>(null); // Error state
  const [success, setSuccess] = useState<string | null>(null); // Success state
  const [property, setProperty] = useState<ParagonPropertyWithMedia | null>(null); // Property state
  const [loading, setLoading] = useState<boolean>(true); // Loading state

  // Fetch the property asynchronously
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await getPropertyById(id);
        console.log("Fetched property:", response); // Debugging statement
        if (!response) {
          setError("Property not found");
        } else {
          setProperty(response);
        }
      } catch (e) {
        console.error(`Could not fetch property`, e);
        setError("Error loading property");
      } finally {
        setLoading(false);
      }
    };
  
    fetchProperty();
  }, [id]);
  

  // Handle sending message
  const handleSendMessage = async () => {
    setError(null);
    setSuccess(null);

    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError("You need to be logged in to send a message.");
      return;
    }

    if (!property?.ListAgentEmail) {
      setError("Realtor email not available.");
      return;
    }

    try {
      await sendMessageToRealtor({
        propertyId: id,
        realtorEmail: property.ListAgentEmail, // Ensure ListAgentEmail exists
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

  if (loading) {
    return <div>Loading...</div>; // Display loading indicator
  }

  if (error) {
    return <div>{error}</div>; // Display error message
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
        <p>Property not found</p>
      )}
    </main>
  );
}
