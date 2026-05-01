/**
 * Plugin: Lang Converter
 * Converts Java .json lang files to Bedrock .lang format.
 */
export default function register(ps) {
    ps.register('convert_lang',
        'Convert Java language files (JSON format in assets/<ns>/lang/) to Bedrock .lang format (key=value pairs in texts/).',
        {
            type: 'object',
            properties: {
                namespace: { type: 'string', description: 'Mod namespace' }
            },
            required: ['namespace']
        },
        async (args, ctx) => {
            const { namespace } = args;
            const { javaZip, rpFolder } = ctx;
            let converted = 0;
            const languages = new Set();

            const langPrefix = `assets/${namespace}/lang/`;

            for (const [filePath, zipEntry] of Object.entries(javaZip.files)) {
                if (zipEntry.dir || !filePath.startsWith(langPrefix)) continue;
                if (!filePath.endsWith('.json')) continue;

                const langCode = filePath.split('/').pop().replace('.json', '');
                const bedrockLang = javaLangToBedrock(langCode);

                try {
                    const content = await zipEntry.async('string');
                    const langData = JSON.parse(content);
                    let langFileContent = `## Language: ${bedrockLang}\n## Converted from ${namespace}\n\n`;

                    for (const [key, value] of Object.entries(langData)) {
                        if (typeof value === 'string') {
                            langFileContent += `${key}=${value}\n`;
                        }
                    }

                    rpFolder.file(`texts/${bedrockLang}.lang`, langFileContent);
                    languages.add(bedrockLang);
                    converted++;
                } catch { /* skip invalid lang files */ }
            }

            if (languages.size > 0) {
                rpFolder.file('texts/languages.json', JSON.stringify(Array.from(languages), null, 2));
            }

            return {
                success: true,
                converted,
                languages: Array.from(languages),
                message: `Converted ${converted} language files: ${Array.from(languages).join(', ')}`
            };
        }
    );
}

function javaLangToBedrock(code) {
    const map = {
        'en_us': 'en_US', 'de_de': 'de_DE', 'fr_fr': 'fr_FR', 'es_es': 'es_ES',
        'it_it': 'it_IT', 'pt_br': 'pt_BR', 'ru_ru': 'ru_RU', 'zh_cn': 'zh_CN',
        'zh_tw': 'zh_TW', 'ja_jp': 'ja_JP', 'ko_kr': 'ko_KR', 'nl_nl': 'nl_NL',
        'pl_pl': 'pl_PL', 'sv_se': 'sv_SE', 'da_dk': 'da_DK', 'no_no': 'nb_NO',
        'fi_fi': 'fi_FI', 'hu_hu': 'hu_HU', 'cs_cz': 'cs_CZ', 'tr_tr': 'tr_TR',
    };
    return map[code.toLowerCase()] || code;
}
