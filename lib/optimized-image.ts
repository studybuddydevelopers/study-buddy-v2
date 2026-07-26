export const DEFAULT_OPTIMIZED_IMAGE_WIDTHS = [
  320, 480, 640, 768, 960, 1200,
];

const DEFAULT_IMAGE_QUALITY = 72;
const SUPABASE_OBJECT_PUBLIC_PATH = "/storage/v1/object/public/";
const SUPABASE_RENDER_PUBLIC_PATH = "/storage/v1/render/image/public/";

interface OptimizedImageUrlOptions {
  width?: number;
  quality?: number;
}

function parseImageUrl(src: string) {
  try {
    return new URL(src);
  } catch {
    return null;
  }
}

function isSvg(url: URL) {
  return url.pathname.toLowerCase().endsWith(".svg");
}

export function canUseOptimizedImageLoader(src: string) {
  const url = parseImageUrl(src);
  if (!url || isSvg(url)) return false;

  return (
    url.pathname.includes(SUPABASE_OBJECT_PUBLIC_PATH) ||
    url.pathname.includes(SUPABASE_RENDER_PUBLIC_PATH)
  );
}

export function getOptimizedImageUrl(
  src: string,
  options: OptimizedImageUrlOptions = {}
) {
  const url = parseImageUrl(src);
  if (!url || isSvg(url)) return src;

  if (url.pathname.includes(SUPABASE_OBJECT_PUBLIC_PATH)) {
    url.pathname = url.pathname.replace(
      SUPABASE_OBJECT_PUBLIC_PATH,
      SUPABASE_RENDER_PUBLIC_PATH
    );
  } else if (!url.pathname.includes(SUPABASE_RENDER_PUBLIC_PATH)) {
    return src;
  }

  if (options.width) {
    url.searchParams.set("width", String(options.width));
  }
  url.searchParams.set("quality", String(options.quality ?? DEFAULT_IMAGE_QUALITY));
  url.searchParams.set("resize", "contain");

  return url.toString();
}

export function getOptimizedImageSrcSet({
  src,
  widths = DEFAULT_OPTIMIZED_IMAGE_WIDTHS,
  quality = DEFAULT_IMAGE_QUALITY,
}: {
  src: string;
  widths?: number[];
  quality?: number;
}) {
  if (!canUseOptimizedImageLoader(src)) return undefined;

  return widths
    .map((width) => `${getOptimizedImageUrl(src, { width, quality })} ${width}w`)
    .join(", ");
}
