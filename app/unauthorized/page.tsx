"use client";

import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Link from "next/link";

export default async function Unauthorized() {
  await new Promise(r => setTimeout(r, 1000)); // simulate loading
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Heading1 gutter="sm">Access Denied</Heading1>
      <Paragraph variant="muted">
        You are not authorized to view this page. Please log in or sign up to continue.
      </Paragraph>

      <div className="flex gap-4 mt-6">
        <Link href={"/login"}>
          <Button variant="primary" size="md">
            Log In
          </Button>
        </Link>

        <Link href={"/sign-up"}>
          <Button variant="outline" size="md">
            Sign Up
          </Button>
        </Link>
      </div>
    </div>
  );
}
