"use client";

import NextLink from "next/link";
import { forwardRef } from "react";
import { useLocale } from "./I18nProvider";
import { localizeHref } from "./navigation";

/**
 * Drop-in replacement for next/link that keeps the visitor in their language:
 * <Link href="/collections/men"> becomes /ur/collections/men on Urdu pages.
 * Outside the storefront (admin) the default locale applies, so hrefs are unchanged.
 */
const Link = forwardRef(function Link({ href, ...props }, ref) {
  const locale = useLocale();
  return <NextLink ref={ref} href={localizeHref(href, locale)} {...props} />;
});

export default Link;
