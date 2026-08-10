'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { useContent } from '@/features/catalog';
import { STORE_NAME } from '@/lib/config';

const SHOP: [string, string][] = [
  ['New arrivals', '/shop?sort=new'],
  ['Best selling', '/shop?sort=best'],
  ['Watches', '/shop?category=watches'],
  ['Perfumes', '/shop?category=perfumes'],
];
const HELP: [string, string][] = [
  ['FAQ', '/faq'],
  ['Shipment', '/account?tab=orders'],
  ['Track order', '/account?tab=orders'],
  ['Contact us', '/faq'],
];
// Shown until an admin configures socials in Settings.
const DEFAULT_SOCIALS = [
  { label: 'Facebook', url: '#' },
  { label: 'Instagram', url: '#' },
  { label: 'Twitter', url: '#' },
  { label: 'Youtube', url: '#' },
  { label: 'Snapchat', url: '#' },
];

export function SiteFooter() {
  const { data: content } = useContent();
  const socials = content?.socials?.length ? content.socials : DEFAULT_SOCIALS;
  const [email, setEmail] = useState('');

  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success('Subscribed — thanks for signing up!');
    setEmail('');
  }

  return (
    <footer className="mt-20">
      <div className="mx-auto max-w-7xl border-t px-4 py-12">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          {/* Newsletter */}
          <div className="w-full max-w-lg">
            <p className="text-xs font-semibold uppercase leading-relaxed tracking-widest">
              {STORE_NAME} is huge.
              <br />
              Sign up to be in the know.
            </p>
            <form onSubmit={subscribe} className="mt-4 flex w-full max-w-md">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your e-mail address"
                aria-label="Email address"
                className="h-11 w-full border bg-transparent px-4 text-[11px] uppercase tracking-widest outline-none placeholder:text-muted-foreground focus:border-foreground/40"
              />
              <button
                type="submit"
                className="h-11 shrink-0 bg-primary px-6 text-[11px] font-medium uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* Link columns */}
          <div className="flex gap-12 sm:gap-16">
            <FooterCol title="Shop" links={SHOP} />
            <FooterCol title="Help" links={HELP} />
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-12 flex flex-col gap-4 text-[10px] uppercase tracking-widest text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </div>
          <div>© {STORE_NAME}. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-widest">{title}</div>
      <ul className="mt-3 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
