// =============================================================================
// IgnoreMissingModulesPlugin
//
// During Docker builds for demo/staging, turns webpack "Module not found"
// errors into warnings so the build can complete. Pages with missing deps
// will show runtime errors but won't block the entire build.
//
// Only used in Docker builds via IGNORE_MISSING_MODULES=1 env var.
// =============================================================================

class IgnoreMissingModulesPlugin {
  apply(compiler) {
    compiler.hooks.afterCompile.tap('IgnoreMissingModulesPlugin', (compilation) => {
      // Move module-not-found errors to warnings
      const realErrors = [];
      for (const error of compilation.errors) {
        if (
          error.name === 'ModuleNotFoundError' ||
          (error.message && error.message.includes('Module not found'))
        ) {
          compilation.warnings.push(error);
        } else {
          realErrors.push(error);
        }
      }
      compilation.errors = realErrors;
    });
  }
}

module.exports = IgnoreMissingModulesPlugin;
