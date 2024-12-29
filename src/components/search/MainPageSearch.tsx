'use client';

import Image from 'next/image';
import { Title } from '@mantine/core';
import { useState } from 'react';
import SearchInput from './SearchInput';
import styles from './HeroSearch.module.css';

export default function MainPageSearch() {
  // Since the script is loaded in layout (or a client provider),
  // we no longer handle "isLoaded" or "loadError" here.

  return (
    <div
      className={`${styles.heroSearch} relative flex flex-col justify-center items-center p-24 text-white`}
      style={{ height: 600 }}
    >
      <Image
        src="/img/home-hero3.jpg"
        alt="Cover"
        fill
        priority
        style={{ objectFit: 'cover' }}
        className="brightness-75"
      />

      <Title order={2} className="drop-shadow text-center text-4xl mb-4 normal-case">
        Find your next home
      </Title>

      <div className="flex justify-center w-full">
        {/* Directly render the search input with redirect */}
        <SearchInput isRedirectEnabled={true} />
      </div>
    </div>
  );
}
