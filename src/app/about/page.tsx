// app/about/page.tsx
import Image from "next/image";
import ClientMessageForm from "@/components/messages/ClientMessageForm";

interface Realtor {
  name: string;
  bio: string;
  image: string;
  email: string;
  phone: string;
}

export default function AboutPage(): JSX.Element {
  const realtor: Realtor = {
    name: "Tim Flores",
    bio: `I’m a real estate agent with LPT Realty in Cottage Grove, WI and the nearby area, providing home-buyers and sellers with professional, 
    responsive and attentive real estate services. Want an agent who'll really listen to what you want in a home? 
    Need an agent who knows how to effectively market your home so it sells? Give me a call! I'm eager to help and would love to talk to you.`,
    image: "/img/realtor-profile.jpg", // Updated path for realtor's profile image
    email: "tim.flores@flores.realty",
    phone: "608.579.3033",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Background Image & Responsive Parallax */}
      <section
        className="relative bg-cover bg-center bg-local md:bg-fixed text-white"
        style={{ backgroundImage: "url('/img/home-hero3.jpg')" }} // Updated hero background image
      >
        {/* Dark overlay with subtle transition */}
        <div className="absolute inset-0 bg-black opacity-60 transition-opacity duration-200 hover:opacity-55"></div>
        <div className="container mx-auto px-4 py-20 relative z-10 flex flex-col items-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-md mb-6 transition-transform duration-200 hover:scale-[1.02]">
            <Image
              src={realtor.image}
              alt={`${realtor.name} Profile`}
              width={160}
              height={160}
              className="object-cover"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-md">
            About {realtor.name}
          </h1>
          <p className="text-lg md:text-xl font-light drop-shadow-sm">
            Your trusted realtor in the area
          </p>
        </div>
      </section>

      {/* Biography Section with Subtle Parallax Background */}
      <section
        className="relative py-16 bg-local md:bg-fixed"
        style={{
          backgroundImage: "url('/img/home-hero3.jpg')", // Using the same background image for a consistent look
          backgroundSize: "cover",
        }}
      >
        {/* Semi-transparent overlay for readability */}
        <div className="absolute inset-0 bg-white opacity-90"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md transition-shadow duration-200 hover:shadow-lg">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">About Me</h2>
            <p className="text-base md:text-lg leading-relaxed text-gray-700 mb-4">
              {realtor.bio}
            </p>
            <p className="text-base md:text-lg leading-relaxed text-gray-700">
              Whether you're looking to buy, sell, or simply learn more about the market, I'm here to help you navigate the complex world of real estate with ease and confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Contact / Message Section with Interactive Card */}
      <section className="bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-lg shadow-md transition-transform duration-200 hover:scale-[1.02]">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-gray-800">Get in Touch</h2>
            <p className="mb-4 text-gray-600">
              Have questions or need more information? Fill out the form below and I'll be in touch shortly.
            </p>
            <ClientMessageForm
              propertyId="about"
              realtorEmail={realtor.email}
              realtorPhoneNumber={realtor.phone}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
