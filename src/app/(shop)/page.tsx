import type { Metadata } from 'next';
import { STORE_NAME } from '@/lib/config';
import { HomeClient } from './home-client';

const TITLE = `${STORE_NAME} — Watches, Perfumes & More`;
const DESCRIPTION =
  `Shop watches, perfumes and curated essentials at ${STORE_NAME}. ` +
  'Discover new arrivals, best sellers and collections with fast shipping and easy returns.';

export const metadata: Metadata = {
  // `absolute` overrides the root layout's "%s · STORE" template for the home page.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">{TITLE}</h1>
      <HomeClient />
    </>
  );
}
