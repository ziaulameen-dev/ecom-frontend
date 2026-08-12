import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ReferralCapture } from '@/components/referral-capture';

/** Storefront chrome: announcement bar + header + footer around every shop page. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ReferralCapture />
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
