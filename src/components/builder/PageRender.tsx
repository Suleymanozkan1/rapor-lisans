import { Render } from '@puckeditor/core'
import type { BuilderData } from '@/lib/pages/model'
import { buildConfig } from './config'
import type { SiteData } from './site-data'

const config = buildConfig()

/** A page built in the editor, rendered on the server (static HTML; interactive blocks hydrate on their own). */
export function PageRender({ data, site }: { data: BuilderData; site: SiteData }) {
  return <Render config={config} data={data} metadata={site} />
}
