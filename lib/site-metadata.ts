import type { Metadata } from "next";

export const SITE_NAME = "Study Buddy";
export const DEFAULT_SITE_TITLE =
  "Study Buddy | Smarter WAEC Exam Preparation";
export const DEFAULT_SITE_DESCRIPTION =
  "Prepare for WAEC with personalised study plans, realistic practice questions, trusted learning materials and responsible AI study support built for Nigerian students.";

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  index?: boolean;
  absoluteTitle?: boolean;
};

export function getMetadataBase(): URL | null {
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  if (!configuredOrigin) return null;

  try {
    const origin = new URL(configuredOrigin);
    if (origin.protocol !== "https:" && origin.protocol !== "http:") {
      return null;
    }

    origin.pathname = "/";
    origin.search = "";
    origin.hash = "";
    return origin;
  } catch {
    return null;
  }
}

export function formatMetadataTitle(title: string) {
  return title === SITE_NAME || title.endsWith(`| ${SITE_NAME}`)
    ? title
    : `${title} | ${SITE_NAME}`;
}

export function createPageMetadata({
  title,
  description,
  path,
  index = true,
  absoluteTitle = false,
}: PageMetadataOptions): Metadata {
  const documentTitle = absoluteTitle ? title : formatMetadataTitle(title);
  const metadataBase = getMetadataBase();
  const canonicalUrl = metadataBase && path ? new URL(path, metadataBase) : null;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(canonicalUrl ? { alternates: { canonical: canonicalUrl } } : {}),
    openGraph: {
      title: documentTitle,
      description,
      siteName: SITE_NAME,
      locale: "en_NG",
      type: "website",
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
    },
    twitter: {
      card: "summary",
      title: documentTitle,
      description,
    },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : {
          index: false,
          follow: false,
          nocache: true,
          noarchive: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        },
  };
}
