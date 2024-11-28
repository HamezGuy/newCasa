'use client';

import { Title } from '@mantine/core';
import { useLoadScript } from '@react-google-maps/api';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './HeroSearch.module.css';
import SearchInput from './SearchInput';

export default function MainPageSearch() {
  const [loading, setLoading] = useState(true);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || '',
    libraries: ['places'],
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loadError) {
    console.error('Google Maps script load error:', loadError);
    return <p>Error loading Google Maps script.</p>;
  }

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
        {loading ? (
          <p className="text-center text-gray-500">Loading search input...</p>
        ) : isLoaded ? (
          <SearchInput />
        ) : (
          <p className="text-center text-gray-500">Initializing maps...</p>
        )}
      </div>
    </div>
  );
}
