import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import Shell from "@/app/ClientLayoutWrapper";
import TextField from "@/components/TextField";
import SelectField from "@/components/SelectField";
import MultiSelectField from "@/components/MultiSelectField";
import MultiSelectOptionCard from "@/components/MultiSelectOptionCard";
import SingleChoiceOption from "@/components/SingleChoiceOption";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Landing from "@/app/ClientLanding";
import About from "@/app/about-us/page";
import Contact from "@/app/contact-us/page";
import Privacy from "@/app/privacy-policy/page";
import Terms from "@/app/terms-of-service/page";
import Cookies from "@/app/cookie-policy/page";
import Accessibility from "@/app/accessibility/page";
import Refunds from "@/app/refund-policy/page";
import Content from "@/app/content-policy/page";
import AiSafety from "@/app/ai-safety/page";
import StudentPrivacy from "@/app/parent-student-privacy/page";
import Login from "@/app/login/LoginClient";
import SignUp from "@/app/sign-up/SignUpClient";
import ForgotPassword from "@/app/forgot-password/ForgotPasswordClient";
import CheckEmail from "@/app/check-email/CheckEmailClient";
import ResetPassword from "@/app/reset-password/update/ResetPasswordUpdateClient";
import AccountUnavailable from "@/app/account-unavailable/page";
import Guardian from "@/app/guardian-authorization/GuardianDecisionClient";
import Deletion from "@/app/account-deletion/confirm/AccountDeletionConfirmationClient";
import ResetAlert from "@/app/account-security/password-reset-alert/PasswordResetAlertClient";
import ResetRecovery from "@/app/account-security/password-reset-recovery/PasswordResetRecoveryClient";
import Preferences from "@/app/settings/study-preferences/StudyPreferencesClient";
import Chat from "@/app/chat/ChatClient";
import Progress from "@/app/progress/ProgressClient";
import { progressReport } from "./data";

function Controls() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [radio, setRadio] = useState("maths");
  const [clicks, setClicks] = useState(0);
  return <div className="mx-auto my-8 max-w-xl space-y-4">
    <h1 className="text-2xl font-bold">Shared accessibility controls</h1>
    <TextField label="Email" type="email" required error="Enter your email" />
    <TextField label="Password" type="password" />
    <SelectField label="Primary subject" options={[{ value: "maths", label: "Mathematics" }, { value: "english", label: "English" }]} />
    <MultiSelectField label="Subjects" options={[{ value: "maths", label: "Mathematics" }, { value: "english", label: "English" }]} value={subjects} onChange={setSubjects} />
    <MultiSelectOptionCard label="Remember this choice" value="remember" checked={checked} onChange={(_, value) => setChecked(value)} />
    <fieldset>
      <legend>Study subject</legend>
      <SingleChoiceOption label="Mathematics" name="subject" value="maths" checked={radio === "maths"} onChange={setRadio} />
      <SingleChoiceOption label="English" name="subject" value="english" checked={radio === "english"} onChange={setRadio} />
    </fieldset>
    <Card onClick={() => setClicks((value) => value + 1)}>Open topic</Card>
    <p role="status">Card activations: {clicks}</p>
    <Paragraph fadeIn>Reduced-motion text stays visible</Paragraph>
    <Button href="/about-us">About this service</Button>
    <Button href="/about-us" loading>Loading destination</Button>
  </div>;
}

const route = window.location.pathname;
const pages: Record<string, React.ReactNode> = {
  "/controls": <Controls />,
  "/": <Landing />, "/about-us": <About />, "/contact-us": <Contact />,
  "/privacy-policy": <Privacy />, "/terms-of-service": <Terms />, "/cookie-policy": <Cookies />,
  "/accessibility": <Accessibility />, "/refund-policy": <Refunds />, "/content-policy": <Content />,
  "/ai-safety": <AiSafety />, "/parent-student-privacy": <StudentPrivacy />,
  "/login": <Login />, "/sign-up": <SignUp />, "/forgot-password": <ForgotPassword />,
  "/check-email": <CheckEmail />, "/reset-password/update": <ResetPassword />,
  "/account-unavailable": <AccountUnavailable />, "/guardian-authorization": <Guardian />,
  "/account-deletion/confirm": <Deletion />, "/account-security/password-reset-alert": <ResetAlert />,
  "/account-security/password-reset-recovery": <ResetRecovery />,
  "/settings/study-preferences": <Preferences backHref="/profile" backLabel="Back to profile" />,
  "/chat": <Chat />,
  "/progress": <Progress progress={progressReport(new URLSearchParams(window.location.search).get("range"))} />,
};
const authenticated = ["/chat", "/progress", "/settings/study-preferences"].includes(route);
createRoot(document.getElementById("fixture")!).render(
  <div className="p-6 max-[320px]:px-[7.5px]">
    <Shell isAuthenticated={authenticated}>{pages[route] ?? <h1>Unknown fixture page</h1>}</Shell>
  </div>
);
