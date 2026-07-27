import type { Post, PostId } from './entities';

export interface ThreadNode {
  post: Post;
  children: ThreadNode[];
}

/**
 * Rebuilds the reply tree from the flat, path-ordered list the repository
 * returns.
 *
 * It reads `path` rather than `parentId`, and that is the whole point. A
 * removed post is not sent to the client at all — the database hides it — so
 * its replies would otherwise be orphaned and vanish from the page. Their
 * `path` still carries the full ancestry, so they can be attached to the
 * nearest ancestor that *is* present and the conversation keeps its shape.
 *
 * Pure, and therefore testable without a database, a store or a browser.
 */
export function buildThreadTree(posts: readonly Post[]): ThreadNode[] {
  const nodes = new Map<PostId, ThreadNode>();
  const roots: ThreadNode[] = [];

  // Path order guarantees a post's ancestors are seen before it is, so a
  // single pass is enough.
  const ordered = [...posts].sort((a, b) => comparePaths(a.path, b.path));

  for (const post of ordered) {
    const node: ThreadNode = { post, children: [] };
    nodes.set(post.id, node);

    const parent = findNearestPresentAncestor(post, nodes);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Walks up the path until it finds an ancestor that was actually returned.
 * Anything missing was removed, and its children are lifted a level rather
 * than dropped.
 */
function findNearestPresentAncestor(
  post: Post,
  nodes: Map<PostId, ThreadNode>,
): ThreadNode | undefined {
  // The last entry of `path` is the post itself.
  for (let index = post.path.length - 2; index >= 0; index -= 1) {
    const ancestorId = post.path[index];
    if (ancestorId) {
      const ancestor = nodes.get(ancestorId);
      if (ancestor) {
        return ancestor;
      }
    }
  }

  return undefined;
}

function comparePaths(a: readonly PostId[], b: readonly PostId[]): number {
  const shared = Math.min(a.length, b.length);

  for (let index = 0; index < shared; index += 1) {
    const left = a[index] ?? '';
    const right = b[index] ?? '';
    if (left !== right) {
      return left < right ? -1 : 1;
    }
  }

  return a.length - b.length;
}

/** Total posts in a tree, including every level of nesting. */
export function countPosts(nodes: readonly ThreadNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countPosts(node.children), 0);
}
