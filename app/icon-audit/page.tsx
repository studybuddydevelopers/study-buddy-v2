import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Scale,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  Wifi,
} from "lucide-react";
import { FaHandPaper } from "react-icons/fa";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { HiOutlinePresentationChartBar, HiOutlineUserGroup } from "react-icons/hi";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { PiGraduationCapLight, PiShieldCheck } from "react-icons/pi";
import StudyBuddyIcon, {
  type StudyBuddyIconName,
} from "@/components/StudyBuddyIcon";

export const metadata: Metadata = {
  title: "Icon Audit | Study Buddy",
  description:
    "A visual inventory of Study Buddy UI icons with illustration-led SVG proposals.",
};

type IconGroup =
  | "Navigation & wayfinding"
  | "Learning experience"
  | "Actions & forms"
  | "Trust, status & support";

interface IconLocation {
  file: string;
  context: string;
}

interface IconDecision {
  title: string;
  group: IconGroup;
  currentSource: string;
  current: ReactNode;
  actualSize: number;
  proposal: StudyBuddyIconName | StudyBuddyIconName[];
  proposalName: string;
  rationale: string;
  locations: IconLocation[];
  keepCurrent?: boolean;
}

interface PageGroup {
  id: string;
  title: string;
  route: string;
  description: string;
  files: string[];
}

const PAGE_GROUPS: PageGroup[] = [
  {
    id: "homepage",
    title: "Homepage",
    route: "/",
    description:
      "Benefit illustrations beneath the main student artwork. These proposals should explain the promise of each feature, not merely recolour the old symbol.",
    files: ["app/ClientLanding.tsx"],
  },
  {
    id: "site-navigation",
    title: "Site navigation",
    route: "Shared shell",
    description:
      "Desktop and mobile wayfinding. Familiar destinations stay recognisable at small sizes while adopting the Study Buddy drawing language.",
    files: ["components/BottomNav.tsx", "components/NavBar.tsx"],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    route: "/dashboard",
    description: "Short directional links that move a learner into their next study activity.",
    files: ["app/dashboard/DashboardClient.tsx"],
  },
  {
    id: "ai-chat",
    title: "AI chat",
    route: "/chat",
    description: "Conversation navigation and actions inside the saved-chat workspace.",
    files: ["app/chat/ChatClient.tsx"],
  },
  {
    id: "materials",
    title: "Study materials",
    route: "/materials",
    description: "Resource cards and collection states in the central materials hub.",
    files: ["app/materials/MaterialsClient.tsx", "app/materials/CollectionComingSoon.tsx"],
  },
  {
    id: "past-questions",
    title: "Past questions",
    route: "/materials/past-questions",
    description: "Subject cards, prompts and empty states for practising previous exam questions.",
    files: ["app/materials/past-questions/PastQuestionsClient.tsx"],
  },
  {
    id: "flashcards",
    title: "Flashcards",
    route: "/materials/flashcards",
    description: "Collection rows and prompts for quick memory practice.",
    files: ["app/materials/flashcards/FlashcardsClient.tsx"],
  },
  {
    id: "textbooks",
    title: "Textbooks",
    route: "/materials/textbooks",
    description: "Collection rows and prompts for longer-form learning resources.",
    files: ["app/materials/textbooks/TextbooksClient.tsx"],
  },
  {
    id: "topic-practice",
    title: "Topic practice",
    route: "/materials/practice/[topicId]",
    description: "The return path from a topic practice session to the materials area.",
    files: ["app/materials/practice/[topicId]/TopicPracticeClient.tsx"],
  },
  {
    id: "progress",
    title: "Progress",
    route: "/progress",
    description: "A compact explanation control beside the learner's progress summary.",
    files: ["app/progress/ProgressClient.tsx"],
  },
  {
    id: "about",
    title: "About Study Buddy",
    route: "/about-us",
    description: "Product areas, principles and calls to action that explain how Study Buddy helps learners.",
    files: ["app/about-us/page.tsx"],
  },
  {
    id: "contact",
    title: "Contact",
    route: "/contact-us",
    description: "Support routes, reassurance, response expectations and form feedback.",
    files: ["app/contact-us/page.tsx"],
  },
  {
    id: "privacy",
    title: "Privacy policy",
    route: "/privacy-policy",
    description: "Data categories, protection, learner rights and ways to get privacy help.",
    files: ["app/privacy-policy/page.tsx"],
  },
  {
    id: "terms",
    title: "Terms of service",
    route: "/terms-of-service",
    description: "Legal context, fair-use rules, payments and routes for asking questions.",
    files: ["app/terms-of-service/page.tsx"],
  },
  {
    id: "login",
    title: "Log in",
    route: "/login",
    description: "A friendly encouragement mark beside the returning-student welcome.",
    files: ["app/login/LoginClient.tsx"],
  },
  {
    id: "sign-up",
    title: "Sign up",
    route: "/sign-up",
    description: "A friendly encouragement mark beside account creation.",
    files: ["app/sign-up/SignUpClient.tsx"],
  },
  {
    id: "password-recovery",
    title: "Password recovery",
    route: "/forgot-password · /check-email · /reset-password",
    description: "Encouragement across the three steps of regaining account access.",
    files: [
      "app/forgot-password/ForgotPasswordClient.tsx",
      "app/check-email/CheckEmailClient.tsx",
      "app/reset-password/update/ResetPasswordUpdateClient.tsx",
    ],
  },
  {
    id: "shared-controls",
    title: "Shared controls",
    route: "Used across forms",
    description: "Reusable buttons, password fields, selects and multi-select states shared by several pages.",
    files: [
      "components/Button.tsx",
      "components/TextField.tsx",
      "components/SelectField.tsx",
      "components/MultiSelectField.tsx",
      "components/MultiSelectOptionCard.tsx",
    ],
  },
];

const lucideProps = { size: 52, strokeWidth: 1.7, "aria-hidden": true } as const;

