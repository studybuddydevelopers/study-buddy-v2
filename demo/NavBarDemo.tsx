"use client";

import NavBar from "../components/NavBar";
import Heading1 from "../components/Heading1";
import type { User } from "@supabase/supabase-js";

const mockUser = { id: "demo-user", email: "demo@studybuddy.app" } as User;

export default function NavBarDemo() {
  return (
    <div className="p-8 space-y-12">
      <Heading1 gutter="md">NavBar Demo</Heading1>

      <NavBar user={null} links={[]} />

      <NavBar
        user={mockUser}
        onNotificationsClick={() => alert("Notifications clicked")}
      />

      <NavBar user={null} showNotifications={false} />
    </div>
  );
}
