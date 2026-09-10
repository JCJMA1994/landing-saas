export const ALLOWED_IMAGE_FORMATS = ["auto", "webp", "avif", "png", "jpeg"] as const;
export type ImageFormat = (typeof ALLOWED_IMAGE_FORMATS)[number];

export const ALLOWED_IMAGE_FITS = ["cover", "contain", "inside"] as const;
export type ImageFit = (typeof ALLOWED_IMAGE_FITS)[number];

export interface ImageTransformOptions {
  readonly url: string;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly quality?: number | undefined;
  readonly fit?: ImageFit | undefined;
  readonly format?: ImageFormat | undefined;
}

export class InvalidImageTransformError extends Error {
  constructor(message: string) {
    super(`Invalid image transform parameter: ${message}`);
    this.name = "InvalidImageTransformError";
  }
}

export function parseImageTransformParams(searchParams: URLSearchParams): ImageTransformOptions {
  const url = searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new InvalidImageTransformError("Missing or invalid 'url' parameter. Must be an absolute HTTP/HTTPS URL.");
  }

  let width: number | undefined;
  const rawW = searchParams.get("w") || searchParams.get("width");
  if (rawW) {
    width = parseInt(rawW, 10);
    if (isNaN(width) || width < 16 || width > 3840) {
      throw new InvalidImageTransformError("Width 'w' must be an integer between 16 and 3840.");
    }
  }

  let height: number | undefined;
  const rawH = searchParams.get("h") || searchParams.get("height");
  if (rawH) {
    height = parseInt(rawH, 10);
    if (isNaN(height) || height < 16 || height > 2160) {
      throw new InvalidImageTransformError("Height 'h' must be an integer between 16 and 2160.");
    }
  }

  let quality = 80;
  const rawQ = searchParams.get("q") || searchParams.get("quality");
  if (rawQ) {
    quality = parseInt(rawQ, 10);
    if (isNaN(quality) || quality < 10 || quality > 100) {
      throw new InvalidImageTransformError("Quality 'q' must be an integer between 10 and 100.");
    }
  }

  let fit: ImageFit = "cover";
  const rawFit = searchParams.get("fit");
  if (rawFit) {
    if ((ALLOWED_IMAGE_FITS as readonly string[]).includes(rawFit)) {
      fit = rawFit as ImageFit;
    }
  }

  let format: ImageFormat = "auto";
  const rawFormat = searchParams.get("format");
  if (rawFormat && (ALLOWED_IMAGE_FORMATS as readonly string[]).includes(rawFormat)) {
    format = rawFormat as ImageFormat;
  }

  return {
    url,
    width,
    height,
    quality,
    fit,
    format,
  };
}

export function negotiateImageFormat(
  acceptHeader: string | null | undefined,
  requestedFormat: ImageFormat = "auto"
): "avif" | "webp" | "jpeg" | "png" {
  if (requestedFormat !== "auto") {
    return requestedFormat;
  }

  if (!acceptHeader) {
    return "webp";
  }

  const accept = acceptHeader.toLowerCase();
  if (accept.includes("image/avif")) {
    return "avif";
  }

  if (accept.includes("image/webp")) {
    return "webp";
  }

  return "jpeg";
}

export function buildTransformedImageUrl(
  apiPath: string,
  options: ImageTransformOptions
): string {
  const sp = new URLSearchParams();
  sp.set("url", options.url);
  if (options.width) sp.set("w", String(options.width));
  if (options.height) sp.set("h", String(options.height));
  if (options.quality) sp.set("q", String(options.quality));
  if (options.fit) sp.set("fit", options.fit);
  if (options.format) sp.set("format", options.format);

  return `${apiPath}?${sp.toString()}`;
}
