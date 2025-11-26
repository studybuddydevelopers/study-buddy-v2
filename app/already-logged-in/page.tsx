"use client";

import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";

export default async function AlreadyLoggedIn() {
  await new Promise(r => setTimeout(r, 1000)); // simulate loading
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Heading1 gutter="sm">You Are Already Logged In</Heading1>
      <Paragraph variant="muted">
        You cannot access this page while logged in.
      </Paragraph>

      <div className="flex gap-4 mt-6">
        <Button variant="primary" size="md" onClick={() => (window.location.href = "/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
