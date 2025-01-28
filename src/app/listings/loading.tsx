import { Card, Skeleton } from "@mantine/core";

export default function Loading() {
  const skeletons = [1, 2, 3, 4, 5, 6];
  return (
    <main className="container mx-auto px-4">
      <Skeleton height={238} mb="lg" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skeletons.map((i) => (
          <Card shadow="sm" radius="md" withBorder key={i}>
            <Skeleton height={256} mb="lg" />
            <Skeleton height={8} mb="lg" radius="lg" />
            <Skeleton height={8} mb="lg" radius="lg" />
            <Skeleton height={8} mb="lg" width="70%" radius="lg" />
          </Card>
        ))}
      </div>
    </main>
  );
}
