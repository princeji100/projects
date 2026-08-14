'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function SafeImage({
  src,
  alt = '',
  width,
  height,
  fill = false,
  className = '',
  style,
  priority = false,
  fallback = null,
  unoptimized = true,
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    if (fallback) return fallback;
    return (
      <div
        className={`bg-slate-800 flex items-center justify-center text-slate-500 ${className}`}
        style={style}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      fill={fill}
      className={className}
      style={style}
      priority={priority}
      unoptimized={unoptimized}
      onError={() => setHasError(true)}
    />
  );
}