const ICONS: IconDecision[] = [
  {
    title: "Dashboard / Home",
    group: "Navigation & wayfinding",
    currentSource: "Lucide · LayoutDashboard",
    current: <LayoutDashboard {...lucideProps} />,
    actualSize: 22,
    proposal: "dashboard",
    proposalName: "Study desk home",
    rationale: "A friendly home shape makes the destination immediate without the abstract panel grid.",
    locations: [
      { file: "components/BottomNav.tsx", context: "Mobile Home tab leading to the student dashboard." },
    ],
  },
  {
    title: "Study materials",
    group: "Navigation & wayfinding",
    currentSource: "Lucide · BookOpen",
    current: <BookOpen {...lucideProps} />,
    actualSize: 22,
    proposal: "materials",
    proposalName: "Open revision book",
    rationale: "Purple and white pages make the learning destination feel owned by Study Buddy.",
    locations: [
      { file: "components/BottomNav.tsx", context: "Mobile Materials tab." },
    ],
  },
  {
    title: "Mock exams",
    group: "Navigation & wayfinding",
    currentSource: "Lucide · ClipboardList",
    current: <ClipboardList {...lucideProps} />,
    actualSize: 22,
    proposal: "exams",
    proposalName: "Checked exam sheet",
    rationale: "The checked paper reads as an assessment rather than a generic task list.",
    locations: [
      { file: "components/BottomNav.tsx", context: "Mobile Exams tab." },
    ],
  },
  {
    title: "Progress",
    group: "Navigation & wayfinding",
    currentSource: "Lucide · BarChart2",
    current: <BarChart2 {...lucideProps} />,
    actualSize: 22,
    proposal: "progress",
    proposalName: "Growing results chart",
    rationale: "The rising hand-drawn line gives the static bars a clearer sense of improvement.",
    locations: [
      { file: "components/BottomNav.tsx", context: "Mobile Progress tab." },
    ],
  },
  {
    title: "AI chat",
    group: "Navigation & wayfinding",
    currentSource: "Lucide · MessageCircle",
    current: <MessageCircle {...lucideProps} />,
    actualSize: 22,
    proposal: "chat",
    proposalName: "Purple study conversation",
    rationale: "A solid speech shape and warm final dot feel more conversational and less like stock line art.",
    locations: [
      { file: "components/BottomNav.tsx", context: "Mobile Chat tab." },
      { file: "app/chat/ChatClient.tsx", context: "Saved conversation rows in the AI Chat sidebar." },
    ],
  },
  {
    title: "Profile",
    group: "Navigation & wayfinding",
    currentSource: "Custom SVG · profile-avatar.svg",
    current: (
      <Image src="/images/profile-avatar.svg" alt="" width={56} height={56} className="rounded-full" />
    ),
    actualSize: 24,
    proposal: "profile",
    proposalName: "Keep current profile artwork",
    rationale: "Approved to stay exactly as it is in both navigation placements.",
    keepCurrent: true,
    locations: [
      { file: "components/BottomNav.tsx", context: "Mobile Profile tab with active-state ring." },
      { file: "components/NavBar.tsx", context: "Desktop Profile navigation link." },
    ],
  },
  {
    title: "Notifications",
    group: "Navigation & wayfinding",
    currentSource: "Emoji · 🔔",
    current: <span className="text-5xl" aria-hidden="true">🔔</span>,
    actualSize: 24,
    proposal: "bell",
    proposalName: "Keep current notification bell",
    rationale: "Approved to stay exactly as it is in the authenticated desktop navbar.",
    keepCurrent: true,
    locations: [
      { file: "components/NavBar.tsx", context: "Authenticated navbar notification popover trigger." },
    ],
  },
  {
    title: "Forward / drill down",
    group: "Navigation & wayfinding",
    currentSource: "Lucide · ChevronRight",
    current: <ChevronRight {...lucideProps} />,
    actualSize: 18,
    proposal: "chevron",
    proposalName: "Double painted chevron",
    rationale: "Two offset strokes remain legible at 18px while carrying the purple illustration language.",
    locations: [
      { file: "app/materials/MaterialsClient.tsx", context: "Ongoing and Featured resource cards." },
      { file: "app/materials/past-questions/PastQuestionsClient.tsx", context: "Past-question subject cards." },
      { file: "app/materials/flashcards/FlashcardsClient.tsx", context: "Flashcard collection rows." },
      { file: "app/materials/textbooks/TextbooksClient.tsx", context: "Textbook collection rows." },
      { file: "app/materials/CollectionComingSoon.tsx", context: "Unavailable collection callout." },
    ],
  },
  {
    title: "Personalised study plans",
    group: "Learning experience",
    currentSource: "Phosphor · GraduationCapLight",
    current: <PiGraduationCapLight size={56} aria-hidden="true" />,
    actualSize: 40,
    proposal: "plan",
    proposalName: "Student selecting a study plan",
    rationale: "The new illustration makes personalisation explicit: the learner is choosing daily practice, mock exams, subject focus and revision from a structured plan. It communicates a tailored study route much more clearly than a graduation cap.",
    locations: [
      { file: "app/ClientLanding.tsx", context: "Homepage ‘Personalized Study Plans’ benefit card." },
    ],
  },
  {
    title: "Practice tests",
    group: "Learning experience",
    currentSource: "Heroicons · PresentationChartBar",
    current: <HiOutlinePresentationChartBar size={54} aria-hidden="true" />,
    actualSize: 40,
    proposal: "practice",
    proposalName: "Student taking an online practice test",
    rationale: "The learner, timer and on-screen questions show the real activity: completing a structured online test under time pressure. It replaces the unrelated presentation-chart metaphor with a recognisable practice experience.",
    locations: [
      { file: "app/ClientLanding.tsx", context: "Homepage ‘Comprehensive Practice Tests’ benefit card." },
    ],
  },
  {
    title: "Expert guidance",
    group: "Learning experience",
    currentSource: "Heroicons · UserGroup",
    current: <HiOutlineUserGroup size={54} aria-hidden="true" />,
    actualSize: 40,
    proposal: "mentors",
    proposalName: "Guidance pathway to success",
    rationale: "The learner and staged lightbulb show guidance as a process: assess, analyse, counsel and guide towards success. That explains the benefit more directly than a generic group-of-people icon.",
    locations: [
      { file: "app/ClientLanding.tsx", context: "Homepage ‘Expert Guidance’ benefit card." },
    ],
  },
  {
    title: "Past questions",
    group: "Learning experience",
    currentSource: "Lucide · ClipboardList / BookOpen",
    current: <div className="flex items-center gap-2"><ClipboardList size={42} /><BookOpen size={42} /></div>,
    actualSize: 40,
    proposal: "pastQuestions",
    proposalName: "Question paper",
    rationale: "A visible question mark removes ambiguity between past questions, generic lists and books.",
    locations: [
      { file: "app/materials/MaterialsClient.tsx", context: "Past Questions ongoing and featured cards." },
      { file: "app/materials/past-questions/PastQuestionsClient.tsx", context: "Past-question landing and empty states." },
    ],
  },
  {
    title: "Flashcards",
    group: "Learning experience",
    currentSource: "Lucide · MessageCircle / ClipboardList",
    current: <div className="flex items-center gap-2"><MessageCircle size={42} /><ClipboardList size={42} /></div>,
    actualSize: 40,
    proposal: "flashcards",
    proposalName: "Stacked revision cards",
    rationale: "This fixes the clearest semantic mismatch: flashcards should look like cards, not chat.",
    locations: [
      { file: "app/materials/MaterialsClient.tsx", context: "Flashcards ongoing and featured cards." },
      { file: "app/materials/flashcards/FlashcardsClient.tsx", context: "Flashcard collection groups and prompts." },
    ],
  },
  {
    title: "Textbooks",
    group: "Learning experience",
    currentSource: "Lucide · BookOpen / ClipboardList",
    current: <div className="flex items-center gap-2"><BookOpen size={42} /><ClipboardList size={42} /></div>,
    actualSize: 40,
    proposal: "textbook",
    proposalName: "Open illustrated textbook",
    rationale: "The revised open book keeps the textbook instantly recognisable while using Study Buddy’s purple page, warm cover edge and yellow bookmark.",
    locations: [
      { file: "app/materials/MaterialsClient.tsx", context: "Textbooks ongoing and featured cards." },
      { file: "app/materials/textbooks/TextbooksClient.tsx", context: "Textbook collection groups and prompts." },
    ],
  },
  {
    title: "Learning analytics",
    group: "Learning experience",
    currentSource: "Lucide · BarChart3",
    current: <BarChart3 {...lucideProps} />,
    actualSize: 20,
    proposal: "analytics",
    proposalName: "Study analytics board",
    rationale: "The marked data points make the About-page feature feel like measured learning, not finance.",
    locations: [
      { file: "app/about-us/page.tsx", context: "‘Progress that is easy to read’ product-area card." },
    ],
  },
  {
    title: "Study support",
    group: "Learning experience",
    currentSource: "Lucide · MessageCircle",
    current: <MessageCircle {...lucideProps} />,
    actualSize: 20,
    proposal: "support",
    proposalName: "Listening support headset",
    rationale: "A headset communicates active help more clearly than reusing the AI-chat bubble everywhere.",
    locations: [
      { file: "app/about-us/page.tsx", context: "Study-support product area." },
      { file: "app/contact-us/page.tsx", context: "Contact page brand badge." },
      { file: "app/privacy-policy/page.tsx", context: "Privacy contact action." },
      { file: "app/terms-of-service/page.tsx", context: "Terms contact action." },
    ],
  },
  {
    title: "New chat",
    group: "Actions & forms",
    currentSource: "Lucide · Plus",
    current: <Plus {...lucideProps} />,
    actualSize: 18,
    proposal: "plus",
    proposalName: "Painted add button",
    rationale: "A solid purple disc gives the primary creation action more presence at small sizes.",
    locations: [
      { file: "app/chat/ChatClient.tsx", context: "New Chat button." },
    ],
  },
  {
    title: "Edit chat title",
    group: "Actions & forms",
    currentSource: "Lucide · Pencil",
    current: <Pencil {...lucideProps} />,
    actualSize: 16,
    proposal: "pencil",
    proposalName: "Warm study pencil",
    rationale: "The pencil keeps the familiar edit metaphor while gaining the hero artwork’s warm accent.",
    locations: [
      { file: "app/chat/ChatClient.tsx", context: "Save edited chat-title button." },
    ],
  },
  {
    title: "Delete chat",
    group: "Actions & forms",
    currentSource: "Lucide · Trash2",
    current: <Trash2 {...lucideProps} />,
    actualSize: 16,
    proposal: "trash",
    proposalName: "Purple bin",
    rationale: "A filled container survives at 16px better than four thin independent strokes.",
    locations: [
      { file: "app/chat/ChatClient.tsx", context: "Delete selected chat action." },
    ],
  },
  {
    title: "Password visibility",
    group: "Actions & forms",
    currentSource: "Lucide Icons · Eye / EyeClosed",
    current: <div className="flex items-center gap-3"><LuEye size={42} /><LuEyeClosed size={42} /></div>,
    actualSize: 20,
    proposal: ["eye", "eyeOff"],
    proposalName: "Illustrated visible / hidden pair",
    rationale: "Both states share one unmistakable eye silhouette, with purple iris and warm diagonal cancellation.",
    locations: [
      { file: "components/TextField.tsx", context: "Shared password reveal control used by login, sign-up and password reset forms." },
    ],
  },
  {
    title: "Select expand / collapse",
    group: "Actions & forms",
    currentSource: "Custom SVG · unfold.svg",
    current: <Image src="/icons/unfold.svg" alt="" width={52} height={52} />,
    actualSize: 18,
    proposal: "unfold",
    proposalName: "Two-tone unfold",
    rationale: "Bolder chevrons and a warm centre point stay visible against pale form fields.",
    locations: [
      { file: "components/SelectField.tsx", context: "Single-select dropdown indicator." },
      { file: "components/MultiSelectField.tsx", context: "Multi-select open/close indicator." },
    ],
  },
  {
    title: "Progress explanation",
    group: "Actions & forms",
    currentSource: "Lucide · CircleHelp",
    current: <CircleHelp {...lucideProps} />,
    actualSize: 20,
    proposal: "help",
    proposalName: "Centred high-contrast help mark",
    rationale: "The revised question mark is optically centred, and its yellow answer point remains visible against the solid purple circle at the real 20px size.",
    locations: [
      { file: "app/progress/ProgressClient.tsx", context: "Explains how student progress is calculated." },
    ],
  },
  {
    title: "Selected option",
    group: "Actions & forms",
    currentSource: "Inline SVG · check path",
    current: (
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#6C3483] text-white">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
      </span>
    ),
    actualSize: 20,
    proposal: "checkbox",
    proposalName: "Rounded selected tile",
    rationale: "Keeps the existing check but brings its container and corner language into the illustration system.",
    locations: [
      { file: "components/MultiSelectOptionCard.tsx", context: "Custom checked state on selectable option cards." },
    ],
  },
  {
    title: "Button loading",
    group: "Actions & forms",
    currentSource: "Inline SVG · circular spinner",
    current: (
      <svg className="h-12 w-12 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity=".25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
    ),
    actualSize: 16,
    proposal: "spinner",
    proposalName: "Four-colour study spinner",
    rationale: "Segmented painted arcs feel native to the illustration while preserving the familiar rotating motion.",
    locations: [
      { file: "components/Button.tsx", context: "Shared pending state across form and navigation buttons." },
    ],
  },
  {
    title: "Auth encouragement",
    group: "Actions & forms",
    currentSource: "Font Awesome · three hand glyphs",
    current: <div className="flex items-center gap-2"><FaHandPeace size={34} /><FaHandPaper size={34} /><FaHandPointDown size={34} /></div>,
    actualSize: 26,
    proposal: "encouragement",
    proposalName: "Friendly hand and study spark",
    rationale: "One expressive illustrated hand feels intentional and removes the slot-machine rotation between unrelated gestures.",
    locations: [
      { file: "app/login/LoginClient.tsx", context: "Welcome-back heading companion." },
      { file: "app/sign-up/SignUpClient.tsx", context: "Create-account heading companion." },
      { file: "app/forgot-password/ForgotPasswordClient.tsx", context: "Password-recovery heading companion." },
      { file: "app/check-email/CheckEmailClient.tsx", context: "Check-email heading companion." },
      { file: "app/reset-password/update/ResetPasswordUpdateClient.tsx", context: "New-password heading companion." },
    ],
  },
  {
    title: "Directional actions",
    group: "Actions & forms",
    currentSource: "Lucide ArrowRight + text arrows",
    current: <div className="flex items-center gap-3"><ArrowRight size={48} /><span className="text-4xl">→ ←</span></div>,
    actualSize: 20,
    proposal: "arrow",
    proposalName: "Painted direction arrow",
    rationale: "One shared arrow treatment can replace both component icons and inconsistent text glyphs.",
    locations: [
      { file: "app/about-us/page.tsx", context: "‘Start learning’ button in the opening About section." },
      { file: "app/about-us/page.tsx", context: "‘Go to dashboard’ button at the end of the About page." },
      { file: "app/privacy-policy/page.tsx", context: "‘Create an account’ button at the end of the Privacy Policy." },
      { file: "app/terms-of-service/page.tsx", context: "‘Create an account’ button at the end of Terms of Service — page 14, held for review." },
      { file: "app/contact-us/page.tsx", context: "‘Browse materials’ link in the study-support panel." },
      { file: "app/dashboard/DashboardClient.tsx", context: "‘Practice now’ link beside the learner’s weakest topic." },
      { file: "app/dashboard/DashboardClient.tsx", context: "‘Start your first session’ link in the empty study-plan state." },
      { file: "app/materials/practice/[topicId]/TopicPracticeClient.tsx", context: "‘Study materials’ back button above a practice session." },
    ],
  },
  {
    title: "Security and trust",
    group: "Trust, status & support",
    currentSource: "Phosphor / Lucide · ShieldCheck",
    current: <div className="flex items-center gap-3"><PiShieldCheck size={50} /><ShieldCheck size={50} strokeWidth={1.7} /></div>,
    actualSize: 20,
    proposal: "shield",
    proposalName: "Protected learner shield",
    rationale: "A solid purple shield with a white check becomes a recognisable trust signature across the site.",
    locations: [
      { file: "app/about-us/page.tsx", context: "Student-data protection principle." },
      { file: "app/privacy-policy/page.tsx", context: "Privacy summary and navigation actions." },
      { file: "app/terms-of-service/page.tsx", context: "Fair-use summary." },
      { file: "app/contact-us/page.tsx", context: "Privacy link and account-help note." },
    ],
  },
  {
    title: "Built for learners",
    group: "Trust, status & support",
    currentSource: "Lucide · CheckCircle2",
    current: <CheckCircle2 {...lucideProps} />,
    actualSize: 20,
    proposal: "learnerSuccess",
    proposalName: "Learner-first badge",
    rationale: "The revised mark centres a learner and a study spark, which suits a learner-first principle better than a generic completion tick.",
    locations: [
      { file: "app/about-us/page.tsx", context: "About-page principle cards." },
    ],
  },
  {
    title: "Message sent confirmation",
    group: "Trust, status & support",
    currentSource: "Lucide · CheckCircle2",
    current: <CheckCircle2 {...lucideProps} />,
    actualSize: 20,
    proposal: "messageSent",
    proposalName: "Delivered message envelope",
    rationale: "The revised envelope and delivery check describe the completed action directly instead of reusing a generic success circle.",
    locations: [
      { file: "app/contact-us/page.tsx", context: "Successful contact-form submission." },
    ],
  },
  {
    title: "Low bandwidth",
    group: "Trust, status & support",
    currentSource: "Lucide · Wifi",
    current: <Wifi {...lucideProps} />,
    actualSize: 20,
    proposal: "wifi",
    proposalName: "Low-data Wi-Fi download",
    rationale: "The revised Wi-Fi mark adds a visible downward arrow so the idea reads as lighter data delivery, rather than connectivity alone.",
    locations: [
      { file: "app/about-us/page.tsx", context: "Low-bandwidth design principle." },
    ],
  },
  {
    title: "Data collected",
    group: "Trust, status & support",
    currentSource: "Lucide · Database",
    current: <Database {...lucideProps} />,
    actualSize: 20,
    proposal: "database",
    proposalName: "Learner data record",
    rationale: "The revised record shows a learner profile, information lines and a verified data point. It describes collected student information more honestly than a generic server cylinder.",
    locations: [
      { file: "app/privacy-policy/page.tsx", context: "‘Data we collect’ summary card." },
    ],
  },
  {
    title: "Data security",
    group: "Trust, status & support",
    currentSource: "Lucide · LockKeyhole",
    current: <LockKeyhole {...lucideProps} />,
    actualSize: 20,
    proposal: "lock",
    proposalName: "Purple account lock",
    rationale: "The solid body holds up at small size and separates security from the broader trust shield.",
    locations: [
      { file: "app/privacy-policy/page.tsx", context: "‘How data is protected’ summary card." },
    ],
  },
  {
    title: "User rights",
    group: "Trust, status & support",
    currentSource: "Lucide · UserCheck",
    current: <UserCheck {...lucideProps} />,
    actualSize: 20,
    proposal: "userCheck",
    proposalName: "Learner with approval seal",
    rationale: "The student portrait keeps privacy rights centred on the person rather than the checkbox.",
    locations: [
      { file: "app/privacy-policy/page.tsx", context: "‘Your choices and rights’ summary card." },
    ],
  },
  {
    title: "Email contact",
    group: "Trust, status & support",
    currentSource: "Lucide · Mail",
    current: <Mail {...lucideProps} />,
    actualSize: 20,
    proposal: "mail",
    proposalName: "Open contact envelope",
    rationale: "The revised icon makes the letter and envelope construction obvious at small size and removes the ambiguous stamp treatment.",
    locations: [
      { file: "app/contact-us/page.tsx", context: "Email contact card." },
      { file: "app/privacy-policy/page.tsx", context: "Privacy contact details." },
      { file: "app/terms-of-service/page.tsx", context: "Terms contact details." },
    ],
  },
  {
    title: "Important restriction",
    group: "Trust, status & support",
    currentSource: "Lucide · AlertTriangle",
    current: <AlertTriangle {...lucideProps} />,
    actualSize: 20,
    proposal: "warning",
    proposalName: "Warm caution marker",
    rationale: "The warm fill attracts attention without borrowing the app’s error red for ordinary caution.",
    locations: [
      { file: "app/terms-of-service/page.tsx", context: "Prohibited-use summary card." },
    ],
  },
  {
    title: "Subscriptions and payments",
    group: "Trust, status & support",
    currentSource: "Lucide · CreditCard",
    current: <CreditCard {...lucideProps} />,
    actualSize: 20,
    proposal: "card",
    proposalName: "Purple payment card",
    rationale: "The warm chip and white stripe clearly communicate payment while staying on palette.",
    locations: [
      { file: "app/terms-of-service/page.tsx", context: "Subscriptions and payments summary card." },
    ],
  },
  {
    title: "Fair terms",
    group: "Trust, status & support",
    currentSource: "Lucide · Scale",
    current: <Scale {...lucideProps} />,
    actualSize: 20,
    proposal: "scale",
    proposalName: "Balanced terms scale",
    rationale: "Filled bowls and a warm pivot soften the legal symbol without reducing clarity.",
    locations: [
      { file: "app/terms-of-service/page.tsx", context: "Terms-page hero badge and legal context." },
    ],
  },
  {
    title: "Reply time",
    group: "Trust, status & support",
    currentSource: "Lucide · Clock",
    current: <Clock {...lucideProps} />,
    actualSize: 20,
    proposal: "clock",
    proposalName: "Response clock",
    rationale: "A purple hand and warm top mark make a plain time symbol feel like part of the same family.",
    locations: [
      { file: "app/contact-us/page.tsx", context: "Expected reply-window support note." },
    ],
  },
  {
    title: "Content feedback",
    group: "Trust, status & support",
    currentSource: "Lucide · FileText",
    current: <FileText {...lucideProps} />,
    actualSize: 20,
    proposal: "document",
    proposalName: "Reviewed content sheet",
    rationale: "The folded paper and warm check show review, not merely a generic text file.",
    locations: [
      { file: "app/contact-us/page.tsx", context: "Content-feedback support note." },
    ],
  },
  {
    title: "Send message",
    group: "Trust, status & support",
    currentSource: "Lucide · Send",
    current: <Send {...lucideProps} />,
    actualSize: 20,
    proposal: "send",
    proposalName: "Outgoing message arrow",
    rationale: "The revised design shows a message leaving an envelope, making the submit action clearer than the previous heavy paper-plane silhouette.",
    locations: [
      { file: "app/contact-us/page.tsx", context: "Contact-form submit button." },
    ],
  },
];

