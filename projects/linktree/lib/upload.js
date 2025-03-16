// This function is used to upload images to the server
import { toast } from 'react-toastify';
const upload = async (e, callbackFn) => {
    const file = e.target.files[0];
    if (file) {
      const uploadPromise = new Promise((resolve, reject) => {
        const data = new FormData();
        data.append('file', file);
        fetch('/api/upload', {
          method: 'POST',
          body: data,
          headers: {
            'x-amz-acl': 'public-read' // Set the ACL to public-read
          }
        }).then(response => {
          if (response.ok) {
            response.json().then(link => {
              callbackFn(link);
              resolve(link);
            })
          } else {
            reject(new Error('Failed to upload image'));
          }
        }).catch(error => {
          console.error('Upload error:', error); // Debug log
          reject(error);
        });
      });
      await toast.promise(uploadPromise, {
        pending: 'Uploading image...',
        success: 'Image uploaded successfully!',
        error: 'Failed to upload image',
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
    }
  }

export default upload