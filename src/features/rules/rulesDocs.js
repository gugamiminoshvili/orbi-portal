// The two regulation documents, each published in Georgian and English.
//
// The files are static legal texts, so they are served from `public/` rather
// than fetched: no endpoint exists for them, they change rarely, and putting
// them behind an API would only add a failure mode to a link.
//
// Russian is deliberately absent — the documents are not published in it.
// The UI still offers Russian; a Russian-speaking reader is defaulted to the
// English file rather than shown a language chip that leads nowhere.
export const DOC_LANGS = ['ka', 'en']

// `bytes` is recorded here rather than measured at runtime: the sizes are
// fixed at build time, and a HEAD request per file just to print "3.6 MB"
// would cost four round trips for a label.
export const RULES_DOCS = [
  {
    id: 'hotel',
    tone: 'pos',
    icon: 'building',
    files: {
      ka: {
        href: '/documents/hotel-regulation-ka.pdf',
        name: 'სასტუმროს წესები და პირობები.pdf',
        bytes: 3804331,
      },
      en: {
        href: '/documents/hotel-regulation-en.pdf',
        name: 'Hotel Regulation.pdf',
        bytes: 3083897,
      },
    },
  },
  {
    id: 'service',
    tone: 'info',
    icon: 'doc',
    files: {
      ka: {
        href: '/documents/service-agreement-ka.pdf',
        name: 'მომსახურების ხელშეკრულებით განსაზღვრული რეგულაციები.pdf',
        bytes: 3720313,
      },
      en: {
        href: '/documents/service-agreement-en.pdf',
        name: 'Service Agreement Regulation.pdf',
        bytes: 3203060,
      },
    },
  },
]

// Which file to offer first. The reader's interface language when we publish
// in it, English otherwise.
export function defaultDocLang(uiLang) {
  return DOC_LANGS.includes(uiLang) ? uiLang : 'en'
}

export function formatMb(bytes) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}
