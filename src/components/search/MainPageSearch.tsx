'use client';

import { Title } from '@mantine/core';
import Image from 'next/image';
import { Suspense } from 'react';
import styles from './HeroSearch.module.css';
import SearchInput from './SearchInput';

export default function HeroSearch() {
  return (
    <div
      style={{ height: 600 }}
      className={`${styles.heroSearch} relative flex flex-col justify-center items-center p-24 text-white`}
    >
      <Image
        src="/img/home-hero3.jpg"
        alt="Cover"
        fill
        priority
        style={{ objectFit: 'cover' }}
        className="brightness-75"
      />

      <Title
        order={2}
        className="drop-shadow text-center text-4xl mb-4 normal-case"
      >
        Find your next home
      </Title>
      <div className="flex justify-center w-full">
        <Suspense>
          <SearchInput />
        </Suspense>
      </div>
    </div>
  );
}
