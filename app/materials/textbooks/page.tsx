import type { Metadata } from "next";
import { getMaterialsOverview } from "../materials-data";
import TextbooksClient from "./TextbooksClient";

export const metadata: Metadata = {
  title: "Textbooks | Study Buddy",
  description:
    "Explore Study Buddy textbook collections and find learning resources for your WAEC subjects.",
};

export default async function TextbooksPage() {
  const subjects = await getMaterialsOverview();
  return <TextbooksClient subjects={subjects} />;
}
