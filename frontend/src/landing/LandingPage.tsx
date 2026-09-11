import { Articles } from './components/Articles'
import { Hero } from './components/Hero'
import { HowItWorks } from './components/HowItWorks'
import { SiteFooter } from './components/SiteFooter'
import { TagMarquee } from './components/TagMarquee'

export function LandingPage() {
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
