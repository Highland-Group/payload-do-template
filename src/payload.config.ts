import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'
import { s3Storage } from '@payloadcms/storage-s3'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

function stripSslMode(databaseURL: string): string {
  if (!databaseURL) return databaseURL
  const url = new URL(databaseURL)
  url.searchParams.delete('sslmode')
  return url.toString()
}

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      // DigitalOcean's managed/dev Postgres always requires TLS, using a
      // cert signed by DO's own CA rather than a public one — node-postgres
      // rejects that by default ("self-signed certificate in certificate
      // chain") unless given the CA to trust explicitly. Not needed for
      // local dev, which doesn't use TLS at all.
      //
      // DATABASE_URL carries its own `sslmode=require`, and pg's
      // ConnectionParameters merges values parsed out of the connection
      // string over any explicit `ssl` option, silently discarding the CA
      // below. Strip sslmode so our explicit ssl config actually wins.
      connectionString: process.env.DATABASE_CA_CERT
        ? stripSslMode(process.env.DATABASE_URL || '')
        : process.env.DATABASE_URL || '',
      ...(process.env.DATABASE_CA_CERT
        ? { ssl: { ca: process.env.DATABASE_CA_CERT, rejectUnauthorized: true } }
        : {}),
    },
  }),
  collections: [Pages, Posts, Media, Categories, Users],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  plugins: [
    ...plugins,
    // Only offload media to DO Spaces in production; locally, Media's
    // `staticDir` serves uploads from disk so dev doesn't need Spaces
    // credentials or network access.
    ...(process.env.NODE_ENV === 'production'
      ? [
          s3Storage({
            collections: {
              media: true, // MUST match slug of Collection!
            },
            bucket: process.env.SPACES_BUCKET_NAME || '',
            config: {
              credentials: {
                accessKeyId: process.env.SPACES_KEY_ID || '',
                secretAccessKey: process.env.SPACES_SECRET_KEY || '',
              },
              region: process.env.SPACES_REGION || '',
              endpoint: `https://${process.env.SPACES_REGION}.digitaloceanspaces.com`,
              forcePathStyle: false,
            },
          }),
        ]
      : []),
  ],
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
