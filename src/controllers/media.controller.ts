import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { cloudinary } from '../config/cloudinary';
import multer from 'multer';
import https from 'node:https';
import { URL } from 'node:url';

const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ storage }).single('file');

export const uploadMedia = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(500).json({ success: false, message: 'Upload failed', created_at: new Date().toISOString() });
  }

  const { publicId, url, bytes, format } = req.file as any;
  return res.status(200).json({
    success: true,
    message: 'File uploaded successfully',
    data: { publicId, url, bytes, format },
    created_at: new Date().toISOString(),
  });
});

export const deleteMedia = asyncHandler(async (req: Request, res: Response) => {
  const { publicId } = req.params as { publicId: string };

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    res.status(200).json({ success: true, message: 'Deleted', data: result, created_at: new Date().toISOString() });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ success: false, message: 'Failed to delete media' });
  }
});

export const proxyDownload = asyncHandler(async (req: Request, res: Response) => {
  const { public_id, resource_type = 'image', delivery_type = 'upload', filename, format } = req.query as {
    public_id: string;
    resource_type?: 'image' | 'video' | 'raw';
    delivery_type?: 'upload' | 'private' | 'authenticated';
    filename?: string;
    format?: string;
  };

  if (!public_id) {
    return res.status(400).json({ success: false, message: 'public_id is required' });
  }

  try {
    let url: string;

    if (delivery_type === 'upload') {
      // Public upload - direct download
      url = cloudinary.url(public_id, {
        resource_type,
        flags: 'attachment',
        ...(filename && { filename }),
        ...(format && { format }),
      });
    } else if (delivery_type === 'private' || delivery_type === 'authenticated') {
      if (!format) {
        return res.status(400).json({ success: false, message: 'format is required for private/authenticated downloads' });
      }

      // Private/Authenticated - generate signed URL
      url = cloudinary.url(public_id, {
        resource_type,
        flags: 'attachment',
        sign_url: true,
        ...(filename && { filename }),
        format,
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid delivery_type' });
    }

    return res.status(200).json({ success: true, message: 'Signed URL generated', data: { url }, created_at: new Date().toISOString() });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate download URL' });
  }
});

export const signedDownload = asyncHandler(async (req: Request, res: Response) => {
  const { public_id, resource_type = 'image', delivery_type = 'upload', filename, format } = req.query as {
    public_id: string;
    resource_type?: 'image' | 'video' | 'raw';
    delivery_type?: 'upload' | 'private' | 'authenticated';
    filename?: string;
    format?: string;
  };

  if (!public_id) {
    return res.status(400).json({ success: false, message: 'public_id is required' });
  }

  try {
    let url: string;

    if (delivery_type === 'upload') {
      // Public upload - direct download
      url = cloudinary.url(public_id, {
        resource_type,
        flags: 'attachment',
        ...(filename && { filename }),
        ...(format && { format }),
      });
    } else if (delivery_type === 'private' || delivery_type === 'authenticated') {
      if (!format) {
        return res.status(400).json({ success: false, message: 'format is required for private/authenticated downloads' });
      }

      // Private/Authenticated - generate signed URL
      url = cloudinary.url(public_id, {
        resource_type,
        flags: 'attachment',
        sign_url: true,
        ...(filename && { filename }),
        format,
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid delivery_type' });
    }

    return res.status(200).json({ success: true, message: 'Signed URL generated', data: { url }, created_at: new Date().toISOString() });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate download URL' });
  }
}); 