"use client";

import NavBar from "../components/NavBar";
import Heading1 from "../components/Heading1";

export default function NavBarDemo() {
  return (
    <div className="p-8 space-y-12">
      <Heading1 gutter="md">NavBar Demo</Heading1>

      <NavBar
        onSignIn={() => alert("Sign In clicked")}
        onSignUp={() => alert("Sign Up clicked")}
        links={[]}
      />

      <NavBar
        onNotificationsClick={() => alert("Notifications clicked")}
      />

      <NavBar
        loading={true}
      />
    </div>
  );
}
