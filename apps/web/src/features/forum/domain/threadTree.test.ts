import { describe, expect, it } from 'vitest';

import { asPostId, asTopicId, type Post, type PostId } from './entities';
import { buildThreadTree, countPosts } from './threadTree';

const topicId = asTopicId('topic-1');

function post(id: string, path: string[], options: Partial<Post> = {}): Post {
  return {
    id: asPostId(id),
    topicId,
    parentId: path.length > 1 ? asPostId(path[path.length - 2] as string) : null,
    author: null,
    bodyMarkdown: id,
    path: path.map(asPostId) as PostId[],
    depth: path.length - 1,
    isOpeningPost: false,
    editedAt: null,
    createdAt: '2026-07-26T12:00:00Z',
    isRemoved: false,
    ...options,
  };
}

describe('buildThreadTree', () => {
  it('returns nothing for an empty thread', () => {
    expect(buildThreadTree([])).toEqual([]);
  });

  it('keeps top-level replies as roots', () => {
    const tree = buildThreadTree([post('a', ['a']), post('b', ['b'])]);

    expect(tree).toHaveLength(2);
    expect(tree.map((node) => node.post.id)).toEqual(['a', 'b']);
  });

  it('nests a reply under its parent', () => {
    const tree = buildThreadTree([post('a', ['a']), post('b', ['a', 'b'])]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.children.map((node) => node.post.id)).toEqual(['b']);
  });

  it('nests several levels deep', () => {
    const tree = buildThreadTree([
      post('a', ['a']),
      post('b', ['a', 'b']),
      post('c', ['a', 'b', 'c']),
    ]);

    expect(tree[0]?.children[0]?.children[0]?.post.id).toBe('c');
  });

  it('orders siblings by path, whatever order they arrive in', () => {
    const tree = buildThreadTree([post('b', ['b']), post('a', ['a']), post('c', ['c'])]);

    expect(tree.map((node) => node.post.id)).toEqual(['a', 'b', 'c']);
  });

  it('lifts orphaned replies to the nearest surviving ancestor', () => {
    // 'b' was removed, so the database never sent it. Without the path-based
    // walk, 'c' would have no parent in the map and would disappear from the
    // page along with everyone's answer to it.
    const tree = buildThreadTree([post('a', ['a']), post('c', ['a', 'b', 'c'])]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.children.map((node) => node.post.id)).toEqual(['c']);
  });

  it('promotes a reply to the root when its whole ancestry is gone', () => {
    const tree = buildThreadTree([post('c', ['a', 'b', 'c'])]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.post.id).toBe('c');
  });

  it('keeps a removed post that is still visible, so the thread reads correctly', () => {
    // A post the viewer may see but that is marked removed still occupies its
    // place; the UI renders a placeholder rather than collapsing the branch.
    const tree = buildThreadTree([post('a', ['a'], { isRemoved: true }), post('b', ['a', 'b'])]);

    expect(tree[0]?.post.isRemoved).toBe(true);
    expect(tree[0]?.children).toHaveLength(1);
  });

  it('does not lose a post', () => {
    const posts = [
      post('a', ['a']),
      post('b', ['a', 'b']),
      post('c', ['a', 'b', 'c']),
      post('d', ['d']),
      post('e', ['d', 'e']),
    ];

    expect(countPosts(buildThreadTree(posts))).toBe(posts.length);
  });
});
