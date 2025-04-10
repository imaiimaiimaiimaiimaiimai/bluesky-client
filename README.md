![Bluesky Client](./public/img/ogp.png "Bluesky Client")

# Bluesky Client

A modern, design-first web client for the AT Protocol (Bluesky social network) that prioritizes user experience and clean design.

## Overview

This project is a feature-rich web client for the Bluesky social network that provides a beautiful, intuitive interface for interacting with the AT Protocol. It includes support for all core Bluesky features along with additional enhancements to improve the user experience.

## Features

- **Beautiful UI**: Modern, responsive design that works well on both desktop and mobile
- **Feed Management**: Support for viewing home timeline, custom feeds, and more
- **Rich Media**: Enhanced support for images, videos, and other media formats
- **Post Composition**: Advanced post editor with support for embeds and media
- **Profile Management**: Comprehensive profile viewing and editing capabilities
- **Search**: Powerful search functionality for posts, users, and feeds
- **Custom Features**: Bookmarks, feed preferences, and other unique enhancements

## Repository

* GitHub: [https://github.com/imaiimaiimaiimaiimaiimai/bluesky-client](https://github.com/imaiimaiimaiimaiimaiimai/bluesky-client)

## Development

### Requirements

* Node.js: v18.17.1 (based on Cloudflare requirements)
* Framework: Vite + Vue 3 (see `package.json` for specific versions)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/imaiimaiimaiimaiimaiimai/bluesky-client.git
   cd bluesky-client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```
   This will launch the development server at http://localhost:5173/

### Available Scripts

* `npm run dev` - Start development server
* `npm run build` - Build production-ready assets
* `npm run type-check` - Run TypeScript type checking
* `npm run lint` - Run ESLint to check code quality
* `npm run preview` - Preview production build locally

## Custom AT Protocol Extensions

This client implements several custom extensions to the AT Protocol:

### Custom Records (Collections)

* `space.aoisora.bookmark` - Bookmark functionality
* `space.aoisora.preference.feed.extra` - Stores index of trending pages and global feeds

### Custom Fields

* `app.bsky.feed.post.record["space.aoisora.post.via"]` - Client user agent identifier
* `app.bsky.feed.post.record["space.aoisora.post.lightning"]` - Used for "Zap!" link functionality
* ~~`app.bsky.actor.profile.record.pinnedPost`~~ - Previously used for pinned posts (deprecated)

## External Services Integration

* **Translation Services**: Uses MyMemory for automatic translation
* **Lightning Network**: Supports Zap! links and buttons using the `lightning:` protocol

## Design Resources

* **Logo Font**: [Albert Sans](https://fonts.google.com/specimen/Albert+Sans)
* **Icons**: [Material Design Icons](https://pictogrammers.com/library/mdi/)

## Community and Resources

* [AT Protocol Community Showcase](https://docs.bsky.app/showcase?operator=AND&tags=favorite&tags=client&tags=opensource)
* [AT Protocol Ecosystem](https://github.com/bluesky-social/atproto-ecosystem)

## License

This project is licensed under the [BSD 3-Clause License](LICENSE).

## Contributors

Developed by [imai](https://bsky.app/profile/imai-1984.bsky.social)
# bluesky-client
# bluesky-client
