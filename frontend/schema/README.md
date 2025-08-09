# ChatX Components Schema

This directory contains the local schema files for ChatX components configuration.

## Files

- `components.schema.json` - JSON schema for `components.json` configuration
  - Based on shadcn/ui schema with ChatX customizations
  - Provides IDE autocomplete and validation
  - Eliminates dependency on external schema URLs

## Benefits of Local Schema

1. **Offline Support**: Works without internet connection
2. **Version Control**: Schema changes are tracked in git
3. **Customization**: Can be modified for ChatX-specific needs
4. **Performance**: Faster validation and autocomplete
5. **Independence**: No reliance on external services

## Usage

The schema is automatically used by `components.json` through the `$schema` property:

```json
{
  "$schema": "./schema/components.schema.json",
  // ... rest of configuration
}
```

## Compatibility

This local schema maintains full compatibility with shadcn/ui tooling while providing ChatX-specific enhancements.