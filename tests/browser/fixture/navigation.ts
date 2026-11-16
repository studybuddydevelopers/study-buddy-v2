// Full-page navigation keeps the fixture honest about not testing the Next router.
const router = {
  push: (href: string) => window.location.assign(href),
  replace: (href: string) => window.location.replace(href),
  refresh: () => window.location.reload(),
};
export const useRouter = () => router;
export const usePathname = () => window.location.pathname;
export const useSearchParams = () => new URLSearchParams(window.location.search);
