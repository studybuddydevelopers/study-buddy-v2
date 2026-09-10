import Link from "next/link";
import PolicyDocumentPage, {
  type PolicyDocumentSection,
} from "@/components/PolicyDocumentPage";
import { SUPPORT_EMAIL } from "@/lib/legal-entity";
import { createPageMetadata } from "@/lib/site-metadata";

const LAST_UPDATED = "10 September 2026";

export const metadata = createPageMetadata({
  title: "AI Safety and Responsible Use",
  description:
    "Understand what Study Buddy's AI can and cannot do, how to use it safely and honestly, and how to report an unsafe or incorrect response.",
  path: "/ai-safety",
});

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
          and stored by Study Buddy as described in the Privacy Policy. Study
          Buddy has not opted in to share API prompts or responses with OpenAI
          for model training or improvement.
        </p>
        <p>
          Study Buddy plans to use selected conversation data to test or improve
          its own AI in the future, but this is not active in the current beta.
          It will require a separate, voluntary choice that is off by default,
          de-identification and restricted datasets. Adults must opt in; users
          aged 13–17 will also need parent or legal-guardian authorisation and
          must choose to participate themselves. Declining will not reduce
          access to the ordinary service.
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
          narrowly scoped human review to prevent misuse and investigate a
          report. Staff do not routinely read individual conversations. An
          authorised reviewer may examine only the minimum messages needed for
          a user-authorised support case, a reported harmful response or
          credible safety concern, a security/fraud/abuse investigation, a
          specific technical failure that less intrusive information cannot
          resolve, or a valid legal requirement. Access may be restricted or
          suspended when use creates a safety or security risk or repeatedly
          violates this policy. See the Privacy Policy for the complete access
          rule.
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
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the
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
