'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

export default function ProfileAvatar({
  src,
  alt = 'Profile picture',
  size = 176,
  className = '',
  priority = false,
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 text-white/80 ${className}`}
      >
        <FontAwesomeIcon icon={faUser} className="text-4xl opacity-75" />
      </div>
    );
  }

  return (
    <Image
      className={`object-cover w-full h-full ${className}`}
      src={src}
      width={size}
      height={size}
      alt={alt}
      priority={priority}
      onError={() => setHasError(true)}
    />
  );
}
