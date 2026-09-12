import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("navbar authentication state", () => {
  it("renders the application chrome from shared live authentication state", () => {
    const wrapper = source("app/ClientLayoutWrapper.tsx");
    const provider = source("components/AuthStateProvider.tsx");

    expect(provider).toContain("const [isAuthenticated, setIsAuthenticated]");
    expect(wrapper).toContain("<AuthStateProvider");
    expect(wrapper).toContain("const isAuthenticated = useUser();");
    expect(wrapper).toContain("<Navbar");
    expect(wrapper).toContain("isAuthenticated={isAuthenticated}");
  });

  it("updates the navbar immediately after login and refreshes server state", () => {
    const login = source("app/login/LoginClient.tsx");

    expect(login).toMatch(
      /setIsAuthenticated\(true\);\s*router\.replace\(nextPath\);\s*router\.refresh\(\);/
    );
    expect(login).not.toContain("window.location.replace");
  });

  it.each([
    "components/NavBar.tsx",
    "components/AccountLifecycleStatus.tsx",
    "app/settings/account/AccountSettingsClient.tsx",
    "app/account-deletion/confirm/AccountDeletionConfirmationClient.tsx",
  ])("clears live authentication state in %s", (relativePath) => {
    expect(source(relativePath)).toContain("setIsAuthenticated(false);");
  });
});
