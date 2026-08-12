import PageTemplate, { generateMetadata } from './[slug]/page'

// App Platform builds have no database access (see .do/app.yaml). Unlike
// `[slug]`, this root route has no dynamic segment for generateStaticParams
// to govern, so it must opt out of build-time prerendering explicitly.
export const dynamic = 'force-dynamic'

export default PageTemplate

export { generateMetadata }
