import AbstractHeading from "./AbstractHeading";
import type { AbstractHeadingProps } from "./AbstractHeading";

type Props = Readonly<Omit<AbstractHeadingProps, "level">>;

export default function Heading2(props: Props) {
  return <AbstractHeading level={2} {...props} />;
}
