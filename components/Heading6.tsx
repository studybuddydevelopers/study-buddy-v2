"use client";

import AbstractHeading from "./AbstractHeading";
import type { AbstractHeadingProps } from "./AbstractHeading";

type Props = Readonly<Omit<AbstractHeadingProps, "level">>;

export default function Heading6(props: Props) {
  return <AbstractHeading level={6} {...props} />;
}
