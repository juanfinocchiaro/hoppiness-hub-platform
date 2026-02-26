import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

async function generateDbDocs() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: tables, error } = await supabase
    .rpc('get_public_tables');

  if (error) {
    console.error('Error obteniendo tablas:', error);
    generateFallbackDocs();
    return;
  }

  const now = new Date().toISOString().split('T')[0];

  let markdown = `# Base de Datos

*Generado automáticamente con \`npm run docs:db\`. No editar manualmente.*

*Última actualización: ${now}*

## Tablas

| Tabla | Descripción |
|-------|-------------|
`;

  const tableNames = (tables as { table_name: string }[])?.map((t) => t.table_name).sort() || [];

  for (const tableName of tableNames) {
    markdown += `| ${tableName} | - |\n`;
  }

  markdown += `\n---\n\n*Total: ${tableNames.length} tablas*\n\nVer schema completo en \`supabase/migrations/00000000000000_initial_schema.sql\`\n`;

  fs.writeFileSync('docs/DATABASE.md', markdown);
  console.log('docs/DATABASE.md generado');
}

function generateFallbackDocs() {
  const now = new Date().toISOString().split('T')[0];
  const markdown = `# Base de Datos

*Última actualización: ${now}*

Ver schema completo en \`supabase/migrations/00000000000000_initial_schema.sql\`
`;
  fs.writeFileSync('docs/DATABASE.md', markdown);
  console.log('docs/DATABASE.md generado (fallback)');
}

generateDbDocs().catch(console.error);
