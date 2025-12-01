// app/already-logged-in/AlreadyLoggedInClient.tsx

"use client";

import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";

export default function AlreadyLoggedInClient() {
  const goToDashboard = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Heading1 gutter="sm">You Are Already Logged In</Heading1>

      <Paragraph variant="muted">
        You cannot access this page while logged in.
      </Paragraph>

      <div className="flex gap-4 mt-6">
        <Button
          variant="primary"
          size="md"
          onClick={goToDashboard}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
