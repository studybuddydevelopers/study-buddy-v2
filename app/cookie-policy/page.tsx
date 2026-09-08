import Link from "next/link";
import PolicyDocumentPage, {
  type PolicyDocumentSection,
} from "@/components/PolicyDocumentPage";
import { createPageMetadata } from "@/lib/site-metadata";

const LAST_UPDATED = "8 September 2026";

export const metadata = createPageMetadata({
  title: "Cookie and Local Storage Policy",
  description:
    "Learn which cookies and local-storage technologies Study Buddy uses, why essential storage is needed and which controls are available to you.",
  path: "/cookie-policy",
});

const sections: PolicyDocumentSection[] = [
  {
    id: "meaning",
    title: "What these technologies are",
    content: (
      <p>
        Cookies are small pieces of information stored by a browser. Local
        storage is browser storage that can remain on a device between visits.
        Similar technologies can also help providers deliver security checks.
        This policy explains their current use on Study Buddy and should be read
        with our <Link href="/privacy-policy">Privacy Policy</Link>.
      </p>
    ),
  },
  {
    id: "current-use",
    title: "What Study Buddy currently uses",
    content: (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-gray-900">
              <th className="px-3 py-3">Technology</th>
              <th className="px-3 py-3">Purpose</th>
              <th className="px-3 py-3">Where it remains</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-3 py-3">Authentication cookies</td>
              <td className="px-3 py-3">
                Keep a user signed in, refresh a session, and protect account
                requests.
              </td>
              <td className="px-3 py-3">The user&apos;s browser.</td>
            </tr>
            <tr>
              <td className="px-3 py-3">Local practice drafts</td>
              <td className="px-3 py-3">
                Preserve unfinished practice answers on the device, especially
                when cloud draft saving is disabled or low-data mode is active.
              </td>
              <td className="px-3 py-3">The user&apos;s browser storage.</td>
            </tr>
            <tr>
              <td className="px-3 py-3">CAPTCHA technology</td>
              <td className="px-3 py-3">
                Help Cloudflare Turnstile or hCaptcha distinguish legitimate
                account activity from automated abuse.
              </td>
              <td className="px-3 py-3">
                The browser and the configured CAPTCHA provider.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "essential",
    title: "Why essential storage is used",
    content: (
      <p>
        Authentication and security storage is necessary to provide a signed-in
        account safely. Local practice drafts provide a requested feature and
        help prevent loss of unfinished work. CAPTCHA technology supports our
        legitimate interest in preventing account abuse. Blocking these
        technologies may stop sign-in, recovery, draft saving, or other protected
        features from working correctly.
      </p>
    ),
  },
  {
    id: "tracking",
    title: "Advertising and analytics",
    content: (
      <p>
        Study Buddy does not currently use advertising cookies, advertising
        pixels, or behavioural analytics cookies. If we introduce a non-essential
        analytics or advertising technology, we will update this policy and
        provide any notice and consent controls required before activating it.
      </p>
    ),
  },
  {
    id: "controls",
    title: "Your controls",
    content: (
      <>
        <p>
          Browser settings can show, block, or delete cookies and local storage.
          Clearing Study Buddy storage may sign you out and remove unfinished
          drafts stored only on that device. It does not automatically delete
          information already saved to your Study Buddy account.
        </p>
        <p>
          Cloud draft saving and low-data mode can be managed in Study Buddy
          settings. To request deletion of account data, follow the process in
          our Privacy Policy.
        </p>
      </>
    ),
  },
  {
    id: "providers",
    title: "Provider information",
    content: (
      <p>
        Supabase provides authentication. Depending on configuration, account
        forms use{" "}
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cloudflare Turnstile
        </a>{" "}
        or <a href="https://www.hcaptcha.com/privacy">hCaptcha</a>. These
        providers may process device, browser, and network information under
        their own notices.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        We will update this page when our use of browser storage changes. A
        material change, especially the introduction of non-essential tracking,
        will receive an appropriate additional notice and consent choice where
        required.
      </p>
    ),
  },
];

export default function CookiePolicyPage() {
  return (
    <PolicyDocumentPage
      title="Cookie and Local Storage Policy"
      eyebrow="Browser storage"
      introduction="Study Buddy currently uses essential account technologies, local practice drafts, and CAPTCHA protection—not advertising trackers."
      icon="lock"
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
