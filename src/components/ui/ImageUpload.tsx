import { useState, useRef } from 'react';
import { uploadImageViaAPI, validateImageFile } from '../../../lib/pinata-storage';
import type { ImageUploadResult } from '../../../lib/pinata-storage';

interface ImageUploadProps {
  onUploadSuccess: (ipfsUrl: string) => void;
  onUploadError: (error: string) => void;
  currentImageUrl?: string;
  disabled?: boolean;
}

export function ImageUpload({ 
  onUploadSuccess, 
  onUploadError, 
  currentImageUrl,
  disabled = false 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (disabled) return;

    setIsUploading(true);
    setUploadProgress('Validating image...');

    try {
      console.log('Starting image upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Validate file first
      const validation = await validateImageFile(file);
      if (!validation.isValid) {
        console.error('Image validation failed:', validation.error);
        onUploadError(validation.error || 'Invalid image file');
        setIsUploading(false);
        setUploadProgress('');
        return;
      }

      console.log('Image validation passed');

      // Show preview
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      
      setUploadProgress('Uploading to IPFS via Web3.Storage...');

      // Always use server-side upload to keep API key secure
      console.log('Using server-side upload...');
      const result = await uploadImageViaAPI(file);

      console.log('Upload result:', result);

      if (result.success && result.ipfsUrl) {
        console.log('Upload successful:', result.ipfsUrl);
        onUploadSuccess(result.ipfsUrl);
        setUploadProgress('✅ Uploaded to IPFS successfully!');
        
        // Clear progress after delay
        setTimeout(() => {
          setUploadProgress('');
        }, 3000);
      } else {
        console.error('Upload failed:', result.error);
        onUploadError(result.error || 'Upload failed');
        setUploadProgress('');
      }

    } catch (error) {
      console.error('Upload error:', error);
      onUploadError(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const displayImageUrl = previewUrl || currentImageUrl;

  return (
    <div className="space-y-md">
      <div
        className={`
          relative transition cursor-pointer
          ${isDragOver ? 'card' : 'card'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isUploading ? 'pointer-events-none' : ''}
        `}
        style={{ 
          minHeight: '12rem',
          border: isDragOver ? '2px dashed var(--color-primary)' : '2px dashed var(--border-primary)',
          background: isDragOver ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-lg)'
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        {displayImageUrl ? (
          <div className="flex flex-col items-center space-y-md">
            <div className="relative">
              <img
                src={displayImageUrl}
                alt="Token image preview"
                style={{
                  width: '6rem',
                  height: '6rem',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-xl)',
                  border: '2px solid var(--border-primary)'
                }}
              />
              {isUploading && (
                <div 
                  className="absolute flex items-center justify-center"
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: 'var(--radius-xl)'
                  }}
                >
                  <div 
                    className="animate-spin rounded-full"
                    style={{
                      width: '1.5rem',
                      height: '1.5rem',
                      border: '2px solid white',
                      borderTopColor: 'transparent'
                    }}
                  ></div>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted">
                {isUploading ? 'Uploading...' : 'Click or drag to replace image'}
              </p>
              {uploadProgress && (
                <p className="text-xs text-primary" style={{ marginTop: 'var(--spacing-xs)' }}>
                  {uploadProgress}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-md text-center">
            <div 
              className="flex items-center justify-center"
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--bg-surface)'
              }}
            >
              {isUploading ? (
                <div 
                  className="animate-spin rounded-full"
                  style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    border: '2px solid var(--color-primary)',
                    borderTopColor: 'transparent'
                  }}
                ></div>
              ) : (
                <svg 
                  style={{ width: '1.5rem', height: '1.5rem' }}
                  className="text-muted" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-primary">
                {isUploading ? 'Uploading...' : 'Upload Token Image'}
              </p>
              <p className="text-xs text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
                Drag & drop or click to select
              </p>
              {uploadProgress && (
                <p className="text-xs text-primary" style={{ marginTop: 'var(--spacing-xs)' }}>
                  {uploadProgress}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Requirements */}
      <div className="text-xs text-muted space-y-xs">
        <p>• JPG or PNG format</p>
        <p>• Square aspect ratio (1:1)</p>
        <p>• Maximum 1MB file size</p>
        <p>• Uploaded to IPFS via Web3.Storage</p>
      </div>
    </div>
  );
} 