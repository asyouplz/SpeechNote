## [4.0.8](https://github.com/asyouplz/SpeechNote/compare/v4.0.7...v4.0.8) (2026-02-19)

### ♻️ Code Refactoring

* **ui:** consolidate settings architecture and wave3 fixes ([#67](https://github.com/asyouplz/SpeechNote/issues/67)) ([f62f8ee](https://github.com/asyouplz/SpeechNote/commit/f62f8eec5adee5c0c4a22498102490a3851d7e61))

## [4.0.7](https://github.com/asyouplz/SpeechNote/compare/v4.0.6...v4.0.7) (2026-02-04)

### 🐛 Bug Fixes

* address obsidian review findings ([#65](https://github.com/asyouplz/SpeechNote/issues/65)) ([e28c350](https://github.com/asyouplz/SpeechNote/commit/e28c35058125dab6eda98f53708634ca658cfa3c))

## [4.0.6](https://github.com/asyouplz/SpeechNote/compare/v4.0.5...v4.0.6) (2026-02-03)

### 🐛 Bug Fixes

* **ui:** align emoji labels with sentence case ([#64](https://github.com/asyouplz/SpeechNote/issues/64)) ([2bcaa6a](https://github.com/asyouplz/SpeechNote/commit/2bcaa6a07e81ad23d39c1645b76262e23f3b8a84))

## [4.0.5](https://github.com/asyouplz/SpeechNote/compare/v4.0.4...v4.0.5) (2026-02-03)

### 🐛 Bug Fixes

* **ui:** apply sentence case to provider labels ([#63](https://github.com/asyouplz/SpeechNote/issues/63)) ([3645309](https://github.com/asyouplz/SpeechNote/commit/3645309b5f5db4e028922337c163516b22851fbd))

## [4.0.4](https://github.com/asyouplz/SpeechNote/compare/v4.0.3...v4.0.4) (2026-02-03)

### 🐛 Bug Fixes

* address reviewbot required issues ([#62](https://github.com/asyouplz/SpeechNote/issues/62)) ([a87dc8f](https://github.com/asyouplz/SpeechNote/commit/a87dc8f9d994a3f7d5c48483db21ac25c9ce5c6b))

## [4.0.3](https://github.com/asyouplz/SpeechNote/compare/v4.0.2...v4.0.3) (2026-02-02)

### 🐛 Bug Fixes

* address reviewbot feedback and update tests ([#61](https://github.com/asyouplz/SpeechNote/issues/61)) ([eefd7f1](https://github.com/asyouplz/SpeechNote/commit/eefd7f136d3751733c30e0da02989bebbb62ac3c))

## [4.0.2](https://github.com/asyouplz/SpeechNote/compare/v4.0.1...v4.0.2) (2026-01-29)

### 🐛 Bug Fixes

* address review feedback and stabilize tests ([#60](https://github.com/asyouplz/SpeechNote/issues/60)) ([2d8bc68](https://github.com/asyouplz/SpeechNote/commit/2d8bc686154d28ca68d67c5889a2cfc6f8ecf07c))
* **ci:** add semantic-release configuration ([#59](https://github.com/asyouplz/SpeechNote/issues/59)) ([cb98d70](https://github.com/asyouplz/SpeechNote/commit/cb98d70ce80e9c19c0b03410cc0b0ceafb7d5fc1))
* **ci:** use github app token to bypass repository rulesets ([537a4bb](https://github.com/asyouplz/SpeechNote/commit/537a4bb9561378896143fa679ec435011ac7f562))
* **review:** resolve obsidian bot validation errors (metadata, lint, ui) ([#58](https://github.com/asyouplz/SpeechNote/issues/58)) ([c6df377](https://github.com/asyouplz/SpeechNote/commit/c6df37736221b619a02b1f9c36ce0979c4d4eec9))

## [4.0.0](https://github.com/asyouplz/SpeechNote/compare/v3.0.14...v4.0.0) (2026-01-26)

### ⚠ BREAKING CHANGES

* Manual version updates via version-bump.mjs will be deprecated.
Use Conventional Commits format for all commits going forward.

* fix: address code review feedback from Claude bot

Addressing 8 issues identified in PR #54:
- [P0/Critical] Disable version-bump.yml to prevent workflow conflicts
- [P0/Critical] Remove persist-credentials: false from release-auto.yml
- [P0/Critical] Remove deprecated version lifecycle hook in package.json
- [P1/Important] Add semver and manifest validation to update-version.mjs
- [P1/Important] Fix JSON formatting consistency in scripts
- [P2/Optional] Enhance build artifact verification with file size checks
- [P2/Optional] Rename release.sh to release-emergency.sh and add warning

* fix: address final code review points and documentation updates

* fix: address third round of code review feedback

- Revert pre-commit hook to use lint-staged
- Add file existence checks to update-version.mjs
- Remove unnecessary npm override in package.json
- Add syntax verification for build artifacts in release workflow

### 🚀 Features

* implement semantic-release automation ([#54](https://github.com/asyouplz/SpeechNote/issues/54)) ([240e125](https://github.com/asyouplz/SpeechNote/commit/240e125df5479cda9c084164494756ea87eafb38))

### 🐛 Bug Fixes

* make lint step resilient to eslint crashes ([2e3adc8](https://github.com/asyouplz/SpeechNote/commit/2e3adc8a5301bbd7b4c92e8b2b61dc8bd3746d51))
* upgrade nodejs to v20 for semantic-release ([4dc3ae9](https://github.com/asyouplz/SpeechNote/commit/4dc3ae9abdf25ed9233f50b9c92c45fcbebaeb26))
* upgrade nodejs to v22 for semantic-release v24 ([8c5ec24](https://github.com/asyouplz/SpeechNote/commit/8c5ec24f1b8c49996cb6df5f8bed5d88cee10e8f))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- 
This file will be automatically updated by semantic-release.
Change history will be generated from conventional commit messages.
-->
