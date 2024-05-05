import IParagonProperty from "@/types/IParagonProperty";
import { Box } from "@mantine/core";
import Image from "next/image";

export function PropertyImages({ property }: { property: IParagonProperty }) {
  const images = [
    "/img/property/0.jpg",
    "/img/property/1.jpg",
    "/img/property/2.jpg",
    "/img/property/3.jpg",
    "/img/property/4.jpg",
    "/img/property/5.jpg",
    "/img/property/6.jpg",
    "/img/property/7.jpg",
    "/img/property/8.jpg",
    "/img/property/9.jpg",
    "/img/property/10.jpg",
  ];

  return (
    <Box className="w-full overflow-x-scroll">
      <Box
        className="flex flex-col flex-wrap gap-1"
        style={{ height: "24.25rem" }}
      >
        {images.map((p, i) => (
          <Box
            key={i}
            className={`relative overflow-hidden ${
              i == 0 ? "w-96 h-full" : "w-56 h-48"
            }`}
          >
            <Image fill={true} src={p} alt="" style={{ objectFit: "cover" }} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
