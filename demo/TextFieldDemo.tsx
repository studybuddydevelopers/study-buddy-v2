"use client";

import { useState } from "react";
import TextField from "../components/TextField";
import Heading1 from "../components/Heading1";
import Heading2 from "../components/Heading2";

export default function TextFieldDemo() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="p-8 space-y-12 text-left">
      <Heading1 gutter="md">TextField Demo</Heading1>

      {/* Basic */}
      <section className="space-y-4">
        <Heading2 gutter="md">Basic Inputs</Heading2>
        <TextField
          label="Email or Phone Number"
          placeholder="Enter your email or phone number"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </section>

      {/* Error state */}
      <section className="space-y-4">
        <Heading2 gutter="md">Error State</Heading2>
        <TextField
          label="Email"
          placeholder="Enter your email"
          value={email}
          error="Invalid email address"
          onChange={(e) => setEmail(e.target.value)}
        />
      </section>

      {/* Disabled */}
      <section className="space-y-4">
        <Heading2 gutter="md">Disabled</Heading2>
        <TextField
          label="Disabled Field"
          placeholder="Can't type here"
          disabled
        />
      </section>
    </div>
  );
}
