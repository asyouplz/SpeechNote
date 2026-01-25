#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  WARNING: This script is for emergency manual releases only.${NC}"
echo -e "${YELLOW}    Regular releases are now handled automatically by semantic-release on PR merge to main.${NC}"
echo ""
read -p "Continue with manually creating a release? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Manual release cancelled.${NC}"
    exit 0
fi

# Release Script for SpeechNote Plugin (EMERGENCY MANUAL ONLY)
# Usage: ./scripts/release-emergency.sh [patch|minor|major|VERSION]
#
# Examples:
#   ./scripts/release-emergency.sh patch      # 3.0.9 -> 3.0.10
#   ./scripts/release-emergency.sh minor      # 3.0.9 -> 3.1.0
#   ./scripts/release-emergency.sh major      # 3.0.9 -> 4.0.0
#   ./scripts/release-emergency.sh 3.2.5      # Specific version

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current version
CURRENT_VERSION=$(node -p "require('./manifest.json').version")

echo -e "${GREEN}📦 Current version: ${CURRENT_VERSION}${NC}"
echo ""

# Determine new version
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Version bump type required${NC}"
  echo "Usage: $0 [patch|minor|major|VERSION]"
  exit 1
fi

BUMP_TYPE=$1

# Check if it's a specific version or a bump type
if [[ $BUMP_TYPE =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEW_VERSION=$BUMP_TYPE
  echo -e "${YELLOW}📌 Setting specific version: ${NEW_VERSION}${NC}"
else
  # Calculate new version based on bump type
  IFS='.' read -r -a parts <<< "$CURRENT_VERSION"
  major="${parts[0]}"
  minor="${parts[1]}"
  patch="${parts[2]}"

  case "$BUMP_TYPE" in
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    patch)
      patch=$((patch + 1))
      ;;
    *)
      echo -e "${RED}❌ Invalid bump type: ${BUMP_TYPE}${NC}"
      echo "Valid options: patch, minor, major, or specific version (e.g., 3.1.0)"
      exit 1
      ;;
  esac

  NEW_VERSION="${major}.${minor}.${patch}"
  echo -e "${YELLOW}📈 Bumping ${BUMP_TYPE} version: ${CURRENT_VERSION} → ${NEW_VERSION}${NC}"
fi

echo ""

# Confirm
read -p "Continue with version ${NEW_VERSION}? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Release cancelled${NC}"
  exit 0
fi

echo ""
echo -e "${GREEN}🚀 Starting release process...${NC}"
echo ""

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo -e "${RED}❌ Error: You have uncommitted changes${NC}"
  echo "Please commit or stash your changes before creating a release"
  exit 1
fi

# Make sure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo -e "${YELLOW}⚠️  Warning: You are not on main branch (current: ${CURRENT_BRANCH})${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
fi

# Pull latest changes with verification
echo "📥 Fetching latest changes..."
git fetch origin main

# Show what would be pulled
COMMITS_BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")
if [ "$COMMITS_BEHIND" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Local branch is $COMMITS_BEHIND commit(s) behind origin/main${NC}"
  echo ""
  echo "Changes to be pulled:"
  git log --oneline HEAD..origin/main
  echo ""
  git diff --stat HEAD..origin/main
  echo ""
  read -p "Pull these changes? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Aborting: Please resolve manually${NC}"
    exit 1
  fi
  git merge origin/main
else
  echo -e "${GREEN}✅ Already up to date${NC}"
fi

# Run tests and checks
echo "🧪 Running tests and checks..."
npm run lint || { echo -e "${RED}❌ Lint failed${NC}"; exit 1; }
npm run typecheck || { echo -e "${RED}❌ Type check failed${NC}"; exit 1; }
npm run build || { echo -e "${RED}❌ Build failed${NC}"; exit 1; }

echo ""
echo -e "${GREEN}✅ All checks passed${NC}"
echo ""

# Update version in files
echo "📝 Updating version files..."

# Update manifest.json
node -e "
  const fs = require('fs');
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  manifest.version = '${NEW_VERSION}';
  fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t') + '\n');
"

# Update package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '${NEW_VERSION}';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 4) + '\n');
"

# Update versions.json
MIN_APP_VERSION=$(node -p "require('./manifest.json').minAppVersion")
node -e "
  const fs = require('fs');
  const versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
  versions['${NEW_VERSION}'] = '${MIN_APP_VERSION}';
  fs.writeFileSync('versions.json', JSON.stringify(versions, null, '\t') + '\n');
"

echo -e "${GREEN}✅ Updated manifest.json, package.json, and versions.json${NC}"

# Commit changes
echo "💾 Committing version bump..."
git add manifest.json package.json versions.json
git commit -m "chore: bump version to ${NEW_VERSION}"

# Create tag
TAG="v${NEW_VERSION}"
echo "🏷️  Creating tag: ${TAG}..."
git tag -a "$TAG" -m "Release ${TAG}"

echo ""
echo -e "${GREEN}✅ Release prepared locally${NC}"
echo ""
echo "📤 Next steps:"
echo "  1. Push commit: git push origin main"
echo "  2. Push tag:    git push origin ${TAG}"
echo "  3. Or push both: git push origin main --tags"
echo ""
read -p "Push now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📤 Pushing to remote..."
  git push origin main
  git push origin "$TAG"
  echo ""
  echo -e "${GREEN}🎉 Release ${TAG} created successfully!${NC}"
  echo "GitHub Actions will automatically create the release."
  echo "Check: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
else
  echo -e "${YELLOW}⚠️  Changes committed locally but not pushed${NC}"
  echo "Run the following commands when ready:"
  echo "  git push origin main"
  echo "  git push origin ${TAG}"
fi

echo ""
echo -e "${GREEN}✨ Done!${NC}"
