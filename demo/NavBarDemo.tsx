"use client";

import NavBar from "../components/NavBar";
import Heading1 from "../components/Heading1";

export default function NavBarDemo() {
  return (
    <div className="p-8 space-y-12">
      <Heading1 gutter="md">NavBar Demo</Heading1>

      <NavBar isAuthenticated={false} links={[]} />

      <NavBar isAuthenticated />

      <NavBar isAuthenticated={false} showNotifications={false} />
    </div>
  );
}
