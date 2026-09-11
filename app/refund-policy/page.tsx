import PolicyDocumentPage, {
  type PolicyDocumentSection,
} from "@/components/PolicyDocumentPage";
import {
  BILLING_EMAIL,
  COMPANY_REGISTRATION_NUMBER,
  LEGAL_ENTITY_NAME,
} from "@/lib/legal-entity";
import { createPageMetadata } from "@/lib/site-metadata";

const LAST_UPDATED = "11 September 2026";

export const metadata = createPageMetadata({
  title: "Refund and Cancellation Policy",
  description:
    "Learn how to cancel a Study Buddy subscription, when a refund may be available, how to request one and how payment issues are reviewed.",
  path: "/refund-policy",
});

const sections: PolicyDocumentSection[] = [
  {
    id: "scope",
    title: "Scope",
    content: (
      <p>
        This policy applies when {LEGAL_ENTITY_NAME} (RC{" "}
        {COMPANY_REGISTRATION_NUMBER}), operating as Study Buddy, offers a paid
        plan, subscription, or other paid digital service directly to a
        customer. It forms part of our Terms of Service. If checkout presents
        additional plan-specific terms, those terms also apply, but they do not
        remove rights that cannot lawfully be excluded.
      </p>
    ),
  },
  {
    id: "before-payment",
    title: "Information shown before payment",
    content: (
      <>
        <p>Before taking payment, we will show the material purchase details:</p>
        <ul>
          <li>the total price and currency, including applicable taxes;</li>
          <li>the plan features, limits, and billing period;</li>
          <li>whether the payment is one-off or recurring;</li>
          <li>the renewal date and frequency, if it renews;</li>
          <li>how to cancel and when cancellation takes effect; and</li>
          <li>any plan-specific refund condition.</li>
        </ul>
        <p>
          When paid subscriptions are enabled, they will renew automatically
          for the billing period disclosed at checkout until cancelled. We will
          not activate recurring billing unless the renewal price, frequency,
          expected timing, and cancellation method are clearly disclosed and
          authorised before purchase.
        </p>
      </>
    ),
  },
  {
    id: "cancellation",
    title: "Cancelling a subscription",
    content: (
      <>
        <p>
          When paid subscriptions are enabled, you may stop the next automatic
          renewal under Settings → Subscription by selecting “Cancel
          subscription” and confirming the request. We will send a cancellation
          confirmation to your account email. If you cannot use the in-app
          control, email{" "}
          <a href={`mailto:${BILLING_EMAIL}`}>{BILLING_EMAIL}</a> from the address
          connected to the account and include the payment reference.
        </p>
        <p>
          Cancellation stops the next renewal and does not remove paid access
          for the current billing period. Access continues until the end of the
          period already paid for. We will not charge a cancellation fee unless
          it was disclosed in advance and is reasonable and lawful.
        </p>
      </>
    ),
  },
  {
    id: "refunds",
    title: "When a refund may be available",
    content: (
      <>
        <p>We will investigate and provide an appropriate remedy when:</p>
        <ul>
          <li>you were charged more than once for the same purchase;</li>
          <li>payment was taken but the paid service was not provided;</li>
          <li>we discontinue a prepaid service before the paid period ends;</li>
          <li>a payment was unauthorised and verified as such;</li>
          <li>a technical failure makes the paid service materially unusable; or</li>
          <li>Nigerian consumer law otherwise requires cancellation or refund.</li>
        </ul>
        <p>
          A change of mind does not automatically require a refund after a
          digital service has been made available, unless the checkout terms or
          applicable law provide one. We will assess requests fairly and will
          not apply a blanket no-refund rule where the law provides a remedy.
        </p>
      </>
    ),
  },
  {
    id: "request",
    title: "How to request a refund",
    content: (
      <>
        <p>
          Email <a href={`mailto:${BILLING_EMAIL}`}>{BILLING_EMAIL}</a> with the
          subject “Refund request” and provide:
        </p>
        <ul>
          <li>the account email or phone number;</li>
          <li>the Paystack or Study Buddy payment reference;</li>
          <li>the payment date and amount;</li>
          <li>the reason for the request; and</li>
          <li>supporting evidence, such as a duplicate debit, where relevant.</li>
        </ul>
        <p>
          Do not email a full card number, PIN, password, one-time code, or bank
          login details. We may ask for limited additional information to verify
          the account or transaction. Essential payment, invoice, and
          transaction records are kept for seven years from the transaction
          date. They are kept longer only for a documented tax audit,
          chargeback, dispute, investigation, or legal hold, then deleted or
          anonymised when the applicable period ends.
        </p>
      </>
    ),
  },
  {
    id: "processing",
    title: "Review and payment processing",
    content: (
      <>
        <p>
          We will acknowledge a request, investigate it, and explain the outcome
          within a reasonable period. If approved, the refund will normally be
          returned through the original payment method. The time it takes to
          appear after initiation depends on Paystack, the bank, and the payment
          method.
        </p>
        <p>
          Provider fees or reasonable deductions will be applied only when
          lawfully permitted and clearly explained. A failed or reversed payment
          that Study Buddy never received is not a refund, but we will help you
          identify the appropriate provider or bank process.
        </p>
      </>
    ),
  },
  {
    id: "consumer-rights",
    title: "Consumer rights and complaints",
    content: (
      <p>
        Nothing in this policy limits a right or remedy under the Federal
        Competition and Consumer Protection Act or other applicable law. If we
        cannot resolve your complaint, you may use the{" "}
        <a
          href="https://fccpc.gov.ng/consumers/complaint-handling/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Federal Competition and Consumer Protection Commission complaint
          process
        </a>
        .
      </p>
    ),
  },
];

export default function RefundPolicyPage() {
  return (
    <PolicyDocumentPage
      title="Refund and Cancellation Policy"
      eyebrow="Payments and subscriptions"
      introduction="This policy explains how to stop a future Study Buddy subscription renewal and when a payment may qualify for a refund or another remedy."
      icon="card"
      lastUpdated={LAST_UPDATED}
      sections={sections}
      contactEmail={BILLING_EMAIL}
    />
  );
}
