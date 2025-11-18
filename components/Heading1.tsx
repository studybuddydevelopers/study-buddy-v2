"use client";

import AbstractHeading from "./AbstractHeading";
import type { AbstractHeadingProps } from "./AbstractHeading";

/** Props are read-only and exclude `level` which is fixed to 1 */
type Props = Readonly<Omit<AbstractHeadingProps, "level">>;

export default function Heading1(props: Props) {
  return <AbstractHeading level={1} {...props} />;
}
