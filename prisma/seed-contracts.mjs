import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const LEGAL_NOTE = 'Este template deve ser revisto por um advogado antes da utiliza��o definitiva.';
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL ou DIRECT_URL em falta para seed de contratos.');
}

const pool = new Pool({ connectionString, ssl: false });

const sections = [
  {
    id: 'contract_template_section_object',
    category: 'OBJECT',
    title: 'Objeto',
    content: 'O presente contrato define os termos da presta��o de servi�os tecnol�gicos pela Norm8 ao Cliente, de acordo com o �mbito, cronograma, investimento e condi��es comerciais registados no documento.',
    order: 1,
    isRequired: true,
    variables: ['{{client.companyName}}', '{{provider.legalName}}', '{{contract.number}}'],
  },
  {
    id: 'contract_template_section_scope',
    category: 'SCOPE',
    title: '�mbito dos servi�os',
    content: 'O �mbito inclui apenas os servi�os, entreg�veis e fases expressamente descritos no contrato e nos seus anexos. Qualquer altera��o relevante dever� ser registada por escrito.',
    order: 2,
    isRequired: true,
    variables: ['{{project.name}}'],
  },
  {
    id: 'contract_template_section_payments',
    category: 'PAYMENTS',
    title: 'Investimento e fatura��o',
    content: 'Os valores, prazos e condi��es de fatura��o ser�o os indicados no snapshot financeiro do contrato. A adjudica��o pode depender da confirma��o do pagamento inicial, quando aplic�vel.',
    order: 3,
    isRequired: true,
    variables: ['{{financial.total}}', '{{financial.currency}}'],
  },
  {
    id: 'contract_template_section_data_protection',
    category: 'DATA_PROTECTION',
    title: 'Prote��o de dados',
    content: 'As partes comprometem-se a tratar dados pessoais apenas quando necess�rio para a execu��o dos servi�os e em conformidade com a legisla��o aplic�vel de prote��o de dados.',
    order: 4,
    isRequired: true,
    variables: [],
  },
  {
    id: 'contract_template_section_signatures',
    category: 'SIGNATURES',
    title: 'Assinaturas',
    content: 'O contrato produzir� efeitos ap�s aceita��o pelas partes, assinatura do documento e cumprimento das condi��es comerciais iniciais aplic�veis.',
    order: 5,
    isRequired: true,
    variables: ['{{contract.date}}'],
  },
];

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO "CompanyLegalSettings" (
        id, key, "legalName", "tradeName", "taxId", address, email, phone, website,
        representative, "representativeRole", iban, "bankName", "swiftBic", "internalNote", "createdAt", "updatedAt"
      ) VALUES (
        'company_legal_default', 'default', 'Norm8, Lda. (por preencher)', 'Norm8', 'PT000000000',
        'Morada legal por preencher', 'hello@norm8.pt', '+351 000 000 000', 'https://norm8.pt',
        'Representante por preencher', 'Cargo por preencher', 'PT50 0000 0000 0000 0000 0000 0',
        'Banco por preencher', NULL, $1, NOW(), NOW()
      )
      ON CONFLICT (key) DO UPDATE SET
        "internalNote" = EXCLUDED."internalNote",
        "updatedAt" = NOW()`,
      [LEGAL_NOTE],
    );

    await client.query(
      `INSERT INTO "ContractTemplate" (id, name, description, version, "isActive", "internalNote", "createdAt", "updatedAt")
       VALUES ('contract_template_base_norm8', 'Contrato Base Norm8', 'Template institucional base para contratos de presta��o de servi�os Norm8.', 1, TRUE, $1, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        "internalNote" = EXCLUDED."internalNote",
        "isActive" = TRUE,
        "updatedAt" = NOW()`,
      [LEGAL_NOTE],
    );

    for (const section of sections) {
      await client.query(
        `INSERT INTO "ContractTemplateSection" (
          id, "templateId", category, title, content, "order", "isRequired", version, "isActive", variables, "createdAt", "updatedAt"
        ) VALUES ($1, 'contract_template_base_norm8', $2::"ContractSectionCategory", $3, $4, $5, $6, 1, TRUE, $7::jsonb, NOW(), NOW())
        ON CONFLICT ("templateId", "order") DO UPDATE SET
          category = EXCLUDED.category,
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          "isRequired" = EXCLUDED."isRequired",
          variables = EXCLUDED.variables,
          "isActive" = TRUE,
          "updatedAt" = NOW()`,
        [section.id, section.category, section.title, section.content, section.order, section.isRequired, JSON.stringify(section.variables)],
      );
    }

    await client.query('COMMIT');
    console.log('Contracts foundation seed applied.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});