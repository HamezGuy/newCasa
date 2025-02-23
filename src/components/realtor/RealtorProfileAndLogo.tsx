"use client";
import Image from "next/image";

interface IRealtorProfileAndLogoProps {
  imgProfile: string;
  imgLogo: string;
}

export default function RealtorProfileAndLogo(
  props: IRealtorProfileAndLogoProps
) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Image
        src={props.imgProfile}
        alt="Realtor Profile"
        width={200}
        height={200}
        className="object-cover rounded"
      />
      <Image
        src={props.imgLogo}
        alt="Realtor Logo"
        width={200}
        height={200}
        className="object-contain"
      />
    </div>
  );
}
