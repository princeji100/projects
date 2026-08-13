// This function is used to upload images to the server
import { toast } from 'react-toastify';

// Numerically identical to MAX_UPLOAD_BYTES in app/api/upload/route.js, and it must stay
// that way — a larger value here opens a band where the client sends what the server
// refuses. This is UX only (D-29); the server gate is the real one. It earns its keep
// above 4.5 MB, where Vercel rejects the body before our handler runs and the only
// message the user could otherwise get is an opaque platform 413.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// D-28: every status /api/upload can return gets its own message. The table is
// 01-04-SUMMARY.md's; 413 is overloaded (too-large AND over-quota) and only the body's
// error string tells them apart, so that one case prefers the server's own wording.
const messageForStatus = async (response) => {
  switch (response.status) {
    case 401:
      return 'You must be signed in to upload';
    case 413:
      return await response
        .json()
        .then(body => body?.error || 'Upload rejected — file too large or quota reached')
        .catch(() => 'Upload rejected — file too large or quota reached');
    case 415:
      return 'Only JPEG, PNG and WEBP images are allowed';
    case 429: {
      const retryAfter = response.headers.get('Retry-After');
      return retryAfter
        ? `Too many uploads — please wait (${retryAfter}s)`
        : 'Too many uploads — please wait';
    }
    default:
      return 'Failed to upload image';
  }
};

const upload = async (e, callbackFn) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error('Image is too large — maximum 4 MB');
        return;
      }
      const uploadPromise = new Promise((resolve, reject) => {
        const data = new FormData();
        data.append('file', file);
        fetch('/api/upload', {
          method: 'POST',
          body: data,
        }).then(response => {
          if (response.ok) {
            response.json().then(link => {
              callbackFn(link);
              resolve(link);
            })
          } else {
            messageForStatus(response).then(message => reject(new Error(message)));
          }
        }).catch(error => {
          console.error('Upload error:', error); // Debug log
          reject(error);
        });
      });
      // Swallowed after toasting, deliberately. toast.promise re-throws, and every
      // caller then either crashed (PageLinkForm awaited it bare) or raised its own
      // generic toast on top of the specific one (PageSettingForm) — burying the exact
      // reason D-28 exists to surface. The toast IS the error report.
      try {
        await toast.promise(uploadPromise, {
          pending: 'Uploading image...',
          success: 'Image uploaded successfully!',
          // The rejection's own message, so the specific reason reaches the user instead
          // of one fixed string for five different refusals.
          error: { render: ({ data }) => data?.message || 'Failed to upload image' },
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        });
      } catch {
        // already shown to the user by the error render above
      }
    }
  }

export default upload
