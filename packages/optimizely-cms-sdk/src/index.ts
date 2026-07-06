// Content type and display template
export {
  buildConfig,
  contentType,
  contract,
  displayTemplate,
  isContentType,
  isContract,
  isDisplayTemplate,
  isContentTypeRegistered,
  initContentTypeRegistry,
  initDisplayTemplateRegistry,
  PropertyGroupType,
} from './model/index.js';

// GraphQL
export {
  GraphClient,
  GraphGetContentOptions,
  GraphGetLinksOptions,
  GraphVariationInput,
  getClient,
  config,
} from './graph/index.js';

// GraphQL types
export type {
  PreviewParams,
  GraphReference,
  GraphGetItemOptions,
  GraphQueryOptions,
  GraphSlot,
} from './graph/index.js';

// Provided content types and experiences
export {
  BlankSectionContentType,
  BlankExperienceContentType,
} from './model/internalContentTypes.js';

// Namespaces for errors, types, and utilities
export * as GraphErrors from './graph/error.js';
export * as ContentTypes from './model/contentTypes.js';
export * as BuildConfig from './model/buildConfig.js';
export * as DisplayTemplates from './model/displayTemplates.js';
export * as Properties from './model/properties.js';

// App settings — propagate CMS application-level settings to all components
export { AppSettingsProvider, useAppSettings } from './react/client.js';
export type { AppSettingsProviderProps } from './react/client.js';

// Type inference and asset utilities
export { ContentProps } from './infer.js';

// Dam assets
export { damAssets } from './render/assets.js';

// Re-export types needed for declaration file generation in consuming libraries
export type {
  AnyContentType,
  BaseTypes,
  ComponentContentType,
  ContentType,
  Contract,
  ExperienceContentType,
  FolderContentType,
  MediaContentType,
  MediaStringTypes,
  PageContentType,
  PermittedTypes,
  PropertiesRecord,
  SectionContentType,
  SuppliedContractValues,
} from './model/contentTypes.js';

export type {
  DisplayTemplate,
  DisplayTemplateVariant,
} from './model/displayTemplates.js';
