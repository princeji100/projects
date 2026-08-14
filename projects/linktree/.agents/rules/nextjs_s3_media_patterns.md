# Next.js Image Optimization for Cloud Storage

1. **Comprehensive S3 Remote Patterns**:
   - When integrating AWS S3 with `next/image`, always include wildcard domain patterns in `next.config.mjs`:
     ```javascript
     remotePatterns: [
       { protocol: 'https', hostname: '*.s3.amazonaws.com', pathname: '/**' },
       { protocol: 'https', hostname: '*.s3.*.amazonaws.com', pathname: '/**' },
       { protocol: 'https', hostname: 's3.amazonaws.com', pathname: '/**' },
     ]
     ```

2. **Fail-Safe Fallbacks (`<SafeImage />`)**:
   - Wrap `next/image` in a fallback boundary that detects `onError` load failures and displays a clean placeholder with filename/icon rather than letting broken browser image icons render.
   - For sensitive workflows (e.g., file deletion), always render a visual preview thumbnail and in-use location tags in the confirmation modal so users know exactly what asset is being modified or deleted.
