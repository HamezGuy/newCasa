import { Box, Group, Skeleton, Stack } from '@mantine/core';

export default function Loading() {
  return (
    <>
      <Skeleton height={388} mb="xl" />
      <Box className="container mx-auto max-w-5xl px-6">
        <Box>
          <Group justify="space-between">
            <Stack gap={0}>
              <Skeleton h={20} w={200} mb="md" />
              <Skeleton h={30} w={200} mb="xl" />
            </Stack>

            <Stack gap={0}>
              <Skeleton h={20} w={200} mb="md" />
              <Skeleton h={30} w={200} mb="xl" />
            </Stack>
          </Group>
          <Skeleton h={100} w={'100%'} mb="lg" />
          <Skeleton h={10} w={'100%'} mb="md" />
          <Skeleton h={10} w={'100%'} mb="md" />
          <Skeleton h={10} w={'70%'} mb="md" />
        </Box>
      </Box>
    </>
  );
}
