require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { parseStringPromise, Builder } = require('xml2js');
const { Translate } = require('@google-cloud/translate').v2;

if (!process.env.GOOGLE_API_KEY) {
  console.error(`Google API key not found! Please create a .env file in the root of your project with the following content:
    
GOOGLE_API_KEY=your-google-api-key

You can refer to the .env.example file for guidance.`);
  process.exit(1);
}

const translate = new Translate({ key: process.env.GOOGLE_API_KEY });

const languageCodes = {
  Chinese: 'zh-CN',
  French: 'fr',
  Japanese: 'ja',
  Russian: 'ru',
  Chineset: 'zh-TW',
  German: 'de',
  Korean: 'ko',
  Spanish: 'es',
  Czech: 'cs',
  Italian: 'it',
  Polish: 'pl',
  Portuguese: 'pt',
  Turkish: 'tr',
  Ukrainian: 'uk',
  English: 'en'
};

async function batchTranslate(texts, targetLang) {
  try {
    const [translations] = await translate.translate(texts, targetLang);
    return Array.isArray(translations) ? translations : [translations];
  } catch (error) {
    throw new Error(`Batch translation failed for language: ${targetLang}. Error: ${error.message}`);
  }
}

async function processXML(inputFilePath) {
  try {
    console.log('Reading XML file...');
    const xmlData = await fs.readFile(inputFilePath, 'utf8');
    const parsedData = await parseStringPromise(xmlData);

    const rows = parsedData.Table.Row;
    console.log(`XML file successfully read. Total rows: ${rows.length}`);

    const englishTexts = rows.map(row => row.Cell[1] && row.Cell[1].trim() !== '' ? row.Cell[1] : null);
    const textsToTranslate = englishTexts.filter(text => text !== null);

    for (const language in languageCodes) {
      console.log(`Starting batch translation for ${language}...`);

      if (textsToTranslate.length === 0) {
        console.log(`No valid English texts to translate for ${language}. Skipping...`);
        continue;
      }

      try {
        // For English, use the source texts directly; for others, translate
        const translatedTexts = language === 'English' ? textsToTranslate : await batchTranslate(textsToTranslate, languageCodes[language]);

        let translationIndex = 0;
        const translatedData = { Table: { Row: [] } };

        for (let i = 0; i < rows.length; i++) {
          if (englishTexts[i] !== null) {
            translatedData.Table.Row.push({
              Cell: [
                rows[i].Cell[0],
                translatedTexts[translationIndex]
              ]
            });
            console.log(`Processed row ${i + 1} for ${language}: "${translatedTexts[translationIndex]}"`);
            translationIndex++;
          } else {
            translatedData.Table.Row.push({
              Cell: [
                rows[i].Cell[0],
                rows[i].Cell[1]
              ]
            });
          }
        }

        console.log(`Batch processing for ${language} completed successfully.`);

        const builder = new Builder();
        const xmlString = builder.buildObject(translatedData);

        const outputDir = path.join(__dirname, '..', 'temp_build_localization', language);
        await fs.mkdir(outputDir, { recursive: true });

        const outputFilePath = path.join(outputDir, 'text_ui_soul__scaledxphardship.xml');
        await fs.writeFile(outputFilePath, xmlString, 'utf8');
        console.log(`File saved to ${outputFilePath}`);

      } catch (error) {
        console.error(`Error during processing for ${language}:`, error.message);
        process.exit(1);
      }
    }

    console.log('All translations completed successfully.');
  } catch (error) {
    console.error('Error during XML processing:', error.message);
    process.exit(1);
  }
}

const inputFilePath = path.join(__dirname, '..', 'src', 'Localization', 'text_ui_soul__scaledxphardship.xml');
processXML(inputFilePath);