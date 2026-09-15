import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { createPageMetadata } from "@/lib/site-metadata";
import {
  EXAM_CATEGORIES,
  isExamCategorySlug,
} from "../../exam-categories";
import MockExamsClient, {
  type MockExamTemplate,
} from "../../MockExamsClient";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: CategoryPageProps) {
  const { category } = await params;
  if (!isExamCategorySlug(category)) {
    return createPageMetadata({
      title: "Mock Exam Option",
      description: "Choose a Study Buddy mock exam or practice session.",
      index: false,
    });
  }

  const config = EXAM_CATEGORIES[category];
  return createPageMetadata({
    title: config.title,
    description: config.description,
    index: false,
  });
}

export default async function ExamCategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  if (!isExamCategorySlug(category)) notFound();

  const config = EXAM_CATEGORIES[category];
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = await getBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/v1/mock-exams/mock-exam-templates`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );
  const allTemplates: MockExamTemplate[] = response.ok
    ? await response.json()
    : [];
  const templateByTitle = new Map(
    allTemplates.map((template) => [template.title, template] as const)
  );
  const templates = config.templateTitles.flatMap((title) => {
    const template = templateByTitle.get(title);
    return template ? [template] : [];
  });

  return (
    <MockExamsClient
      templates={templates}
      title={config.title}
      description={config.description}
    />
  );
}
