"use client";

import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex flex-col justify-center items-center text-center h-full"
    >
      <Heading1 gutter="sm">Page Not Found</Heading1>

      <Paragraph variant="muted">
        The page you’re looking for doesn’t exist or has been moved.  
        Please check the URL or return to the home page.
      </Paragraph>

      <div className="flex justify-center gap-4 mt-4">
        <Link href="/" >
          <Button variant="primary" size="md">
            Go Home
          </Button>
        </Link>
        
        <Link href="/contact-us" >
          <Button variant="secondary" size="md" className="p-6">
            Contact Support
          </Button>
        </Link>
      </div>
    </div>

  );
}
