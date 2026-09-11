import type { ComponentType, SVGProps } from 'react'
import { FacebookIcon, InstagramIcon, LinkedInIcon, XIcon, YouTubeIcon } from './components/BrandIcons'

/**
 * Contact details and links shown in the header and footer. Placeholders:
 * change them here and every mention on the page updates.
 */
export const SITE = {
  name: 'Maat',
  tagline: 'Send a rumour, get a cited answer',
  domain: 'maatverify.com',
  email: 'hello@maatverify.com',
  pressEmail: 'press@maatverify.com',
  helpline: {
    display: '0800 000 MAAT',
    digits: '0800 000 6228',
    tel: '+2348000006228',
    hours: 'Free to call, every day, 7am to 10pm',
  },
  whatsapp: {
    display: '+234 800 000 6228',
    href: 'https://wa.me/2348000006228',
  },
  social: [
    { name: 'X', handle: '@maatverify', href: 'https://x.com/maatverify', icon: XIcon },
    { name: 'YouTube', handle: '@maatverify', href: 'https://youtube.com/@maatverify', icon: YouTubeIcon },
    { name: 'LinkedIn', handle: 'maatverify', href: 'https://linkedin.com/company/maatverify', icon: LinkedInIcon },
    { name: 'Facebook', handle: 'maatverify', href: 'https://facebook.com/maatverify', icon: FacebookIcon },
    { name: 'Instagram', handle: '@maatverify', href: 'https://instagram.com/maatverify', icon: InstagramIcon },
  ] satisfies { name: string; handle: string; href: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[],
  nav: [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Verifications', href: '#verifications' },
    { label: 'Contact', href: '#contact' },
  ],
} as const
