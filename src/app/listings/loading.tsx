import { Card, Skeleton } from '@mantine/core';

export default function Loading() {
  const skeletons = [1, 2, 3, 4, 5, 6];
  return (
    <>
      <Skeleton height={238} mb="lg" />
      <div
        className={`container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 mx-auto`}
      >
        {skeletons.map((i) => (
          <Card shadow="sm" radius="md" withBorder key={i}>
            <Skeleton height={256} mb="lg" />
            <Skeleton height={8} mb="lg" radius="lg" />
            <Skeleton height={8} mb="lg" radius="lg" />
            <Skeleton height={8} mb="lg" width="70%" radius="ll" />
          </Card>
        ))}
      </div>
    </>
  );
}
