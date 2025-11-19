"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Heading2 from "@/components/Heading2";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import Card from "@/components/Card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.error || "Login failed");
      } else {
        // cookie is set by the server
        // redirect wherever you want after login
        router.push("/");
      }
    } catch (err) {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center p-7 mt-7">
      <Card shadow="md" padding="md" className="flex flex-col self-center min-w-min">
        <Heading2 className="text-center" gutter="lg">
          Log In
        </Heading2>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-fit self-center min-w-[30em]"
        >
          <TextField
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-left mb-5"
          />

          <TextField
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-left mb-5"
          />

          <Button
            variant="primary"
            size="lg"
            className="w-full rounded-xl"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </Button>

          {msg && (
            <p className="mt-2 text-sm text-red-500">
              {msg}
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
