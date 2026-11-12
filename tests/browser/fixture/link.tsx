import React from "react";
export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) {
  const anchorProps = { ...props };
  delete anchorProps.prefetch;
  return <a href={href} {...anchorProps}>{children}</a>;
}
