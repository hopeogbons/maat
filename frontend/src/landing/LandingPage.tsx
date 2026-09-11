import { useEffect } from 'react'
import { useLanguage } from '@/i18n'
import { Articles } from './components/Articles'
import { Hero } from './components/Hero'
import { HowItWorks } from './components/HowItWorks'
import { SiteFooter } from './components/SiteFooter'
import { TagMarquee } from './components/TagMarquee'

export function LandingPage() {
  const { t } = useLanguage()

  // Keep the tab title and description in the chosen language.
  useEffect(() => {
    document.title = t.meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description)
  }, [t])

  return (
    <>
      <Hero />
      <main>
        <TagMarquee />
        <HowItWorks />
        <Articles />
      </main>
      <SiteFooter />
    </>
  )
}
