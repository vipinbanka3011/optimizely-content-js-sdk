# Installation

This page explains how to install the Optimizely SDK and CLI into your project.

- The SDK is a library with tools to model your content, fetch it and render it
- The CLI is a terminal app to upload your models to the CMS via the CMS REST API

## Using the CLI

You can run the CLI directly without installing it using `npx`:

```sh
npx @optimizely/cms-cli@latest
```

This will always use the latest version and doesn't require installation. You should see a command list.

### Alternative: Install the CLI

#### Install globally

```sh
npm install @optimizely/cms-cli -g
```

You can test that it worked by running:

```sh
optimizely-cms-cli
```

#### Install in a project

```sh
npm install @optimizely/cms-cli -D
```

Then use it from the project:

```sh
optimizely-cms-cli
```

## Step 1. Initialize a npm project

We recommend to initialize a Next.js project. Run:

```sh
npx create-next-app@latest
```

And select the following prompts:

- Would you like to use TypeScript: Yes
- Would you like your code inside a `src/` directory? Yes
- Would you like to use App Router? (recommended) Yes

## Step 2. Install the SDK

```sh
npm install @optimizely/cms-sdk
```

## Alternative: Use Example Templates

Instead of starting from scratch, explore production-ready templates with best practices:

**Stride Template**

- Live demo: <https://nextjs-sample-js-sdk.vercel.app/>
- Source: `templates/stride/` in SDK repository
- Includes: Experiences (Composition), Live Preview, Display Templates

**Alloy Template**

- Source: `templates/alloy/` in SDK repository
- Includes: Content Types, Contracts, Experiences (Composition), Display Templates, DAM assets, Live Preview

Both templates demonstrate SDK patterns and serve as reference implementations.

## Next steps

Now, you are ready to [set up the CLI](./2-setup.md)
