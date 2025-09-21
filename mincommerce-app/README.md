# MinCommerce Frontend

A high-performance, industry-standard React application for flash sale management built with TypeScript, Vite, and Tailwind CSS.

## 🚀 Features

- **Modern Stack**: React 19, TypeScript, Vite, Tailwind CSS
- **State Management**: Zustand + TanStack Query
- **Testing**: Vitest + Playwright E2E
- **Quality Gates**: ESLint, Prettier, Husky, lint-staged
- **Monitoring**: Sentry error tracking, performance monitoring
- **PWA**: Progressive Web App with offline support
- **Docker**: Multi-stage builds for development and production
- **Bundle Analysis**: Optimized chunk splitting and analysis tools

## 🛠️ Development

### Prerequisites
- Node.js 20+
- npm or yarn

### Quick Start
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build

# Analyze bundle
npm run analyze
```

### Docker Development
```bash
# Development with hot reload
npm run docker:dev

# Production build
npm run docker:prod
```

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run analyze` - Analyze bundle size
- `npm run docker:dev` - Run in Docker (development)
- `npm run docker:prod` - Run in Docker (production)

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
