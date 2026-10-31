import type { Category, Post } from '@/lib/types'
import { serverLookup } from './server-lookup'
import { LeadStoriesView, PostListView } from './views/posts'

export { EmptyPosts } from './views/posts'

/** Index rows separated by rules: lists of posts on /blog, categories, tags and related posts. */
export function PostList(props: { posts: Post[]; categories: Category[]; headingLevel?: 2 | 3 }) {
  return <PostListView {...props} lookup={serverLookup()} />
}

/** Home "Gündem": one lead story with its photo, the next headlines as a compact list beside it. */
export function LeadStories(props: { posts: Post[]; categories: Category[] }) {
  return <LeadStoriesView {...props} lookup={serverLookup()} />
}
