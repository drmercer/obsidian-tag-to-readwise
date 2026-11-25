#!/bin/bash

bump_type="${1:-patch}"

# npm version uses a tag with a "v" by default, but Obsidian doesn't like those, so we use --no-git-tag-version and then create a tag without the "v" prefix.
# But that means we need to create the commit ourselves too.

# abort if git worktree is not clean
if ! git diff-index --quiet HEAD --; then
  echo "Git worktree is not clean. Please commit or stash your changes before running this script."
  exit 1
fi

pnpm version "$bump_type" --no-git-tag-version
git commit -am "$(node -p "require('./package.json').version")"
git tag "$(node -p "require('./package.json').version")"
