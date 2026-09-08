import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPageMetadata,
  DEFAULT_SITE_TITLE,
  formatMetadataTitle,
  getMetadataBase,
} from "./site-metadata";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("site metadata", () => {
  it("builds consistent public page metadata", () => {
    vi.stubEnv("APP_ORIGIN", "https://studybuddy.example/app");

    const metadata = createPageMetadata({
      title: "About Us",
      description: "Learn about Study Buddy.",
      path: "/about-us",
    });

    expect(metadata.title).toBe("About Us");
    expect(metadata.description).toBe("Learn about Study Buddy.");
    expect(metadata.alternates?.canonical?.toString()).toBe(
      "https://studybuddy.example/about-us"
    );
    expect(metadata.openGraph).toMatchObject({
      title: "About Us | Study Buddy",
      description: "Learn about Study Buddy.",
      siteName: "Study Buddy",
      locale: "en_NG",
      type: "website",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary",
      title: "About Us | Study Buddy",
      description: "Learn about Study Buddy.",
    });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("marks protected and internal pages as non-indexable", () => {
    const metadata = createPageMetadata({
      title: "Dashboard",
      description: "Your Study Buddy dashboard.",
      index: false,
    });

    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
      noarchive: true,
    });
  });

  it("supports an absolute homepage title", () => {
    const metadata = createPageMetadata({
      title: DEFAULT_SITE_TITLE,
      description: "Study Buddy homepage.",
      absoluteTitle: true,
    });

    expect(metadata.title).toEqual({ absolute: DEFAULT_SITE_TITLE });
    expect(metadata.openGraph).toMatchObject({ title: DEFAULT_SITE_TITLE });
  });

  it("normalises the configured origin and rejects invalid values", () => {
    vi.stubEnv("APP_ORIGIN", "https://studybuddy.example/deploy?preview=true");
    expect(getMetadataBase()?.toString()).toBe("https://studybuddy.example/");

    vi.stubEnv("APP_ORIGIN", "javascript:alert(1)");
    expect(getMetadataBase()).toBeNull();
  });

  it("does not append the brand twice", () => {
    expect(formatMetadataTitle("About Us")).toBe("About Us | Study Buddy");
    expect(formatMetadataTitle("About Us | Study Buddy")).toBe(
      "About Us | Study Buddy"
    );
  });
});
