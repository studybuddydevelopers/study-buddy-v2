import Link from "next/link";
import type { Metadata } from "next";
import PolicyDocumentPage, {
  type PolicyDocumentSection,
} from "@/components/PolicyDocumentPage";

const LAST_UPDATED = "5 September 2026";
const CONTACT_EMAIL = "sbstudybuddy0@gmail.com";

export const metadata: Metadata = {
  title: "AI Safety and Responsible Use | Study Buddy",
  description:
    "Rules and safety guidance for using Study Buddy's AI learning features.",
};

const sections: PolicyDocumentSection[] = [
  {
    id: "purpose",
    title: "What the AI is for",
    content: (
      <>
        <p>
          Study Buddy&apos;s AI is a learning aid for explanations, revision,
          practice, and study planning. It is not a teacher, examiner, counsellor,
          medical professional, lawyer, emergency service, or official source of
          examination instructions.
        </p>
        <p>
          This policy supplements our <Link href="/terms-of-service">Terms of Service</Link>,{" "}
          <Link href="/privacy-policy">Privacy Policy</Link>, and{" "}
          <Link href="/parent-student-privacy">Parent and Student Privacy Notice</Link>.
        </p>
      </>
    ),
  },
  {
    id: "limitations",
    title: "AI can be wrong",
    content: (
      <>
        <p>
          AI may produce an answer that is inaccurate, incomplete, outdated,
          biased, or unrelated to the question. It may sound confident even when
          it is wrong. Students should compare important answers with teachers,
          approved textbooks, mark schemes, and official examination material.
        </p>
        <p>
          Study Buddy does not guarantee an examination score or academic
          outcome. Never rely on AI alone for a safety, health, legal, financial,
          disciplinary, or other serious decision.
        </p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Protect personal information",
    content: (
      <>
        <p>Do not enter:</p>
        <ul>
          <li>passwords, PINs, one-time codes, or security answers;</li>
          <li>full payment-card or bank-account information;</li>
          <li>medical records or intimate personal information;</li>
          <li>a home address or unnecessary location information;</li>
          <li>private information about another person; or</li>
          <li>confidential school records or unreleased examination material.</li>
        </ul>
        <p>
          Relevant prompts and conversation context may be processed by OpenAI
          and stored by Study Buddy as described in the Privacy Policy.
        </p>
      </>
    ),
  },
  {
    id: "academic-integrity",
    title: "Study honestly",
    content: (
      <>
        <p>Students may use AI to:</p>
        <ul>
          <li>ask for explanations or examples;</li>
          <li>practise a method and check understanding;</li>
          <li>generate revision prompts or study plans; and</li>
          <li>receive feedback on work when the school allows it.</li>
        </ul>
        <p>
          Students must not use it to impersonate another person, submit
          AI-generated work dishonestly, obtain live examination answers, bypass
          school rules, or access leaked or restricted materials. A school&apos;s
          academic-integrity rules continue to apply.
        </p>
      </>
    ),
  },
  {
    id: "prohibited-use",
    title: "Prohibited and unsafe use",
    content: (
      <p>
        Do not use the AI to create or request sexual content involving minors,
        threats, abuse, harassment, hateful content, instructions for serious
        wrongdoing, malware, fraud, self-harm encouragement, non-consensual
        intimate content, or material that exploits or endangers another person.
        Do not attempt to extract private system instructions, credentials, or
        another user&apos;s data.
      </p>
    ),
  },
  {
    id: "safeguards",
    title: "Study Buddy safeguards",
    content: (
      <>
        <p>
          We may use automated limits, safety instructions, security logs, and
          proportionate human review to prevent misuse and investigate a report.
          Access may be restricted or suspended when use creates a safety or
          security risk or repeatedly violates this policy.
        </p>
        <p>
          Safety controls reduce risk but cannot guarantee that every unsafe or
          incorrect response will be prevented. We will continue testing and
          improving them, with particular attention to children and vulnerable
          users.
        </p>
      </>
    ),
  },
  {
    id: "reporting",
    title: "Report a response or concern",
    content: (
      <>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the
          subject “AI safety report”. Include the date, feature used, a short
          description, and a screenshot or conversation reference if safe to do
          so. Do not forward unnecessary personal or harmful material.
        </p>
        <p>
          A student should also tell a parent, guardian, teacher, or trusted adult
          if a response is frightening, sexual, threatening, encourages self-harm,
          or asks for secrecy or personal information. If someone may be in
          immediate danger, contact local emergency services immediately.
        </p>
      </>
    ),
  },
];

export default function AiSafetyPage() {
  return (
    <PolicyDocumentPage
      title="AI Safety and Responsible Use"
      eyebrow="Safe study with AI"
      introduction="Study Buddy AI should help students learn—not replace judgement, enable cheating, or put personal information and safety at risk."
      icon="chat"
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
