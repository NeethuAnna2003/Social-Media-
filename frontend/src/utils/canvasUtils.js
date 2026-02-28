export const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

export function getRadianAngle(degreeValue) {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width, height, rotation) {
    const rotRad = getRadianAngle(rotation);

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

/**
 * Validates export parameters before processing
 */
function validateExportParams(imageSrc, pixelCrop) {
    if (!imageSrc) {
        throw new Error('Image source is required');
    }

    if (!pixelCrop) {
        throw new Error('Crop area is required');
    }

    if (pixelCrop.width <= 0 || pixelCrop.height <= 0) {
        throw new Error('Invalid crop dimensions');
    }

    if (pixelCrop.x < 0 || pixelCrop.y < 0) {
        throw new Error('Invalid crop position');
    }

    return true;
}

/**
 * Clamps filter values to safe ranges
 */
function clampFilters(filters = {}) {
    return {
        brightness: Math.max(0, Math.min(200, filters.brightness ?? 100)),
        contrast: Math.max(0, Math.min(200, filters.contrast ?? 100)),
        saturation: Math.max(0, Math.min(200, filters.saturation ?? 100)),
        sepia: Math.max(0, Math.min(100, filters.sepia ?? 0)),
        grayscale: Math.max(0, Math.min(100, filters.grayscale ?? 0)),
    };
}

/**
 * PRODUCTION-READY IMAGE EXPORT FUNCTION
 * 
 * Properly exports edited image with:
 * - Rotation transforms
 * - Canvas-based filters (not CSS)
 * - Device pixel ratio handling
 * - Validation and error handling
 * - Quality preservation
 * 
 * @param {string} imageSrc - Image source URL or blob URL
 * @param {Object} pixelCrop - Crop area from react-easy-crop
 * @param {number} rotation - Rotation angle in degrees (0-360)
 * @param {Object} filters - Filter values { brightness, contrast, saturation, sepia, grayscale }
 * @param {number} quality - JPEG quality (0.0 - 1.0), default 0.95
 * @returns {Promise<Blob>} - Exported image as Blob
 */
export default async function getCroppedImg(
    imageSrc,
    pixelCrop,
    rotation = 0,
    filters = {},
    quality = 0.95
) {
    try {
        // 1. VALIDATION
        validateExportParams(imageSrc, pixelCrop);

        // 2. CLAMP FILTER VALUES
        const safeFilters = clampFilters(filters);

        // 3. LOAD IMAGE
        const image = await createImage(imageSrc);

        // 4. DEVICE PIXEL RATIO (capped at 2x for performance)
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        // 5. CREATE CANVAS WITH PROPER CONTEXT
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', {
            alpha: false, // Disable alpha channel for JPEG
            willReadFrequently: false, // Optimize for single read
        });

        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        // 6. CALCULATE ROTATED BOUNDING BOX
        const rotRad = getRadianAngle(rotation);
        const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
            image.width,
            image.height,
            rotation
        );

        // 7. SET CANVAS SIZE FOR ROTATION (with DPR scaling)
        canvas.width = bBoxWidth * dpr;
        canvas.height = bBoxHeight * dpr;

        // Scale context for DPR
        ctx.scale(dpr, dpr);

        // 8. APPLY ROTATION TRANSFORMS
        ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
        ctx.rotate(rotRad);
        ctx.translate(-image.width / 2, -image.height / 2);

        // 9. APPLY FILTERS VIA CANVAS API
        const filterString = [
            `brightness(${safeFilters.brightness}%)`,
            `contrast(${safeFilters.contrast}%)`,
            `saturate(${safeFilters.saturation}%)`,
            `sepia(${safeFilters.sepia}%)`,
            `grayscale(${safeFilters.grayscale}%)`,
        ].join(' ');

        ctx.filter = filterString;

        // 10. DRAW ROTATED AND FILTERED IMAGE
        ctx.drawImage(image, 0, 0);

        // 11. EXTRACT CROPPED REGION (accounting for DPR)
        const cropX = Math.max(0, Math.min(pixelCrop.x * dpr, canvas.width));
        const cropY = Math.max(0, Math.min(pixelCrop.y * dpr, canvas.height));
        const cropWidth = Math.min(pixelCrop.width * dpr, canvas.width - cropX);
        const cropHeight = Math.min(pixelCrop.height * dpr, canvas.height - cropY);

        const croppedData = ctx.getImageData(
            cropX,
            cropY,
            cropWidth,
            cropHeight
        );

        // 12. CREATE FINAL CANVAS WITH CROPPED DIMENSIONS
        canvas.width = pixelCrop.width * dpr;
        canvas.height = pixelCrop.height * dpr;

        // Reset context after resize
        ctx.putImageData(croppedData, 0, 0);

        // 13. EXPORT AS HIGH-QUALITY BLOB
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        // Validate exported blob
                        if (blob.size === 0) {
                            reject(new Error('Exported image is empty'));
                            return;
                        }

                        if (blob.size > 10 * 1024 * 1024) {
                            console.warn('Exported image exceeds 10MB, consider reducing quality');
                        }

                        resolve(blob);
                    } else {
                        reject(new Error('Canvas export failed - blob is null'));
                    }
                },
                'image/jpeg',
                quality
            );
        });

    } catch (error) {
        console.error('Image export error:', error);
        throw new Error(`Failed to export image: ${error.message}`);
    }
}
