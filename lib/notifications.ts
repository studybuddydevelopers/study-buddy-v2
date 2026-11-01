export interface LearnerNotification {
  id: string;
  title: string;
  description: string;
  reference: string;
  href: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  notifications: LearnerNotification[];
  unreadCount: number;
  nextCursor: string | null;
  asOf: string;
}

export function notificationContent(review: {
  id: string;
  status: string;
  paperTitleSnapshot: string;
  questionReferenceSnapshot: string;
  originalScore: number;
  revisedScore: number | null;
  maxScore: number;
}) {
  const adjusted = review.status === "MARK_ADJUSTED";
  return {
    title: adjusted ? "Your mark has been updated" : "Your marking review is complete",
    description: `${review.paperTitleSnapshot} · ${review.questionReferenceSnapshot}. ${
      adjusted
        ? `Your mark changed from ${review.originalScore} to ${review.revisedScore} out of ${review.maxScore}.`
        : `Support confirmed your original mark of ${review.originalScore} out of ${review.maxScore}.`
    }`,
    href: `/marking-reviews/${encodeURIComponent(review.id)}`,
  };
}
