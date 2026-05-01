/**
 * Validator — Checks if a converted Bedrock addon would work in Minecraft Bedrock.
 * Returns a list of issues and a pass/fail verdict for each check.
 */

export class BedrockValidator {
    constructor() {
        this.checks = [];
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Run all validation checks on the Bedrock addon ZIP folders.
     * @param {object} ctx - Conversion context with rpFolder, bpFolder
     * @returns {ValidationReport}
     */
    async validate(ctx) {
        this.checks = [];
        this.errors = [];
        this.warnings = [];

        await this.checkManifests(ctx);
        await this.checkTextures(ctx);
        await this.checkBlocks(ctx);
        await this.checkRecipes(ctx);
        await this.checkSounds(ctx);
        await this.checkScripts(ctx);
        await this.checkLang(ctx);

        const passed = this.errors.length === 0;

        return {
            passed,
            totalChecks: this.checks.length,
            errors: this.errors,
            warnings: this.warnings,
            checks: this.checks,
            summary: this.generateSummary()
        };
    }

    addCheck(name, passed, detail) {
        this.checks.push({ name, passed, detail });
        if (!passed && detail?.severity === 'error') {
            this.errors.push({ check: name, ...detail });
        } else if (!passed) {
            this.warnings.push({ check: name, ...detail });
        }
    }

    async checkManifests(ctx) {
        for (const [label, folder] of [['RP', ctx.rpFolder], ['BP', ctx.bpFolder]]) {
            const manifest = folder?.file('manifest.json');
            if (!manifest) {
                this.addCheck(`${label} manifest.json exists`, false, {
                    severity: 'error',
                    message: `${label} is missing manifest.json — the addon will not load.`
                });
                continue;
            }
            try {
                const content = await manifest.async('string');
                const parsed = JSON.parse(content);

                this.addCheck(`${label} manifest.json valid JSON`, true);

                if (!parsed.header?.uuid) {
                    this.addCheck(`${label} manifest has UUID`, false, {
                        severity: 'error', message: 'Missing header.uuid'
                    });
                } else {
                    this.addCheck(`${label} manifest has UUID`, true);
                }

                if (parsed.format_version !== 2) {
                    this.addCheck(`${label} format_version`, false, {
                        severity: 'warning', message: `format_version is ${parsed.format_version}, expected 2`
                    });
                } else {
                    this.addCheck(`${label} format_version`, true);
                }
            } catch (e) {
                this.addCheck(`${label} manifest.json valid JSON`, false, {
                    severity: 'error', message: `Parse error: ${e.message}`
                });
            }
        }
    }

    async checkTextures(ctx) {
        let textureCount = 0;
        let invalidTextures = 0;

        ctx.rpFolder?.forEach((relativePath, file) => {
            if (file.dir) return;
            if (relativePath.startsWith('textures/') && relativePath.match(/\.(png|jpg|jpeg|tga)$/i)) {
                textureCount++;
            }
            // Check for non-PNG textures in blocks/items (Bedrock prefers PNG)
            if (relativePath.startsWith('textures/') && relativePath.match(/\.(jpg|jpeg|bmp|gif)$/i)) {
                invalidTextures++;
            }
        });

        this.addCheck('Textures present', textureCount > 0, {
            severity: 'warning',
            message: textureCount === 0 ? 'No textures found in RP' : `${textureCount} textures found`
        });

        if (invalidTextures > 0) {
            this.addCheck('Texture format', false, {
                severity: 'warning',
                message: `${invalidTextures} textures are not PNG — Bedrock works best with PNG`
            });
        }
    }

    async checkBlocks(ctx) {
        let blockCount = 0;
        let invalidBlocks = 0;

        const blockFiles = [];
        ctx.bpFolder?.forEach((relativePath, file) => {
            if (!file.dir && relativePath.startsWith('blocks/') && relativePath.endsWith('.json')) {
                blockFiles.push({ path: relativePath, file });
            }
        });

        for (const { path, file } of blockFiles) {
            blockCount++;
            try {
                const content = await file.async('string');
                const parsed = JSON.parse(content);
                const block = parsed['minecraft:block'];

                if (!block?.description?.identifier) {
                    this.addCheck(`Block ${path} has identifier`, false, {
                        severity: 'error', message: 'Missing block identifier'
                    });
                    invalidBlocks++;
                }

                if (!block?.components?.['minecraft:material_instances']) {
                    this.addCheck(`Block ${path} has textures`, false, {
                        severity: 'warning', message: 'Missing material_instances (no textures assigned)'
                    });
                }
            } catch {
                invalidBlocks++;
            }
        }

        if (blockCount > 0) {
            this.addCheck('Block definitions', invalidBlocks === 0, {
                severity: invalidBlocks > 0 ? 'error' : 'info',
                message: `${blockCount} blocks, ${invalidBlocks} invalid`
            });
        }
    }

    async checkRecipes(ctx) {
        let recipeCount = 0;

        ctx.bpFolder?.forEach((relativePath, file) => {
            if (!file.dir && relativePath.startsWith('recipes/') && relativePath.endsWith('.json')) {
                recipeCount++;
            }
        });

        this.addCheck('Recipes present', recipeCount > 0, {
            severity: 'warning',
            message: recipeCount === 0 ? 'No recipes found' : `${recipeCount} recipes`
        });
    }

    async checkSounds(ctx) {
        const soundDefs = ctx.rpFolder?.file('sounds/sound_definitions.json');
        if (soundDefs) {
            try {
                const content = await soundDefs.async('string');
                JSON.parse(content);
                this.addCheck('Sound definitions valid', true);
            } catch {
                this.addCheck('Sound definitions valid', false, {
                    severity: 'warning', message: 'sound_definitions.json has invalid JSON'
                });
            }
        }
    }

    async checkScripts(ctx) {
        const mainJs = ctx.bpFolder?.file('scripts/main.js');
        if (mainJs) {
            try {
                const content = await mainJs.async('string');
                if (!content.includes('@minecraft/server')) {
                    this.addCheck('Script imports', false, {
                        severity: 'warning',
                        message: 'main.js does not import from @minecraft/server'
                    });
                } else {
                    this.addCheck('Script imports', true);
                }
            } catch { /* skip */ }
        }
    }

    async checkLang(ctx) {
        const langJson = ctx.rpFolder?.file('texts/languages.json');
        if (langJson) {
            try {
                const content = await langJson.async('string');
                const languages = JSON.parse(content);
                this.addCheck('Languages defined', Array.isArray(languages) && languages.length > 0, {
                    severity: 'info',
                    message: `${languages.length} languages`
                });
            } catch { /* skip */ }
        }
    }

    generateSummary() {
        const total = this.checks.length;
        const passed = this.checks.filter(c => c.passed).length;
        return `Validation: ${passed}/${total} checks passed. ${this.errors.length} errors, ${this.warnings.length} warnings.`;
    }
}

/**
 * Format validation report as a string for the LLM to read and act upon.
 */
export function formatValidationReport(report) {
    let text = `=== BEDROCK VALIDATION REPORT ===\n`;
    text += `Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    text += `${report.summary}\n\n`;

    if (report.errors.length > 0) {
        text += `ERRORS (must fix):\n`;
        for (const err of report.errors) {
            text += `  ❌ [${err.check}] ${err.message}\n`;
        }
        text += '\n';
    }

    if (report.warnings.length > 0) {
        text += `WARNINGS:\n`;
        for (const warn of report.warnings) {
            text += `  ⚠️ [${warn.check}] ${warn.message}\n`;
        }
    }

    return text;
}
