"use client";

import AbstractHeading from "./AbstractHeading";
import type { AbstractHeadingProps } from "./AbstractHeading";

type Props = Readonly<Omit<AbstractHeadingProps, "level">>;

export default function Heading4(props: Props) {
  return <AbstractHeading level={4} {...props} />;
}
