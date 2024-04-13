import getConfig from "next/config";
import Image from "next/image";

export default function RealtorProfile() {
  const config = getConfig().publicRuntimeConfig;
  return (
    <div
      className={`flex flex-col md:flex-row gap-16 mt-4 mx-auto py-16 px-6 md:px-16 max-w-5xl`}
    >
      <div className="flex flex-col gap-6 items-center flex-shrink-0">
        <Image
          alt="Realtor Photo"
          src="/img/realtor-profile.jpg"
          width={130}
          height={130}
          className="rounded-full"
        />
        <Image
          alt="Realtor Logo"
          src="/img/logo-realtor-small.png"
          width={160}
          height={180}
        />
      </div>
      <div>
        <h3 className="mb-6">{config.realtor.name}</h3>
        <p className="text-2xl leading-loose">{config.realtor.profile}</p>
        <hr className="w-32 my-8 border-t-4 border-blue-700 " />

        <h3 className="mb-6">Contact Me</h3>
        <p>
          <b>Direct:</b> {config.realtor.phone}
        </p>
        <p>
          <b>Office:</b> {config.realtor.phoneAlt}
        </p>
        <p>
          <a href={`mailto:${config.realtor.email}`}>{config.realtor.email}</a>
        </p>
      </div>
    </div>
  );
}