const placementCount = ICONS.reduce(
  (total, icon) => total + icon.locations.length,
  0
);

const PAGE_SECTIONS = PAGE_GROUPS.map((page) => ({
  ...page,
  placements: ICONS.flatMap((icon) =>
    icon.locations
      .filter((location) => page.files.includes(location.file))
      .map((location) => ({ icon, location }))
  ),
}));

export default function IconAuditPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F8] text-[#17121C]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-7 sm:py-12">
        <header className="relative overflow-hidden rounded-[2rem] border-2 border-[#070405] bg-[#FCFCFC] px-6 py-8 shadow-[8px_8px_0_#3B2A56] sm:px-10 sm:py-11">
          <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#E9E6ED]" />
          <div className="absolute right-16 top-9 hidden rotate-6 sm:block">
            <StudyBuddyIcon name="flashcards" size={112} />
          </div>
          <div className="relative max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6C3483]">
              Page-by-page audit · approved replacements in progress
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
              See every icon in the job it actually performs
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-[#554C5B] sm:text-base">
              The audit is grouped by website page. Each current icon is placed in a
              small mock of its real UI context, then compared with an SVG concept
              designed for that specific meaning and the homepage illustration style.
            </p>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
            <SummaryStat value={String(ICONS.length)} label="Icon decisions" />
            <SummaryStat value={String(placementCount)} label="Documented placements" />
            <SummaryStat value={String(PAGE_SECTIONS.length)} label="Page / UI groups" />
          </div>
        </header>

        <section className="mt-8 grid gap-6 rounded-3xl border border-[#D7CFDC] bg-white p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6C3483]">
              The design rule
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#62596A]">
              Feature and content icons get a new, context-specific metaphor. Small
              utility controls keep conventions people already know—such as an eye
              for password visibility—but are redrawn with the hero artwork&apos;s rounded
              black outlines, purple forms and warm-brown accents.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Proposed icon palette">
            <Swatch color="#070405" label="Ink" />
            <Swatch color="#6C3483" label="Brand" />
            <Swatch color="#3B2A56" label="Depth" />
            <Swatch color="#E9E6ED" label="Soft" />
            <Swatch color="#895033" label="Warm" />
          </div>
        </section>

        <nav className="mt-8 rounded-3xl border border-[#D7CFDC] bg-white p-5 sm:p-6" aria-label="Icon audit pages">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6C3483]">
            Jump to a page
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PAGE_SECTIONS.map((page) => (
              <a
                key={page.id}
                href={`#${page.id}`}
                className="rounded-full border border-[#D7CFDC] bg-[#FBF8FC] px-3 py-2 text-xs font-bold text-[#4F4358] transition hover:border-[#6C3483] hover:text-[#6C3483]"
              >
                {page.title} · {page.placements.length}
              </a>
            ))}
          </div>
        </nav>

        {PAGE_SECTIONS.map((page, pageIndex) => (
          <section key={page.id} id={page.id} className="mt-14 scroll-mt-8">
            <div className="border-b-2 border-[#17121C] pb-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6C3483]">
                    Page {String(pageIndex + 1).padStart(2, "0")} · {page.route}
                  </p>
                  <h2 className="mt-1 text-2xl font-black sm:text-3xl">{page.title}</h2>
                </div>
                <p className="shrink-0 text-sm font-bold text-[#6B6270]">
                  {page.placements.length} {page.placements.length === 1 ? "placement" : "placements"}
                </p>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#62596A]">{page.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {page.files.map((file) => (
                  <code key={file} className="rounded-full bg-[#EEE9F1] px-3 py-1 text-[10px] font-bold text-[#6C3483]">
                    {file}
                  </code>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {page.placements.map(({ icon, location }, placementIndex) => (
                <IconComparisonCard
                  key={`${page.id}-${location.file}-${icon.title}-${location.context}`}
                  icon={icon}
                  location={location}
                  featured={page.id === "homepage" && placementIndex === 1}
                />
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12 rounded-3xl border-2 border-dashed border-[#9E92B0] bg-white p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6C3483]">
            Intentionally outside this replacement set
          </p>
          <h2 className="mt-2 text-2xl font-black">Brand marks and full illustrations</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-[#62596A]">
            The SB logo animations, AI tutor avatar, full profile avatar and homepage
            student artwork are identity or illustration assets rather than interface
            icons. They are documented here as exclusions so the icon rollout does
            not accidentally overwrite the brand work already approved.
          </p>
        </section>
      </div>
    </main>
  );
}

function IconComparisonCard({
  icon,
  location,
  featured = false,
}: {
  icon: IconDecision;
  location: IconLocation;
  featured?: boolean;
}) {
  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
        featured ? "border-[#6C3483] ring-2 ring-[#E9D9F1]" : "border-[#DCD6E0]"
      }`}
    >
      <div className="border-b border-[#E4DFE7] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6C3483]">
              {proposalApproach(icon)}
            </p>
            <h3 className="mt-1 text-lg font-black">{icon.title}</h3>
          </div>
          <span className="rounded-full bg-[#EEE9F1] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#4D3A61]">
            {icon.actualSize}px current slot
          </span>
        </div>
        <p className="mt-3 text-sm font-medium leading-6 text-[#62596A]">{location.context}</p>
        <code className="mt-2 block break-all text-[11px] font-bold text-[#6C3483]">
          {location.file}
        </code>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#DCD6E0]">
        <PreviewPanel label="Current asset">
          <div className="flex min-h-36 flex-col items-center justify-center gap-3 px-3 text-center text-[#111827]">
            {icon.current}
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#777]">{icon.currentSource}</p>
          </div>
        </PreviewPanel>
        <PreviewPanel label={icon.keepCurrent ? "Decision" : "New idea"} proposed>
          <div className="flex min-h-36 flex-col items-center justify-center gap-2 px-3 py-3">
            <ProposalArtwork icon={icon} size={76} expanded />
            <p className="text-center text-[9px] font-bold uppercase tracking-[0.1em] text-[#6C3483]">{icon.proposalName}</p>
            {["Personalised study plans", "Practice tests", "Expert guidance"].includes(icon.title) && (
              <p className="text-center text-[9px] font-bold text-[#895033]">Full illustration · card layout must expand</p>
            )}
          </div>
        </PreviewPanel>
      </div>

      <div className="p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#776D7D]">
          In-context test
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <UsagePreview icon={icon} location={location} proposed={false} />
          <UsagePreview icon={icon} location={location} proposed />
        </div>

        <div className="mt-5 rounded-2xl bg-[#F7F3F9] px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6C3483]">
            Why this proposal fits the job
          </p>
          <p className="mt-2 text-sm leading-6 text-[#62596A]">{icon.rationale}</p>
        </div>
      </div>
    </article>
  );
}

function proposalApproach(icon: IconDecision) {
  if (icon.keepCurrent) return "Approved · keep current";

  const familiarControls = new Set([
    "Dashboard / Home",
    "Study materials",
    "Mock exams",
    "Progress",
    "AI chat",
    "Profile",
    "Notifications",
    "Forward / drill down",
    "New chat",
    "Edit chat title",
    "Delete chat",
    "Password visibility",
    "Select expand / collapse",
    "Progress explanation",
    "Selected option",
    "Button loading",
    "Directional actions",
    "Send message",
  ]);

  return familiarControls.has(icon.title)
    ? "Familiar control · illustrated"
    : "New contextual metaphor";
}

function ProposalArtwork({
  icon,
  size,
  expanded = false,
}: {
  icon: IconDecision;
  size: number;
  expanded?: boolean;
}) {
  const downloadedIllustrations: Record<string, { alt: string; src: string }> = {
    "Personalised study plans": {
      alt: "Student selecting activities for a personalised study plan",
      src: "/icon-audit/proposal-source/study-plan",
    },
    "Practice tests": {
      alt: "Student completing a timed online practice test",
      src: "/icon-audit/proposal-source/practice-tests",
    },
    "Expert guidance": {
      alt: "Student following a guidance pathway towards success",
      src: "/icon-audit/proposal-source/expert-guidance",
    },
  };
  const downloadedIllustration = downloadedIllustrations[icon.title];

  if (icon.keepCurrent) {
    return <>{icon.current}</>;
  }

  if (downloadedIllustration) {
    return (
      <Image
        src={downloadedIllustration.src}
        alt={downloadedIllustration.alt}
        width={3000}
        height={2250}
        unoptimized
        className={expanded ? "h-32 w-44 rounded-2xl object-contain" : "h-20 w-24 rounded-xl object-contain"}
      />
    );
  }

  const proposals = Array.isArray(icon.proposal) ? icon.proposal : [icon.proposal];

  return (
    <span className="flex items-center justify-center gap-0.5">
      {proposals.map((name) => (
        <StudyBuddyIcon key={name} name={name} size={proposals.length > 1 ? Math.max(size - 10, 18) : size} />
      ))}
    </span>
  );
}

function UsagePreview({
  icon,
  location,
  proposed,
}: {
  icon: IconDecision;
  location: IconLocation;
  proposed: boolean;
}) {
  const artwork = proposed && !icon.keepCurrent ? (
    <ProposalArtwork icon={icon} size={Math.max(icon.actualSize, 18)} />
  ) : (
    <CurrentIconAtSize icon={icon} />
  );
  const context = location.context.toLowerCase();
  const copy = usageCopy(icon, location);
  const surfaceClass = proposed
    ? "border-[#CDB9D7] bg-[#FBF8FC]"
    : "border-[#DDD8E0] bg-[#F7F7F7]";

  let surface: ReactNode;

  if (location.file === "app/ClientLanding.tsx" && context.includes("benefit card")) {
    surface = (
      <div className={`min-h-56 rounded-2xl border p-3 ${surfaceClass}`}>
        <div className="flex min-h-48 flex-col items-start rounded-xl border border-[#E0DBE3] bg-white p-3">
          {artwork}
          <p className="mt-2 text-[10px] font-black leading-4">{copy.heading}</p>
          <p className="mt-2 text-[9px] leading-4 text-[#62596A]">{copy.body}</p>
        </div>
      </div>
    );
  } else if (context.includes("tab")) {
    surface = (
      <div className={`flex min-h-24 flex-col items-center justify-center rounded-2xl border px-2 py-3 ${surfaceClass}`}>
        {artwork}
        <span className="mt-1 text-[9px] font-bold">{copy.heading}</span>
        <span className={`mt-1 h-1 w-8 rounded-full ${proposed ? "bg-[#6C3483]" : "bg-[#CBD0D7]"}`} />
      </div>
    );
  } else if (context.includes("button") || context.includes("action") || context.includes("link") || context.includes("submit")) {
    surface = (
      <div className={`flex min-h-24 items-center justify-center rounded-2xl border p-3 ${surfaceClass}`}>
        <div className="flex items-center gap-2 rounded-xl border border-[#BFB6C5] bg-white px-3 py-2 text-[9px] font-black">
          {artwork}
          <span>{copy.action}</span>
        </div>
      </div>
    );
  } else if (context.includes("field") || context.includes("select") || context.includes("dropdown") || context.includes("option")) {
    surface = (
      <div className={`flex min-h-24 items-center justify-center rounded-2xl border p-3 ${surfaceClass}`}>
        <div className="flex w-full items-center justify-between rounded-xl border border-[#BFB6C5] bg-white px-3 py-2">
          <span>
            <span className="block text-[8px] font-black uppercase tracking-wide text-[#6C3483]">{copy.heading}</span>
            <span className="mt-0.5 block text-[9px] font-medium text-[#756D7B]">{copy.body}</span>
          </span>
          {artwork}
        </div>
      </div>
    );
  } else if (context.includes("row") || context.includes("collection")) {
    surface = (
      <div className={`flex min-h-24 items-center justify-center rounded-2xl border p-3 ${surfaceClass}`}>
        <div className="flex w-full items-center gap-2 rounded-xl border border-[#DED8E2] bg-white p-2">
          {artwork}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black leading-4">{copy.heading}</p>
            <p className="mt-0.5 text-[8px] leading-3 text-[#6E6574]">{copy.body}</p>
          </div>
        </div>
      </div>
    );
  } else {
    surface = (
      <div className={`min-h-24 rounded-2xl border p-3 ${surfaceClass}`}>
        <div className="flex items-start gap-2">
          {artwork}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black leading-4">{copy.heading}</p>
            <p className="mt-1 text-[8px] leading-3 text-[#6E6574]">{copy.body}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className={`mb-1.5 text-[9px] font-black uppercase tracking-[0.12em] ${proposed ? "text-[#6C3483]" : "text-[#777]"}`}>
        {proposed ? (icon.keepCurrent ? "Keep current" : "Proposed") : "Current"}
      </p>
      {surface}
    </div>
  );
}

function CurrentIconAtSize({ icon }: { icon: IconDecision }) {
  const scale = Math.max(0.34, Math.min(0.9, icon.actualSize / 52));

  return (
    <span className="flex h-10 min-w-10 items-center justify-center overflow-visible text-[#111827]">
      <span className="flex origin-center items-center justify-center" style={{ transform: `scale(${scale})` }}>
        {icon.current}
      </span>
    </span>
  );
}

function usageCopy(icon: IconDecision, location: IconLocation) {
  const homepageBenefits: Record<string, { heading: string; body: string }> = {
    "Personalised study plans": {
      heading: "Personalized Study Plans",
      body: "Get a study plan tailored to your learning style and pace, ensuring you cover all the necessary material effectively.",
    },
    "Practice tests": {
      heading: "Comprehensive Practice Tests",
      body: "Take full-length WAEC practice exams that replicate test-day conditions, build confidence and improve your score.",
    },
    "Expert guidance": {
      heading: "Expert Guidance",
      body: "Connect with experienced tutors and mentors for insights and support throughout your preparation journey.",
    },
  };

  if (location.file === "app/ClientLanding.tsx" && homepageBenefits[icon.title]) {
    return { ...homepageBenefits[icon.title], action: shortActionLabel(icon.title) };
  }

  const navLabels: Record<string, string> = {
    "Dashboard / Home": "Home",
    "Study materials": "Materials",
    "Mock exams": "Exams",
    Progress: "Progress",
    "AI chat": "Chat",
    Profile: "Profile",
  };

  const authHeadings: Record<string, string> = {
    "app/login/LoginClient.tsx": "Welcome back",
    "app/sign-up/SignUpClient.tsx": "Create your account",
    "app/forgot-password/ForgotPasswordClient.tsx": "Forgot your password?",
    "app/check-email/CheckEmailClient.tsx": "Check your email",
    "app/reset-password/update/ResetPasswordUpdateClient.tsx": "Choose a new password",
  };

  let heading = navLabels[icon.title] ?? icon.title;
  let body = location.context;
  let action = shortActionLabel(icon.title);

  if (authHeadings[location.file]) {
    heading = authHeadings[location.file];
    body = "Friendly encouragement beside this authentication heading.";
  } else if (icon.title === "Password visibility") {
    heading = "Password";
    body = "••••••••";
    action = "Show password";
  } else if (icon.title === "Select expand / collapse") {
    heading = "Subject";
    body = "Choose an option";
    action = "Open options";
  } else if (icon.title === "Selected option") {
    heading = "Mathematics";
    body = "Selected subject";
    action = "Selected";
  } else if (icon.title === "Button loading") {
    heading = "Submitting form";
    body = "Please wait…";
    action = "Loading…";
  } else if (icon.title === "Security and trust") {
    if (location.file.includes("about-us")) heading = "Student data protection";
    if (location.file.includes("privacy-policy")) heading = "Privacy and data security";
    if (location.file.includes("terms-of-service")) heading = "Fair use";
    if (location.file.includes("contact-us")) heading = "Your privacy";
  } else if (icon.title === "Study support") {
    heading = location.file.includes("about-us") ? "Study support" : "Contact Study Buddy";
  } else if (icon.title === "Built for learners") {
    heading = "Built for learners";
  } else if (icon.title === "Message sent confirmation") {
    heading = "Message sent";
  } else if (icon.title === "Directional actions") {
    const directionalLabels = [
      "Start learning",
      "Go to dashboard",
      "Create an account",
      "Browse materials",
      "Practice now",
      "Start your first session",
      "Study materials",
    ];
    action = directionalLabels.find((label) => location.context.includes(`‘${label}’`)) ?? "Continue";
  } else if (icon.title === "New chat") {
    action = "New Chat";
  } else if (icon.title === "Edit chat title") {
    action = "Save title";
  } else if (icon.title === "Delete chat") {
    action = "Delete chat";
  } else if (icon.title === "Progress explanation") {
    action = "How is progress calculated?";
  } else if (icon.title === "Send message") {
    action = "Send Message";
  }

  return { heading, body, action };
}

function shortActionLabel(title: string) {
  if (title === "Directional actions" || title === "Forward / drill down") return "Continue";
  if (title === "Send message") return "Send";
  if (title === "Auth encouragement") return "Welcome";
  return title;
}

function PreviewPanel({
  label,
  proposed = false,
  children,
}: {
  label: string;
  proposed?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={proposed ? "bg-[#FBF8FC]" : "bg-[#F5F5F5]"}>
      <p className={`px-4 pt-4 text-[10px] font-black uppercase tracking-[0.16em] ${proposed ? "text-[#6C3483]" : "text-[#777]"}`}>
        {label}
      </p>
      {children}
    </div>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border-2 border-[#070405] bg-[#E9E6ED] px-4 py-3">
      <p className="text-2xl font-black text-[#3B2A56]">{value}</p>
      <p className="mt-1 text-xs font-bold text-[#5E5365]">{label}</p>
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#D7CFDC] bg-white py-1.5 pl-1.5 pr-3">
      <span className="h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: color }} />
      <span className="text-xs font-bold text-[#62596A]">{label}</span>
    </div>
  );
}
