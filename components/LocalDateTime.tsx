"use client";

import { useSyncExternalStore } from "react";
import {
  formatLocalDateTime,
  formatUtcDateTime,
} from "@/lib/date-format";

interface LocalDateTimeProps {
  value: string;
}

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function LocalDateTime({ value }: LocalDateTimeProps) {
  const isClient = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const label = isClient
    ? formatLocalDateTime(value)
    : formatUtcDateTime(value);

  const date = new Date(value);
  const dateTime = Number.isNaN(date.getTime()) ? undefined : date.toISOString();

  return <time dateTime={dateTime}>{label}</time>;
}
