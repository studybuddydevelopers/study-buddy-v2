"use client";

import Footer from "../components/Footer";
import Heading1 from "../components/Heading1";
import Heading2 from "../components/Heading2";

export default function FooterDemo() {
  return (
    <div className="p-8 space-y-12">
      <Heading1 gutter="md">Footer Demo</Heading1>

      <div className="overflow-hidden">
        {/* Default links */}
        <Heading2 gutter="sm">Default Footer</Heading2>
        <Footer />

        {/* Example with custom links */}
        <Heading2 gutter="sm">Custom Links</Heading2>
        <div className="mt-8 border-t pt-6">
          <Footer
            brand="Study Buddy"
            links={[
              { label: "Help Center", href: "/help" },
              { label: "Careers", href: "/careers" },
              { label: "Blog", href: "/blog" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
