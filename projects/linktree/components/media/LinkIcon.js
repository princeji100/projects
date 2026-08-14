'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';

export default function LinkIcon({
  src,
  title = 'Link icon',
  size = 64,
  className = '',
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <FontAwesomeIcon
        className={`w-6 h-6 text-white/90 ${className}`}
        icon={faLink}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={title}
      width={size}
      height={size}
      className={`object-cover w-full h-full ${className}`}
      unoptimized
      onError={() => setHasError(true)}
    />
  );
}
