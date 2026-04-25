export interface CompressedImageResult {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  quality?: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to compress image."));
        }
      },
      type,
      quality
    );
  });
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  const maxWidth = options.maxWidth ?? 1600;
  const quality = options.quality ?? 0.82;

  if (typeof window === "undefined") {
    return {
      blob: file,
      mimeType: file.type || "image/jpeg",
      width: 0,
      height: 0
    };
  }

  const image = await loadImage(file);
  const scale = image.width > maxWidth ? maxWidth / image.width : 1;
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return {
      blob: file,
      mimeType: file.type || "image/jpeg",
      width: image.width,
      height: image.height
    };
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const preferredType = file.type === "image/png" ? "image/webp" : "image/jpeg";
  let blob: Blob;

  try {
    blob = await canvasToBlob(canvas, preferredType, quality);
  } catch {
    blob = await canvasToBlob(canvas, file.type || "image/jpeg", quality);
  }

  return {
    blob,
    mimeType: blob.type || preferredType,
    width,
    height
  };
}
