// Pinata storage utility for direct uploads via server-side API
// Uses Pinata for IPFS image storage

export interface ImageUploadResult {
  success: boolean;
  ipfsUrl?: string;
  error?: string;
}

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  file?: File;
}

/**
 * Validate image file meets requirements:
 * - Must be JPG or PNG
 * - Must be square (1:1 aspect ratio)
 * - Must be no more than 1MB
 */
export function validateImageFile(file: File): Promise<ImageValidationResult> {
  return new Promise((resolve) => {
    // Check file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      resolve({
        isValid: false,
        error: 'File must be a JPG or PNG image'
      });
      return;
    }

    // Check file size (1MB = 1024 * 1024 bytes)
    const maxSize = 1024 * 1024;
    if (file.size > maxSize) {
      resolve({
        isValid: false,
        error: `File size must be no more than 1MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
      });
      return;
    }

    // At the end, if all checks pass:
    resolve({
      isValid: true,
      file
    });
  });
}

// Client-side upload removed - only server-side uploads are supported

/**
 * Upload image via API endpoint (server-side uploads only)
 * The backend will use Pinata to store the image on IPFS
 */
export async function uploadImageViaAPI(file: File): Promise<ImageUploadResult> {
  try {
    console.log('Starting server-side upload for:', file.name);
    
    // Validate file first
    const validation = await validateImageFile(file);
    if (!validation.isValid) {
      console.error('Validation failed:', validation.error);
      return {
        success: false,
        error: validation.error
      };
    }

    console.log('File validation passed, uploading to server...');
    
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    console.log('Server response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
      // Type guard for errorData
      const errorMsg = (errorData && typeof errorData === 'object' && 'error' in errorData && typeof errorData.error === 'string')
        ? errorData.error
        : `Server error: ${response.status}`;
      console.error('Server upload failed:', errorData);
      return {
        success: false,
        error: errorMsg
      };
    }

    const result = await response.json();
    // Type guard for result
    const ipfsUrl = (result && typeof result === 'object' && 'ipfsUrl' in result && typeof result.ipfsUrl === 'string')
      ? result.ipfsUrl
      : undefined;
    console.log('Server upload successful:', result);
    
    return {
      success: !!ipfsUrl,
      ipfsUrl
    };

  } catch (error) {
    console.error('Error uploading via API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
} 